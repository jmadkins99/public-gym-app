
        function WorkoutView({ currentDay, setCurrentDay, workoutData, loggedExercises, handleInputChange, getPreviousWorkout, logExercise, completeDay, celebration, getCurrentExercises, currentWeek, userBodyweight, schedule, exercisesByDay, fieldErrors, prTracking, advancedPrTracking, minimalistPrTracking, repsDropdown, expandedWeightBreakdown, openWeightBreakdown, workoutHistory }) {
            const exercises = getCurrentExercises();

            // Group exercises by category dynamically
            const exercisesByCategory = {};
            exercises.forEach(exercise => {
                if (!exercisesByCategory[exercise.category]) {
                    exercisesByCategory[exercise.category] = [];
                }
                exercisesByCategory[exercise.category].push(exercise);
            });

            // Get unique categories in order
            const categories = Object.keys(exercisesByCategory);

            // Helper function to check for PR tracking recommendations
            const getPRTrackingRecommendation = (exerciseId) => {
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
            };

            // ── Minimalist PR tracking helpers ────────────────────────────────────────
            // Mirrors the personal-app's simple mode: auto-increment when the last
            // session hit maxReps, plus a 3-session stagnation gold flag. No downweight.

            const getMinimalistPR = (exerciseId) => {
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
            };

            const getMinimalistStagnation = (exerciseId) => {
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
            };

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
            const getPRStreak = (exerciseId) => {
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
            };

            // ── Advanced PR tracking helpers ──────────────────────────────────────────

            // TODO: make these dynamic per exercise instead of hardcoded
            const ADV_MIN_REPS = 6;
            const ADV_MAX_REPS = 8;

            // Look up an exercise's config from the current day's exercisesByDay
            const getExerciseConfig = (exerciseId) =>
                (exercisesByDay[currentDay] || []).find(e => e.id === exerciseId);

            // Check if last submitted session for this day flagged this exercise as a plateau buster
            const isPlateauBuster = (exerciseId) => {
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
            };

            // Trial of Strength: two sessions ago had plateau buster, last session hit maxReps+
            const getPRWeightRecovery = (exerciseId) => {
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
            };

            // Failed plateau buster retry: two sessions ago had plateau buster, last session got
            // in rep range but didn't reach maxReps
            const getFailedPlateauBusterRetry = (exerciseId) => {
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
            };

            // PR Auto-Regulation: last session hit maxReps+ → bump weight up
            const getPRAutoRegulation = (exerciseId) => {
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
            };

            // Plateau buster decrement: last session was plateau buster and they got < minReps →
            // drop weight by the exercise's increment amount
            const getPlateauBusterDecrement = (exerciseId) => {
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
            };

            // ─────────────────────────────────────────────────────────────────────────

            const renderExercise = (exercise) => {
                const previous = getPreviousWorkout(exercise.id);
                const isLogged = loggedExercises[exercise.id];
                const data = workoutData[exercise.id] || {};

                // Check for PR tracking recommendations (only for standard exercises when prTracking is enabled)
                const prRecommendation = prTracking && !isLogged && (exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio'))
                    ? getPRTrackingRecommendation(exercise.id)
                    : null;

                // Advanced PR tracking state machine (standard + bodyweight)
                const isStandardOrBw = exercise.type === 'standard' || exercise.type === 'bodyweight'
                    || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio');
                const showAdvancedPR = advancedPrTracking && !isLogged && isStandardOrBw;

                // Minimalist PR tracking (Jessi, and anyone else opted in via minimalistPrTracking)
                const showMinimalistPR = minimalistPrTracking && !isLogged && isStandardOrBw;
                const minimalistPR = showMinimalistPR ? getMinimalistPR(exercise.id) : null;
                const minimalistStagnation = showMinimalistPR && !minimalistPR ? getMinimalistStagnation(exercise.id) : null;
                // No !isLogged here, unlike the hints above: the streak reports
                // history rather than suggesting a target, so it should stay put
                // once the card is logged.
                const prStreak = minimalistPrTracking && isStandardOrBw ? getPRStreak(exercise.id) : null;
                const showPlateauBuster = showAdvancedPR ? isPlateauBuster(exercise.id) : false;
                const advPrWeightRecovery = showAdvancedPR ? getPRWeightRecovery(exercise.id) : null;
                const advFailedRetry = showAdvancedPR && !advPrWeightRecovery
                    ? getFailedPlateauBusterRetry(exercise.id) : null;
                const advAutoRegulation = showAdvancedPR && !advPrWeightRecovery && !advFailedRetry && exercise.type !== 'bodyweight'
                    ? getPRAutoRegulation(exercise.id) : null;
                const advPlateauDecrement = showAdvancedPR && showPlateauBuster && !advPrWeightRecovery && exercise.type !== 'bodyweight'
                    ? getPlateauBusterDecrement(exercise.id) : null;

                if (exercise.type === 'assault-bike') {
                    const isPROpportunity = previous && previous.rounds;
                    const suggestedRounds = isPROpportunity ? (parseInt(previous.rounds) + 1).toString() : null;
                    const isCurrentlyPRAttempt = isPROpportunity && data.rounds &&
                        parseInt(data.rounds) > parseInt(previous.rounds);

                    return (
                        <div key={exercise.id} data-exercise-id={exercise.id} className={`exercise-card ${isLogged ? 'logged' : ''}`}>
                            <div className="exercise-header">
                                <div>
                                    <div className="exercise-name">
                                        {exercise.name}
                                    </div>
                                    {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                        <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                            Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                        </div>
                                    )}
                                </div>
                                {previous && (
                                    <div className="previous-data">
                                        Last: {previous.rounds} rounds
                                    </div>
                                )}
                            </div>
                            {isPROpportunity && (
                                <div className="pr-suggestion">
                                    Try {suggestedRounds} rounds for a new PR
                                </div>
                            )}
                            <div className="input-row">
                                <div className="input-group">
                                    <label className="input-label">Intensity</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value="30/30"
                                        disabled
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Rounds</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className={`input-field ${isCurrentlyPRAttempt ? 'pr-attempt' : ''}`}
                                        value={data.rounds || ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'rounds', e.target.value)}
                                        placeholder={suggestedRounds || previous?.rounds || '5'}
                                        disabled={isLogged}
                                    />
                                </div>
                            </div>
                            <button
                                className={`log-btn ${isLogged ? 'logged' : ''}`}
                                onClick={() => logExercise(exercise.id)}
                                disabled={isLogged}
                            >
                                {isLogged ? '✓ Logged' : 'LOG'}
                            </button>
                        </div>
                    );
                }

                if (exercise.type === 'stairmaster') {
                    const isPROpportunity = previous && previous.time;
                    let suggestedTime = null;
                    let suggestedLevel = previous?.level || 'Level 7';
                    if (isPROpportunity) {
                        const prevSeconds = parseTimeToSeconds(previous.time);
                        const newSeconds = prevSeconds + 15;
                        suggestedTime = formatSecondsToTime(newSeconds);
                    }
                    const isCurrentlyPRAttempt = isPROpportunity && data.time &&
                        parseTimeToSeconds(data.time) > parseTimeToSeconds(previous.time);

                    // Generate time options from 5:00 to 20:00 in 15-second increments
                    const timeOptions = [];
                    for (let minutes = 5; minutes <= 20; minutes++) {
                        for (let seconds = 0; seconds < 60; seconds += 15) {
                            if (minutes === 20 && seconds > 0) break; // Stop at 20:00
                            timeOptions.push(formatSecondsToTime(minutes * 60 + seconds));
                        }
                    }

                    return (
                        <div key={exercise.id} data-exercise-id={exercise.id} className={`exercise-card ${isLogged ? 'logged' : ''}`}>
                            <div className="exercise-header">
                                <div>
                                    <div className="exercise-name">
                                        {exercise.name}
                                    </div>
                                    {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                        <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                            Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                        </div>
                                    )}
                                </div>
                                {previous && (
                                    <div className="previous-data">
                                        Last: {previous.level || 'Level 7'} - {previous.time}
                                    </div>
                                )}
                            </div>
                            {isPROpportunity && (
                                <div className="pr-suggestion">
                                    Try {suggestedTime} for a new PR
                                </div>
                            )}
                            <div className="input-row">
                                <div className="input-group">
                                    <label className="input-label">Level</label>
                                    <select
                                        className="input-field"
                                        value={data.level || suggestedLevel}
                                        onChange={(e) => handleInputChange(exercise.id, 'level', e.target.value)}
                                        disabled={isLogged}
                                    >
                                        <option value="Level 7">Level 7</option>
                                        <option value="Level 8">Level 8</option>
                                        <option value="Level 9">Level 9</option>
                                        <option value="Level 10">Level 10</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Time</label>
                                    <select
                                        className={`input-field ${isCurrentlyPRAttempt ? 'pr-attempt' : ''}`}
                                        value={data.time || ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'time', e.target.value)}
                                        disabled={isLogged}
                                    >
                                        <option value="">{suggestedTime || previous?.time || 'Select time'}</option>
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                className={`log-btn ${isLogged ? 'logged' : ''}`}
                                onClick={() => logExercise(exercise.id)}
                                disabled={isLogged}
                            >
                                {isLogged ? '✓ Logged' : 'LOG'}
                            </button>
                        </div>
                    );
                }

                if (exercise.type === 'bodyweight') {
                    const bwRepsPlaceholder = (() => {
                        if (advancedPrTracking) {
                            if (advPrWeightRecovery?.reps) return advPrWeightRecovery.reps;
                            if (advFailedRetry?.targetReps) return advFailedRetry.targetReps;
                            if (showPlateauBuster && previous?.reps) return String(parseInt(previous.reps));
                            if (previous?.reps) return String(parseInt(previous.reps) + 1);
                            return '';
                        }
                        if (prTracking && previous?.reps) {
                            return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                                ? (exercise.minReps || 0).toString()
                                : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                        }
                        return previous?.reps || '0';
                    })();

                    return (
                        <div key={exercise.id} data-exercise-id={exercise.id} className={`exercise-card ${isLogged ? 'logged' : ''}`}>
                            <div className="exercise-header">
                                <div>
                                    <div className="exercise-name">{exercise.name}</div>
                                    {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                        <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                            Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                        </div>
                                    )}
                                </div>
                                {previous && (
                                    <div className="previous-data">
                                        Last: {previous.reps} reps
                                    </div>
                                )}
                            </div>
                            {advancedPrTracking && (
                                advPrWeightRecovery ? (
                                    <div style={{ color: '#4CAF50', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                        Trial of Strength
                                    </div>
                                ) : (showPlateauBuster && !advFailedRetry) ? (
                                    <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                        Plateau Buster - Hit 2 Sets
                                    </div>
                                ) : advFailedRetry ? (
                                    <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                        Plateau Buster - Hit 1 Set of {advFailedRetry.targetReps} Reps
                                    </div>
                                ) : null
                            )}
                            <div className="input-row">
                                <div className="input-group">
                                    <label className="input-label">Weight</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value="Body Weight"
                                        disabled
                                    />
                                </div>
                                <div className="input-group" style={{ position: 'relative' }}>
                                    {advancedPrTracking && advPrWeightRecovery && (
                                        <div style={{ position: 'absolute', top: '-20px', left: '0', color: '#4CAF50', fontSize: '12px', fontWeight: '600' }}>
                                            PR Reps to Beat
                                        </div>
                                    )}
                                    <label className="input-label">Reps on First Set</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="input-field"
                                        value={data.reps || ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                        placeholder={bwRepsPlaceholder}
                                        disabled={isLogged}
                                        style={advancedPrTracking && advPrWeightRecovery ? { border: '2px solid #4CAF50' } : {}}
                                    />
                                </div>
                            </div>
                            <button
                                className={`log-btn ${isLogged ? 'logged' : ''}`}
                                onClick={() => logExercise(exercise.id)}
                                disabled={isLogged}
                            >
                                {isLogged ? '✓ Logged' : 'LOG'}
                            </button>
                        </div>
                    );
                }

                // Cardio exercise (generic cardio type from wizard)
                if (exercise.isCardio || exercise.typeId === 'cardio') {
                    const placeholderIntensity = previous?.intensity || exercise.intensity || '';
                    const placeholderMinutes = previous?.minutes || exercise.minutes || 0;
                    const placeholderSeconds = previous?.seconds || exercise.seconds || 0;

                    return (
                        <div key={exercise.id} data-exercise-id={exercise.id} className={`exercise-card ${isLogged ? 'logged' : ''}`}>
                            <div className="exercise-header">
                                <div>
                                    <div className="exercise-name">
                                        {exercise.name}
                                    </div>
                                    {previous && (
                                        <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                            Goal: {previous.intensity || 'Any intensity'} - {previous.minutes || 0}:{String(previous.seconds || 0).padStart(2, '0')}
                                        </div>
                                    )}
                                    {!previous && (exercise.intensity !== undefined || exercise.minutes !== undefined) && (
                                        <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                            Goal: {exercise.intensity || 'Any intensity'} - {exercise.minutes || 0}:{String(exercise.seconds || 0).padStart(2, '0')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="input-row">
                                <div className="input-group">
                                    <label className="input-label">Intensity</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={data.intensity !== undefined ? data.intensity : (exercise.intensity || '')}
                                        onChange={(e) => handleInputChange(exercise.id, 'intensity', e.target.value)}
                                        disabled={isLogged}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Minutes</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className={`input-field ${fieldErrors[`${exercise.id}-minutes`] ? 'error' : ''}`}
                                        value={data.minutes !== undefined ? data.minutes : ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'minutes', e.target.value)}
                                        placeholder={placeholderMinutes}
                                        min="0"
                                        disabled={isLogged}
                                        style={{ textAlign: 'center' }}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Seconds</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="input-field"
                                        value={data.seconds !== undefined ? data.seconds : ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'seconds', e.target.value)}
                                        placeholder={placeholderSeconds}
                                        min="0"
                                        max="59"
                                        disabled={isLogged}
                                        style={{ textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                            <button
                                className={`log-btn ${isLogged ? 'logged' : ''}`}
                                onClick={() => logExercise(exercise.id)}
                                disabled={isLogged}
                            >
                                {isLogged ? '✓ Logged' : 'LOG'}
                            </button>
                        </div>
                    );
                }

                // Standard exercise
                const stdWeightValue = (() => {
                    if (data.weight !== undefined) return data.weight;
                    if (advancedPrTracking) {
                        return advPrWeightRecovery?.weight || advFailedRetry?.weight
                            || advAutoRegulation?.weight || advPlateauDecrement?.weight
                            || previous?.weight || '';
                    }
                    if (minimalistPrTracking && minimalistPR) {
                        return minimalistPR.weight;
                    }
                    // startingWeight seeds a brand-new exercise so the client
                    // has a number to work from on its first session. Only
                    // consulted when there is no history at all; once logged
                    // once, `previous` takes over permanently.
                    return previous?.weight || exercise.startingWeight || '';
                })();

                const placeholderReps = (() => {
                    if (advancedPrTracking) {
                        if (advPrWeightRecovery?.reps) return advPrWeightRecovery.reps;
                        if (advFailedRetry?.targetReps) return advFailedRetry.targetReps;
                        if (advAutoRegulation) return ADV_MIN_REPS.toString();
                        if (advPlateauDecrement) return ADV_MAX_REPS.toString();
                        if (showPlateauBuster && previous?.reps) return String(parseInt(previous.reps));
                        if (previous?.reps) return String(parseInt(previous.reps) + 1);
                        return '';
                    }
                    if (minimalistPrTracking && previous?.reps) {
                        return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                            ? (exercise.minReps || 0).toString()
                            : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                    }
                    if (prTracking && previous?.reps) {
                        return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                            ? (exercise.minReps || 0).toString()
                            : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                    }
                    return previous?.reps || '';
                })();

                // Reps dropdown (Jessi: 5-9), parity with the personal app's 3-6
                // dropdown. Unlike the free-type field this ALWAYS has a value
                // selected, so a one-tap LOG records it. After a weight bump the
                // target resets to the bottom of the goal range for the new
                // heavier load; otherwise last session's reps carry over, clamped
                // into the dropdown range. First-ever session falls back the same
                // way. The range bounds themselves never feed the PR logic.
                const repsDropdownOptions = repsDropdown
                    ? Array.from({ length: repsDropdown.max - repsDropdown.min + 1 },
                                 (_, i) => String(repsDropdown.min + i))
                    : null;
                const repsDropdownDefault = (() => {
                    if (!repsDropdown) return '';
                    const clamp = (n) => String(Math.min(repsDropdown.max, Math.max(repsDropdown.min, n)));
                    const fallback = clamp(exercise.minReps || repsDropdown.min);
                    if (minimalistPR) return fallback;
                    const prev = parseInt(previous?.reps);
                    return isNaN(prev) ? fallback : clamp(prev);
                })();

                const stdWeightBorder = (() => {
                    if (advancedPrTracking) {
                        if (advPrWeightRecovery || advAutoRegulation) return '2px solid #4CAF50';
                        if (showPlateauBuster || advFailedRetry) return '2px solid #ff9500';
                    }
                    if (minimalistPrTracking && minimalistPR) return '2px solid #4CAF50';
                    if (prRecommendation) return `2px solid ${prRecommendation.borderColor}`;
                    return undefined;
                })();

                // Every exercise gets a Weight Breakdown button. This used to be
                // gated behind `gympinMode`, an exerciseConfig flag switched on
                // by ?gympin=on and auto-enabled for Jessi's installs, so in
                // practice only she ever saw it. The gate went away in Aug 2026
                // when the load type became something each user sets for
                // themselves: the name-based rules guess, the user corrects, and
                // there is no longer a reason to hide the result from anyone.
                // The `gympin` prefix on the helpers and data attributes below
                // is left over from that era and means nothing now.
                const gympinConfig = breakdownConfigFor(exercise);
                const hasGympinBreakdown = true;
                const isGympinExpanded = expandedWeightBreakdown === exercise.id;

                return (
                    <div key={exercise.id} data-exercise-id={exercise.id} className={`exercise-card ${isLogged ? 'logged' : ''}`}>
                        <div className="exercise-header">
                            <div>
                                <div className="exercise-name">
                                    {exercise.name}
                                </div>
                                {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                    </div>
                                )}
                                {previous && (
                                    <div className="previous-data" style={{ marginTop: '4px' }}>
                                        Last: {previous.weight}lbs × {previous.reps} on last set
                                    </div>
                                )}
                            </div>
                            {/* Sibling of .exercise-name, never a child: a pile of
                                tests compare that node's textContent to the bare
                                exercise name. */}
                            {prStreak && (
                                <div className="streak-badge" data-streak={prStreak}>
                                    🔥 {prStreak}
                                </div>
                            )}
                            {hasGympinBreakdown && (
                                <button
                                    data-gympin-breakdown-button={exercise.id}
                                    onClick={() => openWeightBreakdown(exercise.id)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        backgroundColor: 'var(--accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Weight Breakdown
                                </button>
                            )}
                        </div>
                        {hasGympinBreakdown && isGympinExpanded && (() => {
                            const target = parseFloat(stdWeightValue) || 0;
                            if (target === 0) return null;

                            if (gympinConfig.type === 'pin-stack') {
                                const breakdown = gympinCalculatePinStackBreakdown(target, gympinConfig);
                                const renderPinSet = (label, set) => {
                                    if (!set.overflow) {
                                        return (
                                            <div style={{ fontWeight: '600' }}>
                                                {label}: {set.pinWeight} lbs
                                            </div>
                                        );
                                    }
                                    const sortedPlates = Object.entries(set.plates)
                                        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                                    return (
                                        <div>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {label}: {set.totalWeight} lbs
                                            </div>
                                            <div style={{ marginLeft: '12px' }}>
                                                Pin: {set.pinWeight} lbs
                                            </div>
                                            {sortedPlates.map(([weight, count]) => (
                                                <div key={weight} style={{ marginLeft: '12px' }}>
                                                    {weight}s - {count}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                };
                                const showTopSet = breakdown.topSet.overflow;
                                return (
                                    <div data-gympin-breakdown-panel={exercise.id} style={{
                                        backgroundColor: '#050510', padding: '12px', borderRadius: '8px',
                                        marginBottom: '12px', fontSize: '13px', fontFamily: 'monospace'
                                    }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            {renderPinSet('Warmup Set #1 (~70%)', breakdown.warmup1)}
                                        </div>
                                        <div style={{ marginBottom: showTopSet ? '12px' : '0' }}>
                                            {renderPinSet('Warmup Set #2 (~90%)', breakdown.warmup2)}
                                        </div>
                                        {showTopSet && (
                                            <div>{renderPinSet('Top Set', breakdown.topSet)}</div>
                                        )}
                                    </div>
                                );
                            }

                            // plate-loaded
                            const breakdown = gympinCalculatePlateBreakdown(target, gympinConfig);
                            const renderPlates = (plates) => {
                                const sorted = Object.entries(plates).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                                return sorted.map(([weight, count]) => (
                                    <div key={weight} style={{ marginLeft: '12px' }}>{weight}s - {count}</div>
                                ));
                            };
                            const isTwoSided = breakdown.isTwoSided;
                            return (
                                <div data-gympin-breakdown-panel={exercise.id} style={{
                                    backgroundColor: '#050510', padding: '12px', borderRadius: '8px',
                                    marginBottom: '12px', fontSize: '13px', fontFamily: 'monospace'
                                }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                            Warmup Set #1 ({(isTwoSided ? breakdown.warmup1.perSideWeight * 2 : breakdown.warmup1.perSideWeight)} lbs - ~70%):
                                        </div>
                                        {isTwoSided && (
                                            <div style={{ marginLeft: '12px', fontStyle: 'italic', color: '#666' }}>
                                                Per side: {breakdown.warmup1.perSideWeight} lbs
                                            </div>
                                        )}
                                        {renderPlates(breakdown.warmup1.plates)}
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                            Warmup Set #2 ({(isTwoSided ? breakdown.warmup2.perSideWeight * 2 : breakdown.warmup2.perSideWeight)} lbs - ~90%):
                                        </div>
                                        {isTwoSided && (
                                            <div style={{ marginLeft: '12px', fontStyle: 'italic', color: '#666' }}>
                                                Per side: {breakdown.warmup2.perSideWeight} lbs
                                            </div>
                                        )}
                                        {renderPlates(breakdown.warmup2.plates)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                            Top Set ({(isTwoSided ? breakdown.topSet.perSideWeight * 2 : breakdown.topSet.perSideWeight)} lbs):
                                        </div>
                                        {isTwoSided && (
                                            <div style={{ marginLeft: '12px', fontStyle: 'italic', color: '#666' }}>
                                                Per side: {breakdown.topSet.perSideWeight} lbs
                                            </div>
                                        )}
                                        {renderPlates(breakdown.topSet.plates)}
                                    </div>
                                </div>
                            );
                        })()}
                        {advancedPrTracking ? (
                            advPrWeightRecovery ? (
                                <div style={{ color: '#4CAF50', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Trial of Strength
                                </div>
                            ) : (showPlateauBuster && !advFailedRetry) ? (
                                <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Plateau Buster - Hit 2 Sets
                                </div>
                            ) : advFailedRetry ? (
                                <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Plateau Buster - Hit 1 Set of {advFailedRetry.targetReps} Reps
                                </div>
                            ) : null
                        ) : minimalistPrTracking ? (
                            minimalistStagnation ? (
                                <div style={{ color: '#d4af37', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    2 Sets Recommended
                                </div>
                            ) : null
                        ) : prRecommendation ? (
                            <div style={{ color: prRecommendation.textColor, padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '12px', textAlign: 'center' }}>
                                {prRecommendation.message}
                            </div>
                        ) : null}
                        {advancedPrTracking && advPrWeightRecovery && (
                            <div style={{ color: '#4CAF50', fontSize: '12px', fontWeight: '600', marginBottom: '8px', marginTop: '-4px' }}>
                                PR Weight Detected
                            </div>
                        )}
                        {advancedPrTracking && advAutoRegulation && !advPrWeightRecovery && (
                            <div style={{ color: '#4CAF50', fontSize: '12px', fontWeight: '600', marginBottom: '8px', marginTop: '4px' }}>
                                +{advAutoRegulation.increment}lbs
                            </div>
                        )}
                        {advancedPrTracking && advPlateauDecrement && !advPrWeightRecovery && !advAutoRegulation && !advFailedRetry && (
                            <div style={{ color: '#ff9500', fontSize: '12px', fontWeight: '600', marginBottom: '8px', marginTop: '4px' }}>
                                -{advPlateauDecrement.increment}lbs
                            </div>
                        )}
                        {minimalistPrTracking && minimalistPR && (
                            <div style={{ color: '#4CAF50', fontSize: '12px', fontWeight: '600', marginBottom: '8px', marginTop: '4px' }}>
                                +{minimalistPR.increment}lbs
                            </div>
                        )}
                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Weight (lbs)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className={`input-field ${fieldErrors[`${exercise.id}-weight`] ? 'error' : ''}`}
                                    value={stdWeightValue}
                                    onChange={(e) => handleInputChange(exercise.id, 'weight', e.target.value)}
                                    placeholder={previous?.weight || ''}
                                    disabled={isLogged}
                                    style={stdWeightBorder ? { border: stdWeightBorder } : {}}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reps on First Set</label>
                                {repsDropdownOptions ? (
                                    <select
                                        className={`input-field ${fieldErrors[`${exercise.id}-reps`] ? 'error' : ''}`}
                                        data-field="reps"
                                        value={data.reps !== undefined ? data.reps : repsDropdownDefault}
                                        onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                        disabled={isLogged}
                                    >
                                        {repsDropdownOptions.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className={`input-field ${fieldErrors[`${exercise.id}-reps`] ? 'error' : ''}`}
                                        value={data.reps || ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                        placeholder={placeholderReps}
                                        disabled={isLogged}
                                    />
                                )}
                            </div>
                        </div>
                        <button
                            className={`log-btn ${isLogged ? 'logged' : ''}`}
                            onClick={() => logExercise(exercise.id)}
                            disabled={isLogged}
                        >
                            {isLogged ? '✓ Logged' : 'LOG'}
                        </button>
                    </div>
                );
            };

            // Get total workout days from schedule or exercisesByDay
            const totalWorkoutDays = schedule ? schedule.totalWorkoutDays : Object.keys(exercisesByDay).length;

            // Helper to get day name from exercises (category is the day name)
            const getDayName = (dayNum) => {
                const dayExercises = exercisesByDay[dayNum];
                if (dayExercises && dayExercises.length > 0) {
                    return dayExercises[0].category; // Category is the day name from wizard
                }
                return `Day ${dayNum}`;
            };

            return (
                <>
                    <div className="day-selector">
                        {Array.from({ length: totalWorkoutDays }, (_, i) => i + 1).map(dayNum => {
                            const dayName = getDayName(dayNum);
                            return (
                                <button
                                    key={dayNum}
                                    className={`day-btn ${currentDay === dayNum ? 'active' : ''}`}
                                    onClick={() => setCurrentDay(dayNum)}
                                >
                                    {dayName}
                                </button>
                            );
                        })}
                    </div>

                    {categories.map(category => (
                        <React.Fragment key={category}>
                            <div className="section-title">{category}</div>
                            {exercisesByCategory[category].map(renderExercise)}
                        </React.Fragment>
                    ))}

                    <button className="save-btn" onClick={completeDay}>
                        Submit Day and View Breakdown
                    </button>
                </>
            );
        }

