        // Storage repository seam. The four synced keys (workout history,
        // exercise config, schedule, setup-completed) are written through
        // `repo`; device-local keys (tutorial/backup-reminder flags, week
        // cache, one-shot migration sentinels) bypass it on purpose.
        // Promise/.then style only — @babel/standalone lowers async/await to
        // regenerator form, which crashes without a polyfill.
        function createLocalStorageRepo() {
            const parse = (raw) => {
                if (!raw) return null;
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    console.warn('[repo] Ignoring unparseable stored value:', e);
                    return null;
                }
            };

            return {
                mode: 'local',

                loadAll: () => Promise.resolve({
                    workoutHistory: parse(storage.getItem('gymWorkoutHistory')),
                    exerciseConfig: parse(storage.getItem('gymExerciseConfig')),
                    scheduleConfig: parse(storage.getItem('gymScheduleConfig')),
                    setupCompleted: parse(storage.getItem('gymSetupCompleted')),
                }),

                // Fire-and-forget saves: callers never await these.
                saveHistory: (history) => {
                    storage.setItem('gymWorkoutHistory', JSON.stringify(history));
                },
                saveExerciseConfig: (config) => {
                    storage.setItem('gymExerciseConfig', JSON.stringify(config));
                },
                saveScheduleConfig: (schedule) => {
                    storage.setItem('gymScheduleConfig', JSON.stringify(schedule));
                },
                saveSetupCompleted: (setup) => {
                    storage.setItem('gymSetupCompleted', JSON.stringify(setup));
                },

                clearAll: () => {
                    storage.removeItem('gymWorkoutHistory');
                    storage.removeItem('gymExerciseConfig');
                    storage.removeItem('gymScheduleConfig');
                    storage.removeItem('gymSetupCompleted');
                    return Promise.resolve();
                },

                status: () => ({ mode: 'local', signedIn: false, pendingWrites: 0 }),
            };
        }

        // Firestore-backed repo. One document per workout entry at
        // users/{uid}/workouts/{entryId}; the three config docs live under
        // users/{uid}/settings/. Writes are fire-and-forget (Firestore's
        // offline queue owns durability) and mirror to localStorage so a
        // signed-out or offline-cold-cache session still has the data.
        function createFirestoreRepo(user) {
            const db = firebase.firestore();
            const userDoc = db.collection('publicUsers').doc(user.uid);
            const workoutsCol = userDoc.collection('workouts');
            const settingsCol = userDoc.collection('settings');

            const lastSaved = new Map(); // entryId -> serialized entry
            let pendingWrites = 0;

            const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

            const track = (promise, what) => {
                pendingWrites++;
                promise
                    .then(() => { pendingWrites--; })
                    .catch((e) => {
                        pendingWrites--;
                        console.warn('[repo] ' + what + ' write failed:', e);
                    });
            };

            // Entries need an identity that survives `date` rewrites; assigned
            // in place so React's objects keep their ids across saves.
            const ensureEntryIds = (history) => {
                history.forEach((w) => {
                    if (!w.entryId) {
                        const day = String(w.date || new Date().toISOString()).slice(0, 10);
                        w.entryId = 'w-' + day + '-' + Math.random().toString(36).slice(2, 7);
                    }
                });
            };

            const mirror = createLocalStorageRepo();

            const saveSettingsDoc = (docId, value) => {
                track(settingsCol.doc(docId).set(sanitize(value)), docId);
            };

            return {
                mode: 'firestore',

                loadAll: () => Promise.all([
                    workoutsCol.orderBy('date', 'desc').get(),
                    settingsCol.get(),
                ]).then(([workoutsSnap, settingsSnap]) => {
                    const history = workoutsSnap.docs.map((d) => d.data());
                    history.forEach((w) => lastSaved.set(w.entryId, JSON.stringify(w)));
                    const settings = {};
                    settingsSnap.docs.forEach((d) => { settings[d.id] = d.data(); });

                    if (history.length > 0) mirror.saveHistory(history);
                    if (settings.exerciseConfig) mirror.saveExerciseConfig(settings.exerciseConfig);
                    if (settings.scheduleConfig) mirror.saveScheduleConfig(settings.scheduleConfig);
                    if (settings.setupCompleted) mirror.saveSetupCompleted(settings.setupCompleted);

                    // Empty cloud data (e.g. offline cold cache before first
                    // sync): fall back to whatever this device has.
                    return mirror.loadAll().then((local) => ({
                        workoutHistory: history.length > 0 ? history : local.workoutHistory,
                        exerciseConfig: settings.exerciseConfig || local.exerciseConfig,
                        scheduleConfig: settings.scheduleConfig || local.scheduleConfig,
                        setupCompleted: settings.setupCompleted || local.setupCompleted,
                    }));
                }).catch((e) => {
                    console.warn('[repo] Firestore load failed, using local mirror:', e);
                    return mirror.loadAll();
                }),

                saveHistory: (history) => {
                    ensureEntryIds(history);
                    const seen = new Set();
                    history.forEach((w) => {
                        seen.add(w.entryId);
                        const serialized = JSON.stringify(w);
                        if (lastSaved.get(w.entryId) !== serialized) {
                            lastSaved.set(w.entryId, serialized);
                            track(workoutsCol.doc(w.entryId).set(sanitize(w)), 'workout');
                        }
                    });
                    Array.from(lastSaved.keys()).forEach((entryId) => {
                        if (!seen.has(entryId)) {
                            lastSaved.delete(entryId);
                            track(workoutsCol.doc(entryId).delete(), 'workout delete');
                        }
                    });
                    mirror.saveHistory(history);
                },

                saveExerciseConfig: (config) => {
                    saveSettingsDoc('exerciseConfig', config);
                    mirror.saveExerciseConfig(config);
                },
                saveScheduleConfig: (schedule) => {
                    saveSettingsDoc('scheduleConfig', schedule);
                    mirror.saveScheduleConfig(schedule);
                },
                saveSetupCompleted: (setup) => {
                    saveSettingsDoc('setupCompleted', setup);
                    mirror.saveSetupCompleted(setup);
                },

                clearAll: () => {
                    const batch = db.batch();
                    lastSaved.forEach((_, entryId) => batch.delete(workoutsCol.doc(entryId)));
                    ['exerciseConfig', 'scheduleConfig', 'setupCompleted', 'meta']
                        .forEach((docId) => batch.delete(settingsCol.doc(docId)));
                    lastSaved.clear();
                    return batch.commit()
                        .catch((e) => console.warn('[repo] cloud clear failed:', e))
                        .then(() => mirror.clearAll());
                },

                status: () => ({
                    mode: 'firestore',
                    signedIn: true,
                    email: user.email,
                    pendingWrites,
                }),
            };
        }

        // One-time import of this device's local data into Firestore, run
        // during repo selection on the FIRST sign-in for this account
        // (settings/meta is the "already done" marker). Cloud entries win for
        // any calendar day they cover; local entries fill the gaps. A JSON
        // backup auto-downloads before anything is uploaded. Failures are
        // non-fatal and retry next load (meta is only written on success).
        function migrateLocalToFirestore(user) {
            const db = firebase.firestore();
            const userDoc = db.collection('publicUsers').doc(user.uid);
            const workoutsCol = userDoc.collection('workouts');
            const settingsCol = userDoc.collection('settings');
            const local = createLocalStorageRepo();
            const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

            const downloadPreSyncBackup = (localData) => {
                try {
                    const dataStr = JSON.stringify({
                        workoutHistory: localData.workoutHistory || [],
                        schedule: localData.scheduleConfig,
                        exerciseConfig: localData.exerciseConfig,
                        exportDate: new Date().toISOString(),
                    }, null, 2);
                    const url = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'gym-tracker-PRE-SYNC-BACKUP-' +
                        new Date().toISOString().replace(/[:.]/g, '-') + '.json';
                    link.click();
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.warn('[repo] pre-sync backup download failed:', e);
                }
            };

            return settingsCol.doc('meta').get().then((meta) => {
                if (meta.exists && meta.data().importedFromLocalAt) {
                    return; // import already happened (this or another device)
                }
                return Promise.all([local.loadAll(), workoutsCol.get(), settingsCol.get()])
                    .then(([localData, cloudSnap, settingsSnap]) => {
                        const cloudSettings = {};
                        settingsSnap.docs.forEach((d) => { cloudSettings[d.id] = d.data(); });

                        const localHistory = localData.workoutHistory || [];
                        const dayOf = (w) => String(w.date || '').slice(0, 10);
                        const cloudDays = new Set(cloudSnap.docs.map((d) => dayOf(d.data())));

                        const toUpload = [];
                        const pickedByDay = new Map();
                        localHistory.forEach((w) => {
                            if (cloudDays.has(dayOf(w))) return;
                            const existing = pickedByDay.get(dayOf(w));
                            if (!existing || (w.submitted && !existing.submitted)) {
                                pickedByDay.set(dayOf(w), w);
                            }
                        });
                        pickedByDay.forEach((w) => {
                            if (!w.entryId) {
                                w.entryId = 'w-' + dayOf(w) + '-' + Math.random().toString(36).slice(2, 7);
                            }
                            toUpload.push(w);
                        });

                        if (toUpload.length > 0) {
                            downloadPreSyncBackup(localData);
                        }

                        let chain = Promise.resolve();
                        for (let i = 0; i < toUpload.length; i += 400) {
                            const chunk = toUpload.slice(i, i + 400);
                            chain = chain.then(() => {
                                const batch = db.batch();
                                chunk.forEach((w) => batch.set(workoutsCol.doc(w.entryId), sanitize(w)));
                                return batch.commit();
                            });
                        }

                        return chain.then(() => {
                            const writes = [];
                            if (!cloudSettings.exerciseConfig && localData.exerciseConfig) {
                                writes.push(settingsCol.doc('exerciseConfig').set(sanitize(localData.exerciseConfig)));
                            }
                            if (!cloudSettings.scheduleConfig && localData.scheduleConfig) {
                                writes.push(settingsCol.doc('scheduleConfig').set(sanitize(localData.scheduleConfig)));
                            }
                            if (!cloudSettings.setupCompleted && localData.setupCompleted) {
                                writes.push(settingsCol.doc('setupCompleted').set(sanitize(localData.setupCompleted)));
                            }
                            writes.push(settingsCol.doc('meta').set({
                                importedFromLocalAt: new Date().toISOString(),
                                importedCount: toUpload.length,
                                schemaVersion: 1,
                            }));
                            return Promise.all(writes);
                        }).then(() => {
                            console.log('[repo] imported ' + toUpload.length + ' local workouts to Firestore');
                        });
                    });
            });
        }

        // Sign-in/out for the Settings UI and sync banner. Popup, not
        // redirect (signInWithRedirect breaks on browsers that partition
        // third-party storage when authDomain differs from github.io).
        function repoSignIn() {
            return firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
                .then(() => window.location.reload())
                .catch((e) => {
                    if (e && e.code === 'auth/popup-closed-by-user') return;
                    console.warn('[repo] sign-in failed:', e && e.code);
                    alert('Sign-in failed: ' + ((e && e.message) || 'unknown error'));
                });
        }
        function repoSignOut() {
            return firebase.auth().signOut().then(() => window.location.reload());
        }
        window.repoSignIn = repoSignIn;
        window.repoSignOut = repoSignOut;

        // Repo selection, decided once per page load:
        // - gym-local namespace / SDK load failure -> localStorage.
        // - otherwise the first auth-state callback decides: signed in ->
        //   import-if-needed then Firestore, signed out -> localStorage.
        const repoReady = window.FIREBASE_INIT.then((firebaseReady) => {
            if (!firebaseReady) {
                return createLocalStorageRepo();
            }
            return new Promise((resolve) => {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    if (!user) {
                        resolve(createLocalStorageRepo());
                        return;
                    }
                    resolve(
                        migrateLocalToFirestore(user)
                            .catch((e) => console.warn('[repo] local import failed (will retry next load):', e))
                            .then(() => createFirestoreRepo(user))
                    );
                });
            });
        }).then((repo) => {
            window.repo = repo;
            return repo;
        });
        window.repoReady = repoReady;

