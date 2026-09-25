        // ====================================================================
        // JESSI'S PROGRAM
        // ====================================================================
        // Jessi (he/him) trains the personal app's program, name for name and in
        // the same order. Since Sep 2026 that is one Full Body day, six sessions
        // a week, replacing the Aug 2026 Anterior/Posterior split.
        //
        // Everything about his program lives in JESSI_PROGRAM below. The coach
        // preset (buildJessiPreset, which clients.js hands out for his code)
        // builds a fresh install from it, and migrateJessiSplit rebuilds an
        // existing device from it, so the two cannot drift apart. Test 126 pins
        // that by migrating a fresh install and requiring it comes out unchanged.
        //
        // Each movement: `name` as the program calls it; `loadType` and
        // `increment` seed how his gym's machine is loaded and its PR step; `id`
        // is a stable literal for movements added after the program began, so
        // the preset and the migration agree on one key; `startingWeight` fills
        // the weight input until it is first logged. The movements with no `id`
        // have long-standing ids on his device (UUIDs from his first install)
        // and a fresh install gets new UUIDs for them.
        //
        // Several names do not describe their machine any more than the
        // personal app's ids do; see the roster comments in gym-tracker's
        // config.js. Calf Raises moves by 2.5 here, unlike the personal app's 5.
        const JESSI_PROGRAM = [
            {
                name: 'Full Body',
                movements: [
                    { name: 'Tricep Extensions', loadType: 'pin' },
                    { name: 'Lateral Raises', loadType: 'pin' },
                    { name: 'Recline Curls', loadType: 'pin' },
                    // Was Preacher Curls. `actual-` because "Preacher Curls" was
                    // also the June-era name of what is now Recline Curls.
                    { name: 'Shoulder Flexion Curls', id: 'actual-preacher-curls', startingWeight: '50', loadType: 'pin' },
                    { name: 'Chest Flies', loadType: 'pin' },
                    { name: 'Chest Press', id: 'chest-press', startingWeight: '100', loadType: 'pin' },
                    { name: 'Incline Chest Press', loadType: 'pin' },
                    { name: 'Overhead Tricep Extensions', loadType: 'pin' },
                    { name: 'Ab Crunches', loadType: 'pin' },
                    // Was Sagittal Plane Pulldowns.
                    { name: 'Sagittal Plane Pullovers', loadType: 'pin' },
                    { name: 'Kelso Shrugs', loadType: 'plate-one-sided' },
                    { name: 'Transverse Plane Rows', loadType: 'plate-one-sided' },
                    { name: 'Frontal Plane Pulldowns', loadType: 'plate-one-sided' },
                    { name: 'Shoulder Press', loadType: 'pin' },
                    { name: 'Back Extensions', loadType: 'pin', increment: 5 },
                    { name: 'Leg Press', loadType: 'plate-two-sided', increment: 5 },
                    { name: 'Hip Adduction', loadType: 'pin' },
                    { name: 'Calf Raises', loadType: 'pin' },
                    // `actual-` because the personal app's `leg-extensions` id
                    // renders as Hip Adduction; both apps share this literal.
                    { name: 'Leg Extensions', id: 'actual-leg-extensions', startingWeight: '50', loadType: 'pin' },
                ],
            },
        ];

        // Bump to deliver any change to JESSI_PROGRAM to devices that already
        // have a saved config, signed-in ones included — migrateJessiSplit runs
        // in both storage modes and is the only thing that reaches his phone.
        //
        // 1-9 were the Aug 2026 Upper/Lower split and its reorders, 10 the
        // switch to Anterior/Posterior, 11-15 its reorders, renames, machine
        // settings and weekday map (git log has each in full).
        //
        // 16 is the Sep 2026 switch to one Full Body day, mirroring the personal
        // app's config version 22: the same 19 movements, every id kept, so
        // every "Last:" and PR streak follows. Nothing is added or dropped. His
        // weekday map goes to all-days-day-1 (JESSI_SPLIT_SCHEDULE), written
        // because the old one names a day 2 the program no longer has. Revision
        // 16 also retired the one-time migrations that used to live in this file
        // (see the stubs at the bottom) and the name-matched first-run branch
        // that identified an unstamped Full Body program as his.
        //
        // ----------------------------------------------------------------
        // LANDING A CHANGE TO HIS PROGRAM
        // ----------------------------------------------------------------
        // Two places, both in step with the personal app:
        //   1. gym-tracker/js/config.js — DEFAULT_EXERCISES and a bump of
        //      EXERCISE_CONFIG_VERSION. Josh's own program.
        //   2. JESSI_PROGRAM above, plus a bump of this constant (and
        //      JESSI_SPLIT_SCHEDULE in clients.js if the days change). The preset
        //      follows automatically.
        // Keep the declaration on one line as `const JESSI_SPLIT_REVISION = N;`
        // — several test cases read it with a regex.
        //
        // Who owns what: `category` and `order` are code-owned and re-derived on
        // every crossing. `name`, `loadType` and `increment` are HIS, and ride
        // through untouched; changing one of those on an existing device is a
        // Settings job, not a bump.
        const JESSI_SPLIT_REVISION = 16;

        const jessiNorm = (s) => String(s || '').toLowerCase().trim();

        // A fresh entry for a program movement the device does not have. Only
        // used for movements with a stable `id`; see migrateJessiSplit.
        function newJessiEntry(m) {
            return {
                id: m.id,
                name: m.name,
                typeId: 'standard',
                sets: 1,
                minReps: 6,
                maxReps: 8,
                ...(m.startingWeight ? { startingWeight: m.startingWeight } : {}),
                ...(m.loadType ? { loadType: m.loadType } : {}),
                ...(m.increment ? { increment: m.increment } : {}),
                order: 0,
            };
        }

        // Rebuild Jessi's saved program from JESSI_PROGRAM. Pure: returns
        // { config, schedule } to persist, or null when there is nothing to do;
        // `schedule` is null when the saved schedule should be left alone.
        // `workoutHistory` is unused since revision 16 and kept so the caller
        // need not change.
        //
        // WHO THIS TOUCHES. Only a config carrying a numeric `splitRevision`,
        // which nothing but his coach preset and this function has ever written,
        // and whose `coachPreset` stamp (if any) is his. Every other client's
        // config — stamped or from before the stamp existed, coach-code or
        // self-serve, one day called "Full Body" like Grace's or not — has no
        // splitRevision and returns null on the third line. Tests 126 and 127
        // run every other client through this.
        //
        // Never backwards: a config at or past this build's revision is left
        // alone, so an old cached build cannot rebuild a newer program.
        //
        // What it does: flattens the saved days, then lays JESSI_PROGRAM over
        // them. Each program movement claims the saved entry with its stable id,
        // else the one with its name — so a Chest Press he renamed keeps its
        // slot. The claimed entry keeps everything he owns; only category and
        // order are rewritten. A program movement he doesn't have is added only
        // if it has a stable id (a UUID movement missing from his device is one
        // he removed). Anything he added himself goes on the end of the last
        // day, matched by identity, so two with the same name both survive.
        function migrateJessiSplit(config, workoutHistory, schedule) {
            if (!config || config.version !== 2 || !config.days) return null;
            if (config.coachPreset && config.coachPreset !== 'jessi') return null;
            if (typeof config.splitRevision !== 'number') return null;
            if (config.splitRevision >= JESSI_SPLIT_REVISION) return null;

            const existing = Object.keys(config.days)
                .sort((a, b) => Number(a) - Number(b))
                .reduce((all, k) => all.concat(config.days[k] || []), []);

            const byId = new Map();
            const byName = new Map();
            for (const e of existing) {
                if (e.id && !byId.has(e.id)) byId.set(e.id, e);
                const n = jessiNorm(e.name);
                if (!byName.has(n)) byName.set(n, e);
            }

            const placed = new Set();
            const dayCount = JESSI_PROGRAM.length;
            const days = {};
            JESSI_PROGRAM.forEach((day, i) => {
                days[i + 1] = day.movements
                    .map(m => {
                        const byStableId = m.id ? byId.get(m.id) : null;
                        const have = (byStableId && !placed.has(byStableId)) ? byStableId
                            : byName.get(jessiNorm(m.name));
                        if (have && !placed.has(have)) {
                            placed.add(have);
                            return have;
                        }
                        if (m.id && !byId.has(m.id)) return newJessiEntry(m);
                        return null;
                    })
                    .filter(Boolean)
                    .map((ex, order) => ({ ...ex, category: day.name, order }));
            });

            const last = days[dayCount];
            const extras = existing.filter(e => !placed.has(e));
            days[dayCount] = last.concat(extras.map((ex, i) => ({
                ...ex, category: JESSI_PROGRAM[dayCount - 1].name, order: last.length + i,
            })));

            // Rewritten only when it no longer fits the program: missing, the
            // wrong number of days, or pointing a weekday at a day that is gone.
            // A map he has edited within the program's days is left alone.
            const scheduleFits = !!schedule
                && Array.isArray(schedule.workoutDays)
                && schedule.totalWorkoutDays === dayCount
                && schedule.workoutDays.every(d => d.workoutDayNumber >= 1 && d.workoutDayNumber <= dayCount);

            return {
                config: {
                    ...config,
                    days,
                    categories: JESSI_PROGRAM.map(d => d.name),
                    splitRevision: JESSI_SPLIT_REVISION,
                },
                schedule: scheduleFits ? null : {
                    version: 2,
                    ...(schedule || {}),
                    workoutDays: JESSI_SPLIT_SCHEDULE.map(d => ({ ...d })),
                    totalWorkoutDays: dayCount,
                    scheduleIsExplicit: true,
                },
            };
        }

        // His coach preset, built from JESSI_PROGRAM. clients.js returns this for
        // his code before it builds anyone else's template, so nothing here can
        // break another client's install. Read at call time, so the load order
        // of clients.js and this file does not matter.
        function buildJessiPreset() {
            return {
                name: JESSI_PROGRAM.map(d => d.name).join(' - '),
                minimalistPrTracking: true,
                // One below his 6-8 goal range, so a set that missed the floor
                // can still be recorded; 8 is the minimalist PR trigger.
                repsDropdown: { min: 5, max: 8 },
                bypassSchedule: true,
                scheduleDays: JESSI_SPLIT_SCHEDULE,
                // What migrateJessiSplit keys off. Without it a fresh install
                // would be invisible to every future revision.
                splitRevision: JESSI_SPLIT_REVISION,
                workoutDays: Object.fromEntries(JESSI_PROGRAM.map((day, i) => [i + 1, {
                    name: day.name,
                    exercises: day.movements.map(m => ({
                        name: m.name,
                        ...(m.id ? { id: m.id } : {}),
                        ...(m.startingWeight ? { startingWeight: m.startingWeight } : {}),
                        sets: 1,
                        minReps: 6,
                        maxReps: 8,
                        ...(m.loadType ? { loadType: m.loadType } : {}),
                        ...(m.increment ? { increment: m.increment } : {}),
                    })),
                }])),
            };
        }

        // Retired in revision 16 (Sep 2026). These were local-mode one-shots
        // that identified "Jessi's install" by the shape of a config, which also
        // matched other clients: they renamed and reordered an unstamped Grace,
        // deleted movements from self-serve programs and collapsed multi-day
        // ones. They never ran on his signed-in phone. Every device that ran
        // them has its flag set, where they were already no-ops.
        //
        // Kept as empty functions for one release only, so a phone holding a
        // cached older App.jsx that still calls them keeps loading. Remove after
        // 2026-10-31.
        function migrateJessiToAnteriorPosterior() {}
        function migrateJessiToFullBody() {}
        function enableRepsDropdownForJessi() {}
