        const { useState, useEffect, useRef, useMemo } = React;
        // ============================================================================
        // APP COMPONENT
        // ============================================================================

        // Last time the app came to the foreground, used as the fallback start
        // for the FIRST movement of a session when its Weight Breakdown was
        // never opened. Deliberately module level rather than state: it must
        // survive re-renders and is never rendered itself.
        //
        // visibilitychange rather than load, because a phone in a gym resumes
        // this app from the background rather than reloading it, so the last
        // real load can be a day stale. getSessionTiming still caps how old
        // this may be before it stops counting as evidence.
        let lastForegroundAt = new Date().toISOString();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                lastForegroundAt = new Date().toISOString();
            }
        });

        function App() {
            const [currentView, setCurrentView] = useState('workout');
            const [currentDay, setCurrentDay] = useState(1);
            const [workoutData, setWorkoutData] = useState({});
            const [loggedExercises, setLoggedExercises] = useState({});
            const [workoutHistory, setWorkoutHistory] = useState([]);
            const [showSuccess, setShowSuccess] = useState(false);
            const [successMessage, setSuccessMessage] = useState('');
            const [exercisesByDay, setExercisesByDay] = useState({});
            const [schedule, setSchedule] = useState(null);
            const [exerciseCategories, setExerciseCategories] = useState([]);
            const [prTracking, setPrTracking] = useState(false);
            const [advancedPrTracking, setAdvancedPrTracking] = useState(false);
            const [minimalistPrTracking, setMinimalistPrTracking] = useState(false);
            // { min, max } turns the standard card's free-type Reps field into a
            // dropdown of that inclusive range. null = free-type (everyone else).
            const [repsDropdown, setRepsDropdown] = useState(null);
            const [expandedWeightBreakdown, setExpandedWeightBreakdown] = useState(null);

            // When each exercise's Weight Breakdown panel was opened today,
            // keyed by id — the start half of every movement's clock.
            //
            // Mirrored to a device-local storage key rather than through the
            // repo: this is scaffolding for the session in progress, not
            // history. Once an exercise is logged its start is baked into the
            // workout record and this map stops mattering for it, so all the
            // mirror buys is surviving a mid-session reload with un-logged
            // movements still anchored. Stamped with the date and dropped on a
            // new day, so yesterday's anchors can never leak into today.
            const saveStartTimes = (times) => {
                storage.setItem('exerciseStartTimes', JSON.stringify({
                    date: new Date().toDateString(),
                    times
                }));
                return times;
            };

            // Wipe every anchor. Called when a day is closed out, so the next
            // session cannot inherit a stamp from the one before it — the same
            // reason loggedExercises and workoutData are cleared there.
            const clearStartTimes = () => {
                setExerciseStartTimes({});
                storage.removeItem('exerciseStartTimes');
            };

            const [exerciseStartTimes, setExerciseStartTimes] = useState(() => {
                try {
                    const saved = JSON.parse(storage.getItem('exerciseStartTimes') || 'null');
                    return saved && saved.date === new Date().toDateString() ? saved.times : {};
                } catch (e) {
                    return {};
                }
            });

            // The history entry whose stopwatch was tapped. Distinct from
            // showDayBreakdown, which only ever finds TODAY's workout.
            const [timingWorkout, setTimingWorkout] = useState(null);

            // Opening a Weight Breakdown is what starts a movement's clock, so
            // it is one-way: there is no Hide arm, and re-pressing the button on
            // the card already open does nothing. A toggle would make "which tap
            // started the set?" ambiguous, and neither answer is right.
            //
            // Note this REPLACES the anchor map rather than merging into it. At
            // most one movement is anchored at a time, because an open panel
            // means work under way at that machine and that stops being true the
            // moment you walk to another one. Without it, peeking at Chest
            // Press, going to do Shoulder Press, then coming back to log Chest
            // Press reports the Shoulder Press work as part of the Chest Press
            // set. Dropping the anchor means that log has none, so it falls back
            // to the estimate and is marked as one — the honest answer.
            const openWeightBreakdown = (exerciseId) => {
                if (expandedWeightBreakdown === exerciseId) return;
                setExpandedWeightBreakdown(exerciseId);
                setExerciseStartTimes(() => saveStartTimes({
                    [exerciseId]: new Date().toISOString()
                }));
            };
            const [selectedExercise, setSelectedExercise] = useState('');
            const [celebration, setCelebration] = useState(null);
            const [showSettings, setShowSettings] = useState(false);
            const [showBackupReminder, setShowBackupReminder] = useState(false);
            const [showDayBreakdown, setShowDayBreakdown] = useState(false);
            const [showEditWorkout, setShowEditWorkout] = useState(false);
            const [editingWorkout, setEditingWorkout] = useState(null);
            const [viewingWeek, setViewingWeek] = useState(1);
            const [showWizard, setShowWizard] = useState(false);
            const [fieldErrors, setFieldErrors] = useState({});
            const [hydrated, setHydrated] = useState(false);
            const [showSyncPrompt, setShowSyncPrompt] = useState(false);
            // A field having focus IS the keyboard being up, on every platform,
            // with no thresholds to be wrong about. focusin/focusout bubble, so
            // one pair of listeners covers every card the deck ever mounts.
            useEffect(() => {
                // Deliberately NOT select. A dropdown raises a picker, not a
                // text keyboard, and it closes on the first tap — so reshaping
                // the card for it means hiding the day pills and the footer for
                // a fraction of a second, which reads as the page lurching.
                const isField = (el) => !!el && el.matches && el.matches('input, textarea');
                const open = (e) => {
                    if (isField(e.target)) document.documentElement.classList.add('kb-open');
                };
                const close = (e) => {
                    if (!isField(e.target)) return;
                    // A blur that immediately re-focuses another field (weight
                    // to reps) must not flicker the layout, so settle first and
                    // ask what actually has focus.
                    setTimeout(() => {
                        if (!isField(document.activeElement)) {
                            document.documentElement.classList.remove('kb-open');
                        }
                    }, 0);
                };
                document.addEventListener('focusin', open);
                document.addEventListener('focusout', close);
                return () => {
                    document.removeEventListener('focusin', open);
                    document.removeEventListener('focusout', close);
                };
            }, []);

            // Keep --vvh on <html> equal to the VISUAL viewport height, which is
            // what the app shell is sized to.
            //
            // The layout and visual viewports are the same until something
            // covers part of the screen. Then they diverge: iOS shrinks the
            // visual viewport for the keyboard and, if the page is taller than
            // what is left, scrolls the focused input into view — which is what
            // drags the card up and takes the exercise name off the top. Sizing
            // to the visual viewport means everything already fits, so there is
            // nothing for the browser to scroll.
            //
            // The `scroll` listener is the load-bearing one for the keyboard:
            // iOS pans the visual viewport rather than scrolling the document,
            // so that event is the only notification that anything moved.
            useEffect(() => {
                const vv = window.visualViewport;
                const apply = () => {
                    const style = document.documentElement.style;
                    style.setProperty('--vvh', (vv ? vv.height : window.innerHeight) + 'px');
                    // How far iOS has panned the visible area down the page.
                    style.setProperty('--vvo', (vv ? vv.offsetTop : 0) + 'px');
                };
                apply();
                if (vv) {
                    vv.addEventListener('resize', apply);
                    vv.addEventListener('scroll', apply);
                }
                window.addEventListener('resize', apply);
                window.addEventListener('orientationchange', apply);
                return () => {
                    if (vv) {
                        vv.removeEventListener('resize', apply);
                        vv.removeEventListener('scroll', apply);
                    }
                    window.removeEventListener('resize', apply);
                    window.removeEventListener('orientationchange', apply);
                };
            }, []);

            // Lifted out of WorkoutView so the deck can label its day pills.
            // A program is N numbered days; the display name is whatever the
            // client's own roster calls that day, which is the first exercise's
            // category (the wizard writes the day name there).
            const totalWorkoutDays = schedule
                ? schedule.totalWorkoutDays : Object.keys(exercisesByDay).length;
            const getDayName = (dayNum) => {
                const dayExercises = exercisesByDay[dayNum];
                if (dayExercises && dayExercises.length > 0) return dayExercises[0].category;
                return `Day ${dayNum}`;
            };

            const currentWeek = useMemo(() => getCurrentWeek(workoutHistory), [workoutHistory]);
            const hasMigratedWeeks = useRef(false);

            useEffect(() => {
                window.repoReady.then((repo) => {
                // Legacy localStorage-era migrations. Only meaningful in local
                // mode: cloud data is imported post-migration, and a fresh
                // device must not re-run one-shots just because its own
                // localStorage lacks the sentinel flags. They reshape the
                // stored keys, so they run before loadAll reads them.
                if (repo.mode === 'local') {
                // Migrate existing data to namespaced storage (one-time for existing users)
                migrateToNamespacedStorage();

                // One-shot Anterior/Posterior migration for Jessi's PPL data
                migrateJessiToAnteriorPosterior();

                // One-shot Torso/Limbs migration for Jessi's Anterior/Posterior data
                migrateJessiToFullBody();

                // One-shot auto-enable of the 5-8 reps dropdown for Jessi
                enableRepsDropdownForJessi();

                // Check if setup is completed
                const setupCompleted = storage.getItem('gymSetupCompleted');

                if (!setupCompleted) {
                    // Check if user has existing data
                    const hasHistory = storage.getItem('gymWorkoutHistory');
                    const hasConfig = storage.getItem('gymExerciseConfig');

                    if (hasHistory || hasConfig) {
                        // Existing user - auto-migrate
                        migrateExerciseConfig();
                        migrateWorkoutHistory();
                        createDefaultSchedule();

                        // Mark setup as completed
                        storage.setItem('gymSetupCompleted', JSON.stringify({
                            version: 1,
                            completed: true,
                            completedAt: new Date().toISOString(),
                            migrated: true
                        }));
                    } else {
                        // New user - show wizard
                        setShowWizard(true);
                        setHydrated(true);
                        return; // Don't load data yet
                    }
                }
                }

                return repo.loadAll().then(({ workoutHistory: savedHistory, exerciseConfig: savedConfig, scheduleConfig: savedSchedule, setupCompleted: savedSetup }) => {
                // Cloud mode, nothing set up yet (brand-new client on a fresh
                // device): run the wizard; its saves sync through the repo.
                if (repo.mode !== 'local' && !savedSetup) {
                    setShowWizard(true);
                    setHydrated(true);
                    return;
                }

                // Load workout history
                if (savedHistory) {
                    setWorkoutHistory(savedHistory);
                }

                // Load workout schedule
                if (savedSchedule) {
                    setSchedule(savedSchedule);
                }

                // Load custom exercise configurations
                if (savedConfig) {
                    // Aug 2026: split Full Body into Upper/Lower, and apply any
                    // later code-side reorder on top. Runs in BOTH modes: on a
                    // signed-in device this is the only path that can change
                    // the program, since the legacy sentinel migrations above
                    // are gated on repo.mode === 'local'. Needs the loaded
                    // history so returning movements reclaim their original ids.
                    const split = migrateJessiSplit(savedConfig, savedHistory, savedSchedule);
                    if (split) {
                        savedConfig = split.config;
                        repo.saveExerciseConfig(split.config);
                        if (split.schedule) {
                            repo.saveScheduleConfig(split.schedule);
                            setSchedule(split.schedule);
                        }
                        console.log('[Jessi Upper/Lower] applied; recovered ids:', split.recoveredIds);
                    }

                    const config = savedConfig;

                    // Check for version 2 format (from wizard)
                    if (config.version === 2 && config.days) {
                        // Sort exercises in each day by order
                        const sortedDays = {};
                        Object.keys(config.days).forEach(dayNum => {
                            sortedDays[dayNum] = config.days[dayNum].sort((a, b) => a.order - b.order);
                        });
                        setExercisesByDay(sortedDays);

                        // Set first exercise as selected for progress view
                        const allExercises = Object.values(sortedDays).flat();
                        if (allExercises.length > 0 && !selectedExercise) {
                            setSelectedExercise(allExercises[0].id);
                        }

                        if (config.categories) {
                            setExerciseCategories(config.categories);
                        }

                        // Load prTracking flags
                        if (config.prTracking !== undefined) {
                            setPrTracking(config.prTracking);
                        }
                        if (config.advancedPrTracking !== undefined) {
                            setAdvancedPrTracking(config.advancedPrTracking);
                        }
                        if (config.minimalistPrTracking !== undefined) {
                            setMinimalistPrTracking(config.minimalistPrTracking);
                        }
                        if (config.repsDropdown !== undefined) {
                            setRepsDropdown(config.repsDropdown);
                        }
                    }
                    // Fallback to old format for backward compatibility
                    else if (config.day1 || config.day2) {
                        const days = {};
                        if (config.day1) {
                            days[1] = config.day1.sort((a, b) => a.order - b.order);
                        }
                        if (config.day2) {
                            days[2] = config.day2.sort((a, b) => a.order - b.order);
                        }
                        setExercisesByDay(days);

                        // Set first exercise as selected for progress view
                        const allExercises = Object.values(days).flat();
                        if (allExercises.length > 0 && !selectedExercise) {
                            setSelectedExercise(allExercises[0].id);
                        }
                    }
                }

                // Check last backup reminder (monthly only, not on first time)
                const lastReminder = storage.getItem('lastBackupReminder');
                const now = new Date().getTime();
                const oneMonth = 30 * 24 * 60 * 60 * 1000;

                if (lastReminder && (now - parseInt(lastReminder)) > oneMonth) {
                    setShowBackupReminder(true);
                }

                // Cloud sync available, signed out, and setup already complete
                // (reaching here means the wizard was passed — i.e. a coached
                // or established user, not a passing visitor): offer sign-in
                // once, dismissible, never blocking the workout flow.
                if (window.FIREBASE_READY && repo.mode === 'local' &&
                    !storage.getItem('syncPromptDismissed')) {
                    setShowSyncPrompt(true);
                }

                setHydrated(true);
                });
                });
            }, []);

            // Update viewing week and migrate workout history when it loads
            useEffect(() => {
                if (workoutHistory.length > 0 && !hasMigratedWeeks.current) {
                    // Clear the cached first workout Monday to recalculate based on actual data
                    storage.removeItem('firstWorkoutMonday');

                    // Recalculate and migrate week numbers for all workouts
                    const migratedHistory = workoutHistory.map(workout => ({
                        ...workout,
                        week: getWeekNumber(workout.date, workoutHistory)
                    }));

                    // Only update if week numbers actually changed
                    const hasChanges = migratedHistory.some((workout, idx) =>
                        workout.week !== workoutHistory[idx].week
                    );

                    if (hasChanges) {
                        setWorkoutHistory(migratedHistory);
                        window.repo.saveHistory(migratedHistory);
                    }

                    // Set viewing week to current week
                    setViewingWeek(currentWeek);

                    // Mark migration as complete
                    hasMigratedWeeks.current = true;
                }
            }, [workoutHistory.length, currentWeek]); // Run when history loads or length changes

            // Pick the day to open on when the schedule loads.
            //
            // For an EXPLICIT weekday schedule, prefer whatever today maps to,
            // so a program like Upper on Tue/Thu/Sat actually opens on Upper
            // on a Tuesday. The old behavior always took workoutDays[0], which
            // meant a two-day split opened on whichever day happened to be
            // listed first regardless of the date.
            //
            // Non-explicit schedules keep the first-entry behavior unchanged,
            // as do explicit ones on a non-training day.
            useEffect(() => {
                if (schedule && schedule.workoutDays && schedule.workoutDays.length > 0) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                                      'Thursday', 'Friday', 'Saturday'];
                    const todayName = dayNames[new Date().getDay()];
                    const todayEntry = schedule.scheduleIsExplicit
                        ? schedule.workoutDays.find(wd => wd.dayOfWeek === todayName)
                        : null;
                    setCurrentDay(todayEntry
                        ? todayEntry.workoutDayNumber
                        : schedule.workoutDays[0].workoutDayNumber);
                }
            }, [schedule]);

            // Restore logged state and workout data from today's workout
            useEffect(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayWorkout = workoutHistory.find(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    return isSameDay && isSameWorkoutDay;
                });

                if (todayWorkout && !todayWorkout.submitted) {
                    // Only restore state if workout hasn't been submitted yet
                    const newLoggedExercises = {};
                    const newWorkoutData = {};

                    todayWorkout.exercises.forEach(exercise => {
                        let hasData = false;

                        if (exercise.type === 'assault-bike') {
                            hasData = exercise.rounds && exercise.rounds.trim() !== '';
                        } else if (exercise.type === 'stairmaster') {
                            hasData = exercise.time && exercise.time.trim() !== '';
                        } else if (exercise.isCardio || exercise.type === 'cardio') {
                            hasData = (exercise.intensity && exercise.intensity.trim() !== '') ||
                                      (exercise.minutes && exercise.minutes > 0) ||
                                      (exercise.seconds && exercise.seconds > 0);
                        } else if (exercise.type === 'bodyweight') {
                            hasData = exercise.reps && exercise.reps.toString().trim() !== '';
                        } else {
                            hasData = (exercise.weight && exercise.weight.toString().trim() !== '') ||
                                      (exercise.reps && exercise.reps.toString().trim() !== '');
                        }

                        if (hasData) {
                            newLoggedExercises[exercise.id] = true;

                            if (exercise.type === 'assault-bike') {
                                newWorkoutData[exercise.id] = { rounds: exercise.rounds };
                            } else if (exercise.type === 'stairmaster') {
                                newWorkoutData[exercise.id] = { time: exercise.time, level: exercise.level || 'Level 7' };
                            } else if (exercise.isCardio || exercise.type === 'cardio') {
                                newWorkoutData[exercise.id] = {
                                    intensity: exercise.intensity,
                                    minutes: exercise.minutes,
                                    seconds: exercise.seconds
                                };
                            } else if (exercise.type === 'bodyweight') {
                                newWorkoutData[exercise.id] = { reps: exercise.reps };
                            } else {
                                newWorkoutData[exercise.id] = {
                                    weight: exercise.weight,
                                    reps: exercise.reps
                                };
                            }
                        }
                    });

                    setLoggedExercises(newLoggedExercises);
                    setWorkoutData(newWorkoutData);
                } else {
                    // Clear logged state if switching to a day with no workout or if workout is submitted
                    setLoggedExercises({});
                    setWorkoutData({});
                }
            }, [workoutHistory, currentDay]);

            const getCurrentExercises = () => {
                return exercisesByDay[currentDay] || [];
            };

            const getTodayWorkout = () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return workoutHistory.find(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    return isSameDay && isSameWorkoutDay;
                });
            };

            const isWorkoutSubmitted = () => {
                const todayWorkout = getTodayWorkout();
                return todayWorkout && todayWorkout.submitted;
            };

            // Build a full exercise-config payload, carrying forward any tracking flags
            // stored alongside the config so they survive writes from rename/reorder/etc.
            const buildExerciseConfig = (days) => {
                const existingRaw = storage.getItem('gymExerciseConfig');
                const existing = existingRaw ? (() => { try { return JSON.parse(existingRaw); } catch (e) { return {}; } })() : {};
                return {
                    ...existing,
                    version: 2,
                    days,
                    categories: exerciseCategories,
                    prTracking,
                    advancedPrTracking,
                    minimalistPrTracking,
                    repsDropdown
                };
            };

            const saveExerciseConfig = () => {
                window.repo.saveExerciseConfig(buildExerciseConfig(exercisesByDay));
            };

            const updateExerciseName = (day, exerciseId, newName, additionalProps = {}) => {
                setExercisesByDay(prev => {
                    const updated = {
                        ...prev,
                        [day]: prev[day].map(ex =>
                            ex.id === exerciseId ? { ...ex, name: newName, ...additionalProps } : ex
                        )
                    };
                    window.repo.saveExerciseConfig(buildExerciseConfig(updated));
                    return updated;
                });
            };

            const moveExercise = (day, exerciseId, direction) => {
                const exercises = exercisesByDay[day] || [];
                const currentIndex = exercises.findIndex(ex => ex.id === exerciseId);

                if (direction === 'up' && currentIndex === 0) return;
                if (direction === 'down' && currentIndex === exercises.length - 1) return;

                const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                const reordered = [...exercises];
                [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

                // Update order values
                const updated = reordered.map((ex, idx) => ({ ...ex, order: idx }));

                setExercisesByDay(prev => {
                    const updatedDays = {
                        ...prev,
                        [day]: updated
                    };
                    window.repo.saveExerciseConfig(buildExerciseConfig(updatedDays));
                    return updatedDays;
                });
            };

            const getPreviousWorkout = (exerciseId) => {
                if (workoutHistory.length === 0) return null;

                // Collect all sessions that included this exercise (regardless of NA status)
                const lastThreeSessions = [];
                for (let workout of workoutHistory) {
                    const exercise = workout.exercises.find(e => e.id === exerciseId);
                    if (exercise) {
                        lastThreeSessions.push(exercise);
                    }
                }

                // From those, find the most recent one with actual data (non-NA)
                for (let exercise of lastThreeSessions) {
                    let hasData = false;
                    if (exercise.type === 'assault-bike') {
                        hasData = exercise.rounds && exercise.rounds.trim() !== '';
                    } else if (exercise.type === 'stairmaster') {
                        hasData = exercise.time && exercise.time.trim() !== '';
                    } else if (exercise.isCardio || exercise.type === 'cardio') {
                        // For cardio, check that total time is > 0 (not just "0:00")
                        const totalSeconds = ((exercise.minutes || 0) * 60) + (exercise.seconds || 0);
                        hasData = totalSeconds > 0;
                    } else if (exercise.type === 'bodyweight') {
                        hasData = exercise.reps && exercise.reps.toString().trim() !== '';
                    } else {
                        hasData = (exercise.weight && exercise.weight.toString().trim() !== '') ||
                                  (exercise.reps && exercise.reps.toString().trim() !== '');
                    }

                    if (hasData) {
                        return exercise;
                    }
                }

                return null;
            };

            const handleInputChange = (exerciseId, field, value) => {
                setWorkoutData(prev => ({
                    ...prev,
                    [exerciseId]: {
                        ...prev[exerciseId],
                        [field]: value
                    }
                }));

                // Clear validation error for this field when user types
                const errorKey = `${exerciseId}-${field}`;
                if (fieldErrors[errorKey]) {
                    setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[errorKey];
                        return newErrors;
                    });
                }
            };

            const logExercise = (exerciseId) => {
                const exercise = getCurrentExercises().find(e => e.id === exerciseId);
                let data = workoutData[exerciseId] || {};

                // Capture the reps dropdown's pre-selected value when the user
                // never touched it. The <select> always displays something, but
                // workoutData only gets a value on change — without this, a
                // one-tap LOG fails reps validation against a visibly filled
                // field. Runs before the weight capture below, which is gated on
                // data.reps. No-op for the free-type input (no such <select>).
                if (!data.reps) {
                    const card = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
                    const repsSelect = card && card.querySelector('select[data-field="reps"]');
                    if (repsSelect && repsSelect.value) {
                        data = { ...data, reps: repsSelect.value };
                    }
                }

                // Capture auto-filled weight if user didn't manually enter it
                if ((exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio')) && !data.weight && data.reps) {
                    // Find the weight input field for this exercise and read its displayed value
                    const exerciseCard = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
                    if (exerciseCard) {
                        // Find the weight input (it's the first number input with inputmode="decimal")
                        const weightInput = exerciseCard.querySelector('input[type="number"][inputmode="decimal"]');
                        if (weightInput && weightInput.value) {
                            data = { ...data, weight: weightInput.value };
                        }
                    }
                }

                // Validate data based on exercise type and set field errors
                const errors = {};

                // For standard exercises, validate weight and reps
                if (exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio')) {
                    if (!data.weight || data.weight.toString().trim() === '') {
                        errors[`${exerciseId}-weight`] = true;
                    }
                    if (!data.reps || data.reps.toString().trim() === '') {
                        errors[`${exerciseId}-reps`] = true;
                    }

                    // If there are validation errors, set them and return
                    if (Object.keys(errors).length > 0) {
                        setFieldErrors(errors);
                        return;
                    }
                }

                if (exercise.type === 'assault-bike' && !data.rounds) return;
                if (exercise.type === 'stairmaster' && !data.time) return;
                if (exercise.type === 'bodyweight' && !data.reps) return;
                if (exercise.isCardio || exercise.typeId === 'cardio') {
                    // Check if minutes is filled (required)
                    if (!data.minutes || data.minutes === 0) {
                        errors[`${exerciseId}-minutes`] = true;
                        setFieldErrors(errors);
                        return;
                    }

                    // For intensity, check if there's a default available (from previous workout or exercise config)
                    const previous = getPreviousWorkout(exerciseId);
                    const hasIntensity = (data.intensity && data.intensity.trim()) ||
                                        (previous && previous.intensity && previous.intensity.trim()) ||
                                        (exercise.intensity && exercise.intensity.trim());
                    if (!hasIntensity) return;
                }

                let finalData = { ...data };

                const timestamp = new Date().toISOString();
                finalData.timestamp = timestamp;

                // The two ends of this movement's clock. `startedAt` comes from
                // the Weight Breakdown tap and is absent when the panel was
                // never opened — getSessionTiming decides what stands in.
                //
                // `timestamp` itself has always been computed here. It was
                // assigned to finalData above and then dropped on the floor,
                // because none of the exerciseToSave branches below copied it
                // out, so every session's per-exercise timing was calculated
                // and discarded.
                const stamps = { loggedAt: timestamp };
                if (exerciseStartTimes[exerciseId]) {
                    stamps.startedAt = exerciseStartTimes[exerciseId];
                }

                // Update workoutData with final data
                setWorkoutData(prev => ({
                    ...prev,
                    [exerciseId]: finalData
                }));

                // Find if there's already a workout for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayWeek = getWeekNumber(today, workoutHistory);

                let existingWorkoutIndex = workoutHistory.findIndex(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    const isNotSubmitted = !w.submitted;
                    return isSameDay && isSameWorkoutDay && isNotSubmitted;
                });

                // Create exercise object to save
                let exerciseToSave;
                if (exercise.type === 'assault-bike') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        intensity: '30/30',
                        rounds: finalData.rounds || ''
                    };
                } else if (exercise.type === 'stairmaster') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        level: finalData.level || 'Level 7',
                        time: finalData.time || ''
                    };
                } else if (exercise.isCardio || exercise.typeId === 'cardio') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: 'cardio',
                        isCardio: true,
                        intensity: finalData.intensity !== undefined ? finalData.intensity : (exercise.intensity || ''),
                        minutes: finalData.minutes !== undefined ? finalData.minutes : (exercise.minutes || 0),
                        seconds: finalData.seconds !== undefined ? finalData.seconds : (exercise.seconds || 0)
                    };
                } else if (exercise.type === 'bodyweight') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        weight: 'Body Weight',
                        reps: finalData.reps || '',
                        minReps: exercise.minReps,
                        maxReps: exercise.maxReps
                    };
                } else {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        weight: finalData.weight || '',
                        reps: finalData.reps || '',
                        minReps: exercise.minReps,
                        maxReps: exercise.maxReps
                    };
                }

                // Stamped once, after the branch, rather than spread into each
                // of the five above. Three of those branches (assault-bike,
                // stairmaster, bodyweight) have no producer in this app and are
                // easy to forget; doing it here means a branch cannot be added
                // later that silently drops its timing.
                //
                // Only LOGGED movements get stamps. The un-logged stubs built
                // further down must stay bare — their absence of a loggedAt is
                // exactly what getSessionTiming reads to leave them out.
                exerciseToSave = { ...exerciseToSave, ...stamps };

                let updatedHistory;
                if (existingWorkoutIndex !== -1) {
                    // Update existing workout
                    updatedHistory = [...workoutHistory];
                    const workout = updatedHistory[existingWorkoutIndex];
                    const exerciseIndex = workout.exercises.findIndex(e => e.id === exerciseId);

                    if (exerciseIndex !== -1) {
                        workout.exercises[exerciseIndex] = exerciseToSave;
                    } else {
                        workout.exercises.push(exerciseToSave);
                    }

                    workout.date = timestamp; // Update to latest timestamp
                } else {
                    // Create new workout with all exercises initialized to NA
                    const allExercises = getCurrentExercises().map(ex => {
                        if (ex.id === exerciseId) {
                            return exerciseToSave;
                        } else {
                            // Initialize as NA
                            if (ex.type === 'assault-bike') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    intensity: '30/30',
                                    rounds: ''
                                };
                            } else if (ex.type === 'stairmaster') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    level: 'Level 7',
                                    time: ''
                                };
                            } else if (ex.isCardio || ex.typeId === 'cardio') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: 'cardio',
                                    isCardio: true,
                                    intensity: '',
                                    minutes: 0,
                                    seconds: 0
                                };
                            } else if (ex.type === 'bodyweight') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    weight: 'Body Weight',
                                    reps: ''
                                };
                            } else {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    weight: '',
                                    reps: ''
                                };
                            }
                        }
                    });

                    const newWorkout = {
                        date: timestamp,
                        day: currentDay,
                        week: todayWeek,
                        exercises: allExercises,
                        submitted: false
                    };

                    updatedHistory = [newWorkout, ...workoutHistory];
                }

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);

                setLoggedExercises(prev => ({
                    ...prev,
                    [exerciseId]: true
                }));

                // The open panel belongs to the movement just logged, so
                // logging is what closes it — the button is one-way now.
                setExpandedWeightBreakdown(prev => (prev === exerciseId ? null : prev));

                // The anchor has done its job: it is written into the workout
                // record above. Dropping it means a SECOND log of the same
                // movement — possible once a day has been submitted, which
                // re-enables the buttons — measures itself afresh instead of
                // reaching back to a panel tap from the previous session.
                setExerciseStartTimes(prev => {
                    if (!prev[exerciseId]) return prev;
                    const updated = { ...prev };
                    delete updated[exerciseId];
                    return saveStartTimes(updated);
                });

                setSuccessMessage('Exercise logged!');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            };

            const completeDay = () => {
                // Find today's workout
                const todayWorkout = getTodayWorkout();

                if (!todayWorkout) {
                    alert('Please log at least one exercise first!');
                    return;
                }

                // Detect plateau busters for advancedPrTracking
                let plateauBusters = [];
                if (advancedPrTracking) {
                    // Helper: find previous valid submitted workout data for an exercise
                    const findPreviousValidExercise = (exerciseId) => {
                        const previousWorkouts = workoutHistory
                            .filter(w => {
                                if (w.date === todayWorkout.date) return false;
                                if (!w.submitted) return false;
                                return true;
                            })
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 5);
                        for (const workout of previousWorkouts) {
                            const ex = workout.exercises.find(e => e.id === exerciseId);
                            if (ex && ex.reps && ex.reps !== 'NA' &&
                                (ex.type === 'bodyweight' || (ex.weight && ex.weight !== 'NA'))) {
                                return ex;
                            }
                        }
                        return null;
                    };

                    todayWorkout.exercises.forEach(exercise => {
                        if ((exercise.type === 'standard' || exercise.type === 'bodyweight' ||
                            (!exercise.type && !exercise.isCardio)) &&
                            exercise.reps && exercise.reps !== 'NA') {
                            const reps = parseInt(exercise.reps);
                            if (isNaN(reps)) return;

                            const exMinReps = exercise.minReps || 6;
                            const exMaxReps = exercise.maxReps || 8;

                            // Rule 1: below minReps — always plateau buster
                            if (reps < exMinReps) {
                                plateauBusters.push(exercise.id);
                                return;
                            }

                            // Rule 2: in the rep range (minReps to maxReps-1) — plateau buster only if stagnating
                            if (reps >= exMinReps && reps < exMaxReps) {
                                // Don't chain plateau busters — skip if previous session already had one
                                const prevWorkoutWithPlateau = workoutHistory
                                    .filter(w => {
                                        if (w.date === todayWorkout.date) return false;
                                        if (!w.submitted) return false;
                                        const ex = w.exercises.find(e => e.id === exercise.id);
                                        return ex && ex.reps && ex.reps !== 'NA';
                                    })
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                                if (prevWorkoutWithPlateau?.plateauBusters?.includes(exercise.id)) return;

                                const previousExercise = findPreviousValidExercise(exercise.id);
                                if (previousExercise) {
                                    const previousReps = parseInt(previousExercise.reps) || 0;
                                    if (exercise.type === 'bodyweight') {
                                        if (reps <= previousReps) plateauBusters.push(exercise.id);
                                    } else {
                                        const currentWeight = parseFloat(exercise.weight) || 0;
                                        const previousWeight = parseFloat(previousExercise.weight) || 0;
                                        if (currentWeight <= previousWeight && reps <= previousReps) {
                                            plateauBusters.push(exercise.id);
                                        }
                                    }
                                }
                            }
                            // Rule 3: reps >= maxReps — PR, no plateau buster
                        }
                    });
                }

                // Mark workout as submitted (immutable) and save plateau busters
                const updatedHistory = workoutHistory.map(w => {
                    if (w === todayWorkout) {
                        return { ...w, submitted: true, plateauBusters };
                    }
                    return w;
                });

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);

                // Reset all log states so exercises act like a fresh day
                setLoggedExercises({});
                setWorkoutData({});
                // Anchors too, for the same reason: the next session must not
                // inherit a panel tap from this one.
                clearStartTimes();

                setShowDayBreakdown(true);
            };

            const updateWorkout = (workoutDate, updatedExercises) => {
                const updatedHistory = workoutHistory.map(w => {
                    if (w.date === workoutDate) {
                        return { ...w, exercises: updatedExercises };
                    }
                    return w;
                });

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);
                setSuccessMessage('Workout updated!');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            };

            const exportData = () => {
                const exportObj = {
                    workoutHistory,
                    exerciseConfig: buildExerciseConfig(exercisesByDay),
                    schedule: schedule,
                    exportDate: new Date().toISOString()
                };
                const dataStr = JSON.stringify(exportObj, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `gym-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
            };

            const importData = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);

                        // Handle old format (just workout history array) or new format (object with configs)
                        if (Array.isArray(imported)) {
                            // Old format
                            setWorkoutHistory(imported);
                            window.repo.saveHistory(imported);
                        } else {
                            // New format
                            if (imported.workoutHistory) {
                                setWorkoutHistory(imported.workoutHistory);
                                window.repo.saveHistory(imported.workoutHistory);
                            }
                            if (imported.schedule) {
                                setSchedule(imported.schedule);
                                window.repo.saveScheduleConfig(imported.schedule);
                            }
                            if (imported.exerciseConfig) {
                                // Check for version 2 format
                                if (imported.exerciseConfig.version === 2 && imported.exerciseConfig.days) {
                                    const sortedDays = {};
                                    Object.keys(imported.exerciseConfig.days).forEach(dayNum => {
                                        sortedDays[dayNum] = imported.exerciseConfig.days[dayNum].sort((a, b) => a.order - b.order);
                                    });
                                    setExercisesByDay(sortedDays);
                                    if (imported.exerciseConfig.categories) {
                                        setExerciseCategories(imported.exerciseConfig.categories);
                                    }
                                }
                                // Fallback to old format
                                else if (imported.exerciseConfig.day1 || imported.exerciseConfig.day2) {
                                    const days = {};
                                    if (imported.exerciseConfig.day1) {
                                        days[1] = imported.exerciseConfig.day1.sort((a, b) => a.order - b.order);
                                    }
                                    if (imported.exerciseConfig.day2) {
                                        days[2] = imported.exerciseConfig.day2.sort((a, b) => a.order - b.order);
                                    }
                                    setExercisesByDay(days);
                                }
                                // Restore tracking flags into state
                                if (imported.exerciseConfig.prTracking !== undefined) {
                                    setPrTracking(imported.exerciseConfig.prTracking);
                                }
                                if (imported.exerciseConfig.advancedPrTracking !== undefined) {
                                    setAdvancedPrTracking(imported.exerciseConfig.advancedPrTracking);
                                }
                                if (imported.exerciseConfig.minimalistPrTracking !== undefined) {
                                    setMinimalistPrTracking(imported.exerciseConfig.minimalistPrTracking);
                                }
                                if (imported.exerciseConfig.repsDropdown !== undefined) {
                                    setRepsDropdown(imported.exerciseConfig.repsDropdown);
                                }
                                window.repo.saveExerciseConfig(imported.exerciseConfig);
                            }
                        }

                        setSuccessMessage('Data imported successfully!');
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 3000);
                        setShowSettings(false);
                    } catch (error) {
                        alert('Invalid backup file');
                    }
                };
                reader.readAsText(file);
            };

            const resetData = () => {
                if (confirm('ARE YOU VERY SURE? This will delete ALL your workout data AND exercise customizations permanently. This cannot be undone!')) {
                    if (confirm('FINAL WARNING: All your progress and custom exercise names/order will be lost forever. Continue?')) {
                        window.repo.clearAll();
                        storage.removeItem('lastBackupReminder');
                        // Every one-shot gate, not just the oldest one. These
                        // self-gate on a flag, so leaving any of them set means
                        // a post-reset install (e.g. re-entering a coach code)
                        // silently never gets that feature back.
                        storage.removeItem('jessiAPMigrationApplied');
                        storage.removeItem('jessiFullBodyMigrationApplied5');
                        storage.removeItem('jessiFullBodyMigrationApplied4');
                        storage.removeItem('jessiFullBodyMigrationApplied3');
                        storage.removeItem('jessiFullBodyMigrationApplied2');
                        storage.removeItem('jessiFullBodyMigrationApplied1');
                        storage.removeItem('jessiRepsDropdownEnabled');
                        setWorkoutHistory([]);
                        setWorkoutData({});
                        setLoggedExercises({});
                        setExercisesByDay({});
                        setSchedule(null);
                        setExerciseCategories([]);
                        setPrTracking(false);
                        setAdvancedPrTracking(false);
                        setMinimalistPrTracking(false);
                        setRepsDropdown(null);
                        setShowSettings(false);
                        setShowWizard(true); // Show wizard after reset
                    }
                }
            };

            const dismissBackupReminder = () => {
                storage.setItem('lastBackupReminder', new Date().getTime().toString());
                setShowBackupReminder(false);
            };

            // Storage not read yet: render nothing rather than a flash of
            // default state (avoids acting on data that is about to change).
            if (!hydrated) {
                return <div className="app" />;
            }

            return (
                <div className="app">
                    {showWizard && (
                        <SetupWizard
                            onComplete={() => {
                                // Load data directly instead of reloading page for instant transition
                                const savedSchedule = storage.getItem('gymScheduleConfig');
                                if (savedSchedule) {
                                    setSchedule(JSON.parse(savedSchedule));
                                }

                                const savedExercises = storage.getItem('gymExerciseConfig');
                                if (savedExercises) {
                                    const config = JSON.parse(savedExercises);
                                    if (config.version === 2 && config.days) {
                                        const sortedDays = {};
                                        Object.keys(config.days).forEach(dayNum => {
                                            sortedDays[dayNum] = config.days[dayNum].sort((a, b) => a.order - b.order);
                                        });
                                        setExercisesByDay(sortedDays);

                                        const allExercises = Object.values(sortedDays).flat();
                                        if (allExercises.length > 0 && !selectedExercise) {
                                            setSelectedExercise(allExercises[0].id);
                                        }

                                        if (config.categories) {
                                            setExerciseCategories(config.categories);
                                        }

                                        if (config.prTracking !== undefined) {
                                            setPrTracking(config.prTracking);
                                        }
                                        if (config.advancedPrTracking !== undefined) {
                                            setAdvancedPrTracking(config.advancedPrTracking);
                                        }
                                        if (config.minimalistPrTracking !== undefined) {
                                            setMinimalistPrTracking(config.minimalistPrTracking);
                                        }
                                        if (config.repsDropdown !== undefined) {
                                            setRepsDropdown(config.repsDropdown);
                                        }
                                    }
                                }

                                setShowWizard(false);
                            }}
                        />
                    )}

                    {showSyncPrompt && !showWizard && (
                        <div style={{
                            background: '#1a1a2a',
                            border: '1px solid var(--accent)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            margin: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '14px'
                        }}>
                            <span style={{ flex: 1 }}>☁️ Sign in to sync your workouts across devices</span>
                            <button
                                onClick={() => window.repoSignIn()}
                                style={{
                                    padding: '6px 10px', background: 'var(--accent)', border: 'none',
                                    borderRadius: '4px', color: '#b8b8d0', cursor: 'pointer'
                                }}
                            >
                                Sign in
                            </button>
                            <button
                                onClick={() => {
                                    storage.setItem('syncPromptDismissed', 'true');
                                    setShowSyncPrompt(false);
                                }}
                                style={{
                                    padding: '6px 10px', background: 'transparent',
                                    border: '1px solid #2a2a3a', borderRadius: '4px',
                                    color: '#8a8aa0', cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    {showSuccess && <div className={`success-message ${showBackupReminder ? 'backup-reminder' : ''}`}>{successMessage}</div>}

                    {showBackupReminder && (
                        <BackupReminderModal
                            onExport={() => { exportData(); dismissBackupReminder(); }}
                            onDismiss={dismissBackupReminder}
                        />
                    )}

                    {showSettings && (
                        <SettingsModal
                            onClose={() => setShowSettings(false)}
                            onExport={exportData}
                            onImport={importData}
                            onReset={resetData}
                            exercisesByDay={exercisesByDay}
                            updateExerciseName={updateExerciseName}
                            moveExercise={moveExercise}
                            schedule={schedule}
                        />
                    )}

                    {showDayBreakdown && (
                        <DayBreakdownModal
                            onClose={() => setShowDayBreakdown(false)}
                            workoutHistory={workoutHistory}
                            currentDay={currentDay}
                            getCurrentExercises={getCurrentExercises}
                            getPreviousWorkout={getPreviousWorkout}
                            foregroundAt={lastForegroundAt}
                        />
                    )}

                    {timingWorkout && (
                        <TimeDetailsModal
                            workout={timingWorkout}
                            foregroundAt={lastForegroundAt}
                            onClose={() => setTimingWorkout(null)}
                        />
                    )}

                    {showEditWorkout && editingWorkout && (
                        <EditWorkoutModal
                            workout={editingWorkout}
                            onClose={() => {
                                setShowEditWorkout(false);
                                setEditingWorkout(null);
                            }}
                            onSave={updateWorkout}
                            exercisesByDay={exercisesByDay}
                        />
                    )}

                    {!showWizard && (<>
                    <div className="header">
                        <div className="header-top">
                            <h1>Gym Tracker</h1>
                            <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
                        </div>
                        <div className="week-indicator">Week {currentWeek}</div>
                    </div>

                    <div className="content">
                        {currentView === 'workout' && <SwipeDeck
                            currentDay={currentDay}
                            setCurrentDay={setCurrentDay}
                            totalWorkoutDays={totalWorkoutDays}
                            getDayName={getDayName}
                            workoutData={workoutData}
                            loggedExercises={loggedExercises}
                            handleInputChange={handleInputChange}
                            getPreviousWorkout={getPreviousWorkout}
                            logExercise={logExercise}
                            completeDay={completeDay}
                            getCurrentExercises={getCurrentExercises}
                            fieldErrors={fieldErrors}
                            prTracking={prTracking}
                            advancedPrTracking={advancedPrTracking}
                            minimalistPrTracking={minimalistPrTracking}
                            repsDropdown={repsDropdown}
                            expandedWeightBreakdown={expandedWeightBreakdown}
                            openWeightBreakdown={openWeightBreakdown}
                            closeWeightBreakdown={(id) => setExpandedWeightBreakdown(
                                (cur) => (id === undefined || cur === id ? null : cur))}
                            workoutHistory={workoutHistory}
                            foregroundAt={lastForegroundAt}
                        />}
                        {currentView === 'weekly' && <WeeklyView
                            workoutHistory={workoutHistory}
                            viewingWeek={viewingWeek}
                            setViewingWeek={setViewingWeek}
                            currentWeek={currentWeek}
                            exercisesByDay={exercisesByDay}
                            onEditWorkout={(workout) => {
                                setEditingWorkout(workout);
                                setShowEditWorkout(true);
                            }}
                            onViewTiming={setTimingWorkout}
                            foregroundAt={lastForegroundAt}
                        />}
                        {currentView === 'progress' && <ProgressView
                            workoutHistory={workoutHistory}
                            selectedExercise={selectedExercise}
                            setSelectedExercise={setSelectedExercise}
                            exercisesByDay={exercisesByDay}
                        />}
                    </div>

                    {/* The nav lives at the bottom now: the workout screen is a
                        full-height card and the thumb is already down here. */}
                    <nav className="bottom-nav">
                        <button
                            className={`bottom-nav-btn ${currentView === 'workout' ? 'active' : ''}`}
                            onClick={() => setCurrentView('workout')}
                        >
                            <span className="bottom-nav-icon">◉</span>
                            Workout
                        </button>
                        <button
                            className={`bottom-nav-btn ${currentView === 'weekly' ? 'active' : ''}`}
                            onClick={() => { setCurrentView('weekly'); setViewingWeek(currentWeek); window.scrollTo(0, 0); }}
                        >
                            <span className="bottom-nav-icon">≡</span>
                            History
                        </button>
                    </nav>
                    </>)}
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
