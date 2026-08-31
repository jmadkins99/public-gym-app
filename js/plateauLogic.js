        // PR / plateau helpers, lifted out of WorkoutView so the card can be a
        // component of its own rather than a closure inside the list.
        //
        // In WorkoutView these closed over `workoutHistory`, which is why they
        // took only an exercise id. Out here that has to be threaded through
        // explicitly — the same conversion the personal app was forced into
        // when it split its own monolith, and the only non-mechanical part of
        // moving them.
        //
        // Three tracking modes read these, and a client has at most one:
        //   prTracking          getPRTrackingRecommendation
        //   minimalistPrTracking getMinimalistPR / Stagnation / getPRStreak
        //   advancedPrTracking   the five plateau-buster helpers
        // Helper function to check for PR tracking recommendations
        function getPRTrackingRecommendation(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find most recent previous workout with valid data for this exercise
            const previousWorkout = workoutHistory
                .filter(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    // Exclude future workouts
                    if (workoutDate > today) return false;
                    // Exclude today's unsubmitted workout
                    if (workoutDate.getTime() === today.getTime() && !w.submitted) return false;

                    // Check if this workout has valid data for this exercise
                    const exercise = w.exercises.find(e => e.id === exerciseId);
                    if (!exercise) return false;
                    if (!exercise.reps || !exercise.weight) return false;
                    if (exercise.reps === 'NA' || exercise.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            if (!previousWorkout) return null;

            const previousExercise = previousWorkout.exercises.find(e => e.id === exerciseId);
            if (!previousExercise || !previousExercise.reps || !previousExercise.maxReps || !previousExercise.minReps) return null;

            const previousReps = parseInt(previousExercise.reps);
            const maxReps = previousExercise.maxReps;
            const minReps = previousExercise.minReps;

            // Check if hit maxReps or higher (strength gains)
            if (previousReps >= maxReps) {
                return {
                    type: 'strength',
                    message: 'Strength Gains Detected - Weight Increase Recommended',
                    borderColor: '#4CAF50',
                    textColor: '#4CAF50'
                };
            }

            // Check if below minReps (technique opportunity)
            if (previousReps < minReps) {
                return {
                    type: 'technique',
                    message: 'Technique Opportunity Detected - Weight Decrease Recommended',
                    borderColor: '#ff9500',
                    textColor: '#ff9500'
                };
            }

            return null;
        }

        // ── Minimalist PR tracking helpers ────────────────────────────────────────
        // Mirrors the personal-app's simple mode: auto-increment when the last
        // session hit maxReps, plus a 3-session stagnation gold flag. No downweight.

        function getMinimalistPR(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const previousWorkout = workoutHistory
                .filter(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    if (workoutDate > today) return false;
                    if (workoutDate.getTime() === today.getTime() && !w.submitted) return false;
                    const exercise = w.exercises.find(e => e.id === exerciseId);
                    if (!exercise) return false;
                    if (!exercise.reps || !exercise.weight) return false;
                    if (exercise.reps === 'NA' || exercise.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            if (!previousWorkout) return null;

            const previousExercise = previousWorkout.exercises.find(e => e.id === exerciseId);
            if (!previousExercise || !previousExercise.reps || !previousExercise.weight) return null;
            if (!previousExercise.maxReps) return null;

            const previousReps = parseInt(previousExercise.reps);
            if (previousReps < previousExercise.maxReps) return null;

            const lastWeight = parseFloat(previousExercise.weight);
            const increment = getPRWeightIncrement(previousExercise.name);
            return {
                weight: (lastWeight + increment).toString(),
                lastWeight: previousExercise.weight,
                lastReps: previousExercise.reps,
                increment
            };
        }

        function getMinimalistStagnation(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length < 3) return null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const recent = workoutHistory
                .filter(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    if (workoutDate > today) return false;
                    if (workoutDate.getTime() === today.getTime() && !w.submitted) return false;
                    if (!w.submitted) return false;
                    const exercise = w.exercises.find(e => e.id === exerciseId);
                    if (!exercise) return false;
                    if (!exercise.reps || !exercise.weight) return false;
                    if (exercise.reps === 'NA' || exercise.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);

            if (recent.length < 3) return null;

            const exercises = recent.map(w => w.exercises.find(e => e.id === exerciseId));
            const first = exercises[0];
            const allSame = exercises.every(e => e.weight === first.weight && e.reps === first.reps);
            return allSame ? { weight: first.weight, reps: first.reps } : null;
        }

        // Fewest consecutive improvements that earn a badge. One: a single
        // session that beats the one before it is the smallest thing worth
        // calling a streak, and the baseline it beat is not counted.
        const PR_STREAK_MIN = 1;

        // The mirror image of getMinimalistStagnation: how many consecutive
        // times this lift has moved *forward*. Same history walk, no slice —
        // a streak has no ceiling. Renders as the green flame pill in the
        // exercise header.
        //
        // It counts improvements, not sessions: the oldest session in the
        // run is the baseline you improved *from*, so a flat stretch capped
        // by one better session reads 1, not 2.
        //
        // A session extends the streak when the weight went up, or the
        // weight held and the reps went up. It breaks on an identical
        // session, a weight drop, and fewer reps at the same weight.
        //
        // The weight-up case ignores reps entirely, and that is deliberate:
        // getMinimalistPR bumps the weight once you hit maxReps, and the
        // next session starts back at minReps — on Jessi's 5-8 range that
        // is 8 reps to 5. Counting the app's own reward for progressing as
        // backsliding would cap every streak at maxReps - minReps.
        function getPRStreak(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const sessions = workoutHistory
                .filter(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    if (workoutDate > today) return false;
                    if (workoutDate.getTime() === today.getTime() && !w.submitted) return false;
                    if (!w.submitted) return false;
                    const exercise = w.exercises.find(e => e.id === exerciseId);
                    if (!exercise) return false;
                    if (!exercise.reps || !exercise.weight) return false;
                    if (exercise.reps === 'NA' || exercise.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (sessions.length === 0) return null;

            const entries = sessions.map(w => w.exercises.find(e => e.id === exerciseId));

            // Non-numeric weights can't be compared. This guard is load-
            // bearing here in a way it isn't on the personal app: the card
            // gate is isStandardOrBw, which lets bodyweight rows ('Body
            // Weight' in the weight field) reach this comparison.
            const extendsStreak = (newer, older) => {
                const newWeight = parseFloat(newer.weight);
                const oldWeight = parseFloat(older.weight);
                const newReps = parseInt(newer.reps);
                const oldReps = parseInt(older.reps);
                if ([newWeight, oldWeight, newReps, oldReps].some(isNaN)) return false;
                if (newWeight > oldWeight) return true;
                if (newWeight < oldWeight) return false;
                return newReps > oldReps;
            };

            // Starts at 0: one session on its own is a baseline, not a gain.
            let streak = 0;
            for (let i = 0; i + 1 < entries.length; i++) {
                if (!extendsStreak(entries[i], entries[i + 1])) break;
                streak++;
            }

            return streak >= PR_STREAK_MIN ? streak : null;
        }

        // ── Advanced PR tracking helpers ──────────────────────────────────────────

        // TODO: make these dynamic per exercise instead of hardcoded
        const ADV_MIN_REPS = 6;
        const ADV_MAX_REPS = 8;


        // Check if last submitted session for this day flagged this exercise as a plateau buster
        function isPlateauBuster(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return false;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const previousWorkout = workoutHistory
                .filter(w => {
                    const d = new Date(w.date); d.setHours(0, 0, 0, 0);
                    if (d > today) return false;
                    if (d.getTime() === today.getTime() && !w.submitted) return false;
                    const ex = w.exercises.find(e => e.id === exerciseId);
                    if (!ex || !ex.reps || ex.reps === 'NA') return false;
                    if (ex.type !== 'bodyweight' && (!ex.weight || ex.weight === 'NA')) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (!previousWorkout || !previousWorkout.plateauBusters) return false;
            return previousWorkout.plateauBusters.includes(exerciseId);
        }

        // Trial of Strength: two sessions ago had plateau buster, last session hit maxReps+
        function getPRWeightRecovery(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length < 2) return null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const previousWorkouts = workoutHistory
                .filter(w => {
                    const d = new Date(w.date); d.setHours(0, 0, 0, 0);
                    if (d > today) return false;
                    if (d.getTime() === today.getTime() && !w.submitted) return false;
                    const ex = w.exercises.find(e => e.id === exerciseId);
                    if (!ex || !ex.reps || ex.reps === 'NA') return false;
                    if (ex.type !== 'bodyweight' && (!ex.weight || ex.weight === 'NA')) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            if (previousWorkouts.length < 2) return null;
            const lastWeek = previousWorkouts[0];
            const twoWeeksAgo = previousWorkouts[1];
            if (twoWeeksAgo.plateauBusters && twoWeeksAgo.plateauBusters.includes(exerciseId)) {
                const lastWeekEx = lastWeek.exercises.find(e => e.id === exerciseId);
                const twoWeeksEx = twoWeeksAgo.exercises.find(e => e.id === exerciseId);
                if (lastWeekEx && parseInt(lastWeekEx.reps) >= (lastWeekEx.maxReps || ADV_MAX_REPS) && twoWeeksEx) {
                    return {
                        weight: twoWeeksEx.weight,
                        reps: (twoWeeksEx.minReps || ADV_MIN_REPS).toString()
                    };
                }
            }
            return null;
        }

        // Failed plateau buster retry: two sessions ago had plateau buster, last session got
        // in rep range but didn't reach maxReps
        function getFailedPlateauBusterRetry(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length < 2) return null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const previousWorkouts = workoutHistory
                .filter(w => {
                    const d = new Date(w.date); d.setHours(0, 0, 0, 0);
                    if (d > today) return false;
                    if (d.getTime() === today.getTime() && !w.submitted) return false;
                    const ex = w.exercises.find(e => e.id === exerciseId);
                    if (!ex || !ex.reps || ex.reps === 'NA') return false;
                    if (ex.type !== 'bodyweight' && (!ex.weight || ex.weight === 'NA')) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            if (previousWorkouts.length < 2) return null;
            const lastWeek = previousWorkouts[0];
            const twoWeeksAgo = previousWorkouts[1];
            if (twoWeeksAgo.plateauBusters && twoWeeksAgo.plateauBusters.includes(exerciseId)) {
                const lastWeekEx = lastWeek.exercises.find(e => e.id === exerciseId);
                if (lastWeekEx && lastWeekEx.reps && lastWeekEx.weight) {
                    const lastReps = parseInt(lastWeekEx.reps);
                    if (lastReps >= (lastWeekEx.minReps || ADV_MIN_REPS) && lastReps < (lastWeekEx.maxReps || ADV_MAX_REPS)) {
                        return {
                            weight: lastWeekEx.weight,
                            targetReps: (lastReps + 1).toString(),
                            lastReps: lastWeekEx.reps
                        };
                    }
                }
            }
            return null;
        }

        // PR Auto-Regulation: last session hit maxReps+ → bump weight up
        function getPRAutoRegulation(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const previousWorkout = workoutHistory
                .filter(w => {
                    const d = new Date(w.date); d.setHours(0, 0, 0, 0);
                    if (d > today) return false;
                    if (d.getTime() === today.getTime() && !w.submitted) return false;
                    const ex = w.exercises.find(e => e.id === exerciseId);
                    if (!ex || !ex.reps || ex.reps === 'NA') return false;
                    if (!ex.weight || ex.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (!previousWorkout) return null;
            const previousEx = previousWorkout.exercises.find(e => e.id === exerciseId);
            if (!previousEx) return null;
            if (previousEx.reps && parseInt(previousEx.reps) >= (previousEx.maxReps || ADV_MAX_REPS) && previousEx.weight) {
                const increment = getPRWeightIncrement(previousEx.name);
                return {
                    weight: (parseFloat(previousEx.weight) + increment).toString(),
                    lastWeight: previousEx.weight,
                    lastReps: previousEx.reps,
                    increment
                };
            }
            return null;
        }

        // Plateau buster decrement: last session was plateau buster and they got < minReps →
        // drop weight by the exercise's increment amount
        function getPlateauBusterDecrement(exerciseId, workoutHistory) {
            if (!workoutHistory || workoutHistory.length === 0) return null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const previousWorkout = workoutHistory
                .filter(w => {
                    const d = new Date(w.date); d.setHours(0, 0, 0, 0);
                    if (d > today) return false;
                    if (d.getTime() === today.getTime() && !w.submitted) return false;
                    const ex = w.exercises.find(e => e.id === exerciseId);
                    if (!ex || !ex.reps || ex.reps === 'NA') return false;
                    if (!ex.weight || ex.weight === 'NA') return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (!previousWorkout || !previousWorkout.plateauBusters ||
                !previousWorkout.plateauBusters.includes(exerciseId)) return null;
            const previousEx = previousWorkout.exercises.find(e => e.id === exerciseId);
            const previousReps = parseInt(previousEx?.reps) || 0;
            // Only drop weight if they truly failed (< minReps); stagnation keeps same weight
            if (previousReps >= (previousEx?.minReps || ADV_MIN_REPS)) return null;
            if (previousEx && previousEx.weight) {
                const increment = getPRWeightIncrement(previousEx.name);
                return {
                    weight: (parseFloat(previousEx.weight) - increment).toString(),
                    lastWeight: previousEx.weight,
                    increment
                };
            }
            return null;
        }
