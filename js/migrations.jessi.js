        // Detect Jessi's legacy PPL exerciseConfig and collapse day 3 into days 1+2
        // for the new Anterior/Posterior split, preserving UUIDs + any custom names.
        // Runs at most once (gated by the jessiAPMigrationApplied flag).
        function migrateJessiToAnteriorPosterior() {
            if (storage.getItem('jessiAPMigrationApplied') === 'true') return;

            const raw = storage.getItem('gymExerciseConfig');
            if (!raw) return;
            let config;
            try { config = JSON.parse(raw); } catch (e) { return; }

            // Note this one needs no splitRevision guard, unlike
            // migrateJessiToFullBody below. Both now share a name with what the
            // current split produces, but this function's detection is far
            // narrower: three days AND categories of exactly Push/Pull/Legs. A
            // modern Anterior/Posterior config has two days and two categories,
            // so it can never reach the reshaping code past here.
            if (config.version !== 2 || !config.days) return;
            const dayKeys = Object.keys(config.days || {});
            if (dayKeys.length !== 3) return;
            const cats = (config.categories || []).map(c => String(c).toLowerCase());
            const isJessi = cats.length === 3
                && cats.includes('push')
                && cats.includes('pull')
                && cats.includes('legs');
            if (!isJessi) return;

            const day1 = (config.days[1] || []).slice();
            const day2 = (config.days[2] || []).slice();
            const day3 = (config.days[3] || []).slice();

            // Classify day-3 exercises as posterior if name contains hamstring/deadlift/calf cues
            const isPosteriorName = (name) => {
                const n = String(name || '').toLowerCase();
                return /deadlift|romanian|hamstring|leg\s*curl|calf/.test(n);
            };

            const anterior = [];
            const posterior = [];

            day1.forEach(ex => anterior.push({ ...ex, category: 'Anterior' }));
            day3.filter(ex => !isPosteriorName(ex.name)).forEach(ex => anterior.push({ ...ex, category: 'Anterior' }));
            day2.forEach(ex => posterior.push({ ...ex, category: 'Posterior' }));
            day3.filter(ex => isPosteriorName(ex.name)).forEach(ex => posterior.push({ ...ex, category: 'Posterior' }));

            const reindex = (arr) => arr.map((ex, idx) => ({ ...ex, order: idx }));

            const newConfig = {
                ...config,
                version: 2,
                days: {
                    1: reindex(anterior),
                    2: reindex(posterior)
                },
                categories: ['Anterior', 'Posterior'],
                prTracking: false,
                advancedPrTracking: false,
                minimalistPrTracking: true
            };

            storage.setItem('gymExerciseConfig', JSON.stringify(newConfig));

            // Collapse schedule from 3 workout days to 2, remapping any day-3 entries to day-1.
            const rawSchedule = storage.getItem('gymScheduleConfig');
            if (rawSchedule) {
                try {
                    const sched = JSON.parse(rawSchedule);
                    if (sched && Array.isArray(sched.workoutDays)) {
                        const remappedDays = sched.workoutDays.map(d =>
                            d.workoutDayNumber === 3 ? { ...d, workoutDayNumber: 1 } : d
                        );
                        const updatedSchedule = {
                            ...sched,
                            workoutDays: remappedDays,
                            totalWorkoutDays: 2
                        };
                        storage.setItem('gymScheduleConfig', JSON.stringify(updatedSchedule));
                    }
                } catch (e) { /* leave schedule alone */ }
            }

            storage.setItem('jessiAPMigrationApplied', 'true');
        }

        // Jessi's 14-slot Full Body program, by display name. Superseded as a
        // program by the Anterior/Posterior split below (Aug 2026, via a brief
        // Upper/Lower era), but still load bearing in two places:
        // migrateJessiToFullBody still builds this roster on the local-mode
        // path, and migrateJessiSplit uses the full set as its "is this
        // actually Jessi's program?" guard.
        const JESSI_FULL_BODY_ORDER = [
            'Chest Flies',
            'Recline Curls',
            'Frontal Plane Pulldowns',
            'Incline Chest Press',
            'Transverse Plane Rows',
            'Kelso Shrugs',
            'Sagittal Plane Pulldowns',
            'Tricep Extensions',
            'Ab Crunches',
            'Shoulder Press',
            'Calf Raises',
            'Hip Adduction',
            'Back Extensions',
            'Leg Press',
        ];

        // ====================================================================
        // JESSI: ANTERIOR / POSTERIOR SPLIT (August 2026)
        // ====================================================================
        // Mirrors the personal app, whose Upper/Lower split this replaces. Her
        // program remains an exact copy of it minus Stairmaster, which her app
        // has no exercise type for — same 21 movements, same two days, same
        // order.
        //
        // NOT to be confused with her early-2026 Anterior/Posterior program,
        // which migrateJessiToAnteriorPosterior further up still migrates away
        // from. Same two words, different program: that one was PPL-derived and
        // predates the Full Body era. The two are told apart by `splitRevision`,
        // which only the modern pipeline stamps — see the guards on the legacy
        // one-shots.
        //
        // Anatomical with a push/pull flavour rather than strict anatomy: arms
        // are grouped by function, so triceps go Anterior and biceps Posterior.
        // 12 Anterior, 9 Posterior — the push side carries more volume on
        // purpose.

        const JESSI_ANTERIOR_ORDER = [
            'Chest Press',
            'Incline Chest Press',
            'Chest Flies',
            'Shoulder Press',
            'Lateral Raises',
            'Overhead Tricep Extensions',
            // Abs and quads moved up ahead of Tricep Extensions and the wrist
            // pair (Aug 2026), so the big movements are done before the small
            // isolation work rather than after it. Matches the personal app.
            'Ab Crunches',
            'Leg Extensions',
            'Tricep Extensions',
            // The wrist pair splits by anatomy: flexors here, extensors on
            // Posterior. They shared a day under Upper/Lower.
            'Reverse Wrist Curls',
            'Cable Wrist Curls',
            // Quad-dominant, and still the last thing on the day even with Leg
            // Extensions moved up ahead of the arm work.
            'Leg Press',
        ];

        const JESSI_POSTERIOR_ORDER = [
            // Biceps are grouped with the pulling work rather than with the
            // other arm movements.
            'Recline Curls',
            'Frontal Plane Pulldowns',
            'Sagittal Plane Pulldowns',
            'Transverse Plane Rows',
            'Kelso Shrugs',
            'Preacher Curls',
            'Back Extensions',
            // Adductor magnus is a hip extensor, hence the posterior chain.
            'Hip Adduction',
            'Calf Raises',
        ];

        // Four movements the June Full Body migration dropped, now returning.
        // Each is matched against workoutHistory by the display name it had
        // back then so it can reclaim its ORIGINAL id. This matters: every
        // lookup in this app is `w.exercises.find(e => e.id === exerciseId)`,
        // so handing a returning movement a fresh id would orphan years of
        // weights and leave the client staring at a blank card.
        const JESSI_RESTORED = [
            { name: 'Overhead Tricep Extensions', historical: /\bdips?\b|weighted dip|overhead tricep/i },
            { name: 'Lateral Raises',             historical: /lateral raise/i },
            { name: 'Reverse Wrist Curls',        historical: /reverse.*wrist/i },
            { name: 'Cable Wrist Curls',          historical: /cable wrist/i },
        ];

        // Genuinely new movements — no id to reclaim and no history to inherit,
        // unlike JESSI_RESTORED above. Each id is a stable literal rather than a
        // UUID so the coach preset and this migration agree on one key.
        //   - Preacher Curls: the existing "Recline Curls" IS the old Preacher
        //     Curls, renamed by the June migration, so `preacher-curls` is spoken
        //     for. Hence `actual-`.
        //   - Leg Extensions: added Aug 2026, alongside the personal app, which
        //     hit the same collision (its `leg-extensions` id renders as Hip
        //     Adduction). Both apps share the one `actual-leg-extensions` literal.
        //     No getWeightBreakdownConfig rule needed — its name already matches
        //     the pin-stack branch.
        //
        // startingWeight seeds the weight input until it is logged once. It is
        // deliberately NOT a synthetic history entry: fabricating a workout
        // would show up as a real session in the History tab, count toward PR
        // baselines and day totals, and sync a bogus doc to Firestore.
        const JESSI_NEW_EXERCISES = [
            { id: 'actual-preacher-curls', name: 'Preacher Curls', startingWeight: '50' },
            { id: 'actual-leg-extensions', name: 'Leg Extensions', startingWeight: '50' },
            // Added Aug 2026 alongside the personal app. No id collision in
            // either app, so both share the plain `chest-press` literal — no
            // `actual-` prefix needed. Her starting weight is 100, not his 200.
            { id: 'chest-press', name: 'Chest Press', startingWeight: '100' },
        ];


        // Bump to push any code-side change to Jessi's program — a reorder, a
        // new movement, a dropped one — out to devices that already have a
        // saved config, including signed-in ones. This replaced
        // JESSI_ORDER_REVISION, which only ever understood the single Full
        // Body day and went inert the moment the split landed.
        //
        // The sentinel-gated migrations (jessiFullBodyMigrationApplied<N>) all
        // sit inside `if (repo.mode === 'local')`, so on a signed-in device
        // they never run and bumping one is a no-op. This counter is the only
        // path that reaches the client's phone.
        //
        // 1 = the Aug 2026 Upper/Lower split as shipped. 2 adds Leg Extensions
        // to Lower; the re-run branch below is what picks it up on installs that
        // already took revision 1. 3 adds Chest Press to Upper and moves Incline
        // Chest Press up behind Overhead Tricep Extensions — the move is a pure
        // reorder, so 3 is the only thing that carries it to an existing device.
        // 4 moves Shoulder Press up behind Lateral Raises and makes it a pin
        // stack, likewise reorder-only and reachable only via the bump. 5 swaps
        // Chest Press and Incline Chest Press — same names, same count, so the
        // bump is the whole delivery mechanism. 6 moves Leg Press up behind Leg
        // Extensions, likewise reorder-only and reachable only via the bump.
        // (The equipment reclassification that shipped with 6 needs no revision
        // at all — getWeightBreakdownConfig reads display names live on every
        // render and never touches the saved config.) 7 moves Back Extensions
        // up behind Cable Wrist Curls and Hip Adduction ahead of Calf Raises —
        // same names, same count, so the bump is the whole delivery mechanism.
        // 8 takes Back Extensions the rest of the way to the front of Lower,
        // ahead of both wrist curls; reorder-only again, so again the bump is
        // the only thing that reaches the client's phone. 9 sends Leg Press the
        // other way, from behind Leg Extensions to the very end of Lower — a
        // pure reorder for the fourth time, so the bump is again the whole
        // delivery mechanism. (Leg Press also reverts to two-side plate-loaded
        // with 9, but as with the reclassification that shipped alongside 6,
        // that part needs no revision: getWeightBreakdownConfig reads display
        // names live on every render and never touches the saved config.)
        //
        // 10 is the switch from Upper/Lower to Anterior/Posterior, mirroring
        // the personal app's version 14. Same 21 movements, nothing added or
        // dropped — every one of them just changes day, order, or both — so
        // once again the bump is the entire delivery mechanism. It also flips
        // `categories` to Anterior/Posterior, which is why the two legacy
        // one-shots above now bail out on any config carrying a splitRevision:
        // their Jessi-shape detection keys on exactly those category names.
        //
        // 11 moves Ab Crunches and Leg Extensions up the Anterior day, ahead of
        // Tricep Extensions and the wrist pair, mirroring the personal app's
        // config version 16. Same 21 movements, same days, only Anterior's order
        // changes — a fifth pure reorder, so the bump is once more the entire
        // delivery mechanism.
        const JESSI_SPLIT_REVISION = 11;

        const jessiNorm = (s) => String(s || '').toLowerCase().trim();

        // Recover a dropped exercise's original id from workout history, newest
        // entry first so the most recent id wins if the movement was ever
        // re-created. Returns null when the client has no history for it.
        function findHistoricalExerciseId(workoutHistory, pattern) {
            if (!Array.isArray(workoutHistory)) return null;
            const sorted = [...workoutHistory]
                .filter(w => w && Array.isArray(w.exercises))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            for (const workout of sorted) {
                for (const ex of workout.exercises) {
                    if (ex && ex.id && pattern.test(String(ex.name || ''))) return ex.id;
                }
            }
            return null;
        }

        // Split Jessi's single Full Body day into Anterior (day 1) and
        // Posterior (day 2), restoring the four dropped movements and adding
        // Preacher Curls. Named for what it does rather than for the split it
        // currently produces: it has already carried her program through
        // Torso/Limbs, Full Body and Upper/Lower on revision bumps alone, and
        // the name should not need changing again on the next one. (It also
        // cannot be called migrateJessiToAnteriorPosterior — that name is taken
        // by the unrelated one-shot further up that migrates her 2026 PPL-era
        // data.) Pure: returns { config, schedule, recoveredIds } to persist,
        // or null when there is nothing to do. `schedule` is null when the
        // caller should leave the saved schedule alone.
        //
        // Handles TWO entry shapes, because it has to keep working after it
        // has already run once:
        //
        //   1. First run — the single Full Body day. Scoped by exercise NAME
        //      to Jessi's program specifically: it only fires when all 14
        //      canonical Full Body names are present, which no other coach
        //      preset or self-setup program satisfies (graciepoo shares none
        //      of the names; noah is already two days).
        //   2. Re-run — a config this function itself produced, identified by
        //      the splitRevision stamp. Re-sorts both days to the current
        //      JESSI_*_ORDER and picks up any newly added movement. Without
        //      this branch a bumped JESSI_SPLIT_REVISION would hit the
        //      single-day guard and silently do nothing, leaving no lever at
        //      all to reorder his program.
        //
        // Ids, weights, rep ranges and every top-level flag pass through
        // untouched — workoutHistory and PR lookups key on id, never position.
        function migrateJessiSplit(config, workoutHistory, schedule) {
            if (!config || config.version !== 2 || !config.days) return null;
            // A config stamped for a different coach preset is not Jessi's.
            // The day-count and name guards below already keep a two-day client
            // out, but those are circumstantial — this says it outright, and it
            // is what would hold if a future preset happened to be one day.
            if (config.coachPreset && config.coachPreset !== 'jessi') return null;
            if (config.splitRevision === JESSI_SPLIT_REVISION) return null;

            const dayKeys = Object.keys(config.days).sort((a, b) => Number(a) - Number(b));
            const alreadySplit = config.splitRevision !== undefined;
            let existing;

            if (alreadySplit) {
                // Flatten both days back into one list; the take() calls below
                // re-derive which movement belongs to which day from scratch.
                existing = dayKeys.reduce((all, k) => all.concat(config.days[k] || []), []);
            } else {
                if (dayKeys.length !== 1) return null;
                existing = config.days[dayKeys[0]] || [];
                const present = new Set(existing.map(e => jessiNorm(e.name)));
                if (!JESSI_FULL_BODY_ORDER.every(n => present.has(jessiNorm(n)))) return null;
            }

            const byName = new Map(existing.map(e => [jessiNorm(e.name), e]));
            const recoveredIds = {};

            // Bring back the four dropped movements, reusing their old ids.
            for (const spec of JESSI_RESTORED) {
                if (byName.has(jessiNorm(spec.name))) continue;
                const recovered = findHistoricalExerciseId(workoutHistory, spec.historical);
                recoveredIds[spec.name] = recovered;
                byName.set(jessiNorm(spec.name), {
                    id: recovered || generateUUID(),
                    name: spec.name,
                    typeId: 'standard',
                    sets: 1,
                    minReps: 6,
                    maxReps: 8,
                    order: 0,
                });
            }

            // Add the genuinely new movements.
            for (const spec of JESSI_NEW_EXERCISES) {
                if (byName.has(jessiNorm(spec.name))) continue;
                byName.set(jessiNorm(spec.name), {
                    id: spec.id,
                    name: spec.name,
                    typeId: 'standard',
                    sets: 1,
                    minReps: 6,
                    maxReps: 8,
                    startingWeight: spec.startingWeight,
                    order: 0,
                });
            }

            const take = (names, category) => names
                .map(n => byName.get(jessiNorm(n)))
                .filter(Boolean)
                .map((ex, order) => ({ ...ex, category, order }));

            const anterior = take(JESSI_ANTERIOR_ORDER, 'Anterior');
            const posterior = take(JESSI_POSTERIOR_ORDER, 'Posterior');

            // Anything the client added themselves that isn't on either list.
            // Kept rather than dropped, appended to Posterior in its existing
            // relative order — the shorter day, and never silently discarded.
            const placed = new Set([...JESSI_ANTERIOR_ORDER, ...JESSI_POSTERIOR_ORDER].map(jessiNorm));
            const extras = existing
                .filter(e => !placed.has(jessiNorm(e.name)))
                .map((ex, i) => ({ ...ex, category: 'Posterior', order: posterior.length + i }));

            return {
                config: {
                    ...config,
                    days: { 1: anterior, 2: posterior.concat(extras) },
                    categories: ['Anterior', 'Posterior'],
                    splitRevision: JESSI_SPLIT_REVISION,
                },
                // Only rewrite the schedule when the split is first applied.
                // A later revision bump is a program edit, not a calendar
                // change, and stomping the schedule every time would undo any
                // day the client had since moved for themselves.
                schedule: alreadySplit ? null : {
                    ...(schedule || {}),
                    workoutDays: JESSI_SPLIT_SCHEDULE.map(d => ({ ...d })),
                    totalWorkoutDays: 2,
                    scheduleIsExplicit: true,
                },
                recoveredIds,
            };
        }

        // Collapse Jessi's exerciseConfig into a single "Full Body" day. Handles
        // any of her prior shapes (Anterior/Posterior, Push/Pull/Legs, Torso/Limbs,
        // or an already-migrated Full Body that needs the flag-2 fixes).
        // Drops four exercises that are not in the new program: lateral raises,
        // reverse wrist curls, cable wrist curls, dips. Their workoutHistory
        // entries remain in storage but won't display in the program. Renames
        // "Leg Extensions" → "Hip Adduction" to match the personal-app display.
        // Also collapses the schedule so every workout day points to dayNumber 1.
        // Gated by jessiFullBodyMigrationApplied5 (bumped for the 14-slot
        // reorder and the Preacher Curls -> Recline Curls rename).
        function migrateJessiToFullBody() {
            if (storage.getItem('jessiFullBodyMigrationApplied5') === 'true') return;

            const raw = storage.getItem('gymExerciseConfig');
            if (!raw) return;
            let config;
            try { config = JSON.parse(raw); } catch (e) { return; }

            // A config stamped for a different coach preset is not Jessi's,
            // whatever its category names look like. Absent on installs that
            // predate the stamp, including her own, so they are unaffected.
            if (config.coachPreset && config.coachPreset !== 'jessi') return;

            // Never collapse a config the modern split pipeline has stamped.
            // This matters more than it looks: `isAP` below fires on categories
            // of Anterior/Posterior, which since Aug 2026 is what the CURRENT
            // split produces, not just the 2026 PPL-era one this was written
            // for. Without this guard, any device whose one-shot flag is unset
            // — a fresh coach-code install, or a restored backup — would have
            // its brand-new Anterior/Posterior program collapsed back into a
            // single Full Body day, silently dropping Lateral Raises, both
            // wrist curls and Overhead Tricep Extensions.
            if (config.splitRevision !== undefined) return;

            if (config.version !== 2 || !config.days) return;
            const cats = (config.categories || []).map(c => String(c).toLowerCase());
            const isAP = cats.length === 2 && cats.includes('anterior') && cats.includes('posterior');
            const isTL = cats.length === 2 && cats.includes('torso') && cats.includes('limbs');
            const isFB = cats.length === 1 && cats.includes('full body');
            if (!isAP && !isTL && !isFB) return;

            const allExercises = Object.values(config.days).flat();

            // Drop four exercises that aren't in the new program. `dip` matches
            // "Dips" / "Weighted Dips" / "Overhead Tricep Extension" — Jessi's
            // historical names for the movement the personal app also dropped.
            const isDropped = (name) => {
                const n = String(name || '').toLowerCase();
                return /lateral raise|reverse.*wrist|cable wrist|\bdip|weighted dip|overhead tricep/.test(n);
            };

            // Display-name rewrites to mirror personal-app naming.
            const renameDisplay = (name) => {
                const n = String(name || '').toLowerCase();
                if (/leg extension/.test(n))              return 'Hip Adduction';
                if (/tricep pushdown|^pushdown$/.test(n)) return 'Tricep Extensions';
                if (/shoulder press/.test(n))             return 'Shoulder Press';
                if (/ab crunch|crunch/.test(n))           return 'Ab Crunches';
                if (/preacher|recline/.test(n))           return 'Recline Curls';
                return name;
            };

            // Canonical order for Jessi's Full Body program (14 slots, as run
            // July 2026). Runs AFTER renameDisplay, so it matches post-rename
            // names ("Recline Curls", "Tricep Extensions", "Ab Crunches") as
            // well as the legacy names still sitting in older configs.
            // Anything unrecognized falls to 999 and lands at the bottom
            // rather than being dropped.
            const getDesiredOrder = (name) => {
                const n = String(name || '').toLowerCase();
                if (/chest fl/.test(n))                        return 0;
                if (/preacher|recline/.test(n))                return 1;
                if (/frontal/.test(n))                         return 2;
                if (/incline/.test(n))                         return 3;
                if (/transverse|upper back row/.test(n))       return 4;
                if (/kelso|shrug/.test(n))                     return 5;
                if (/sagittal|seated row|hammer row/.test(n))  return 6;
                if (/tricep pushdown|pushdown|tricep ext/.test(n)) return 7;
                if (/ab crunch|crunch/.test(n))                return 8;
                if (/shoulder press/.test(n))                  return 9;
                if (/calf/.test(n))                            return 10;
                if (/hip adduction|leg extension/.test(n))     return 11;
                if (/stiff legged|deadlift|back extension/.test(n)) return 12;
                if (/pendulum|squat|leg press/.test(n))        return 13;
                return 999;
            };

            const kept = allExercises
                .filter(ex => !isDropped(ex.name))
                .map(ex => ({ ...ex, name: renameDisplay(ex.name), category: 'Full Body' }))
                .sort((a, b) => getDesiredOrder(a.name) - getDesiredOrder(b.name))
                .map((ex, idx) => ({ ...ex, order: idx }));

            const newConfig = {
                ...config,
                version: 2,
                days: { 1: kept },
                categories: ['Full Body']
            };

            storage.setItem('gymExerciseConfig', JSON.stringify(newConfig));

            // Collapse schedule so every weekday-mapped workout points to day 1.
            const rawSchedule = storage.getItem('gymScheduleConfig');
            if (rawSchedule) {
                try {
                    const sched = JSON.parse(rawSchedule);
                    if (sched && Array.isArray(sched.workoutDays)) {
                        const updatedSchedule = {
                            ...sched,
                            workoutDays: sched.workoutDays.map(d => ({ ...d, workoutDayNumber: 1 })),
                            totalWorkoutDays: 1
                        };
                        storage.setItem('gymScheduleConfig', JSON.stringify(updatedSchedule));
                    }
                } catch (e) { /* leave schedule alone */ }
            }

            storage.setItem('jessiFullBodyMigrationApplied5', 'true');
        }

        // One-shot: turn the standard card's Reps field into a 5-8 dropdown for
        // Jessi, mirroring the personal app's 3-6 dropdown. Identifies a
        // "Jessi-shaped" install by its exerciseConfig categories — Anterior/
        // Posterior, Torso/Limbs or Full Body, none of which anyone else picks
        // in the wizard. A sibling one-shot used the same signal to enable the
        // Weight Breakdown until that became unconditional in Aug 2026; this is
        // the last one-shot keyed off that shape.
        //
        // The range extends one BELOW his 6-8 goal range so a set that missed
        // the floor can be recorded; minReps is display-only and never feeds
        // the progression logic. The top of the range is his maxReps, so the
        // last option is exactly the getMinimalistPR trigger (reps >= 8 bumps
        // the weight) — same relationship the personal app's 3-6 dropdown has
        // to its own bump at 6.
        function enableRepsDropdownForJessi() {
            if (storage.getItem('jessiRepsDropdownEnabled') === 'true') return;

            const raw = storage.getItem('gymExerciseConfig');
            if (!raw) return;
            let config;
            try { config = JSON.parse(raw); } catch (e) { return; }

            // A config stamped for a different coach preset is not Jessi's,
            // whatever its category names look like. Absent on installs that
            // predate the stamp, including her own, so they are unaffected.
            if (config.coachPreset && config.coachPreset !== 'jessi') return;

            if (config.version !== 2 || !config.days) return;
            const cats = (config.categories || []).map(c => String(c).toLowerCase());
            const isAP = cats.length === 2 && cats.includes('anterior') && cats.includes('posterior');
            const isTL = cats.length === 2 && cats.includes('torso') && cats.includes('limbs');
            const isFB = cats.length === 1 && cats.includes('full body');
            if (!isAP && !isTL && !isFB) return;

            config.repsDropdown = { min: 5, max: 8 };
            storage.setItem('gymExerciseConfig', JSON.stringify(config));
            storage.setItem('jessiRepsDropdownEnabled', 'true');
        }

