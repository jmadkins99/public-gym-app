
        function DayBreakdownModal({ onClose, workoutHistory, currentDay, getCurrentExercises, getPreviousWorkout, foregroundAt }) {
            const [showDetails, setShowDetails] = React.useState(false);
            // Find today's workout
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayWorkout = workoutHistory.find(w => {
                const workoutDate = new Date(w.date);
                workoutDate.setHours(0, 0, 0, 0);
                const isSameDay = workoutDate.getTime() === today.getTime();
                const isSameWorkoutDay = w.day === currentDay;
                return isSameDay && isSameWorkoutDay;
            });

            if (!todayWorkout) {
                return null;
            }

            // Function to get previous workout excluding today
            const getPreviousWorkoutExcludingToday = (exerciseId) => {
                for (let workout of workoutHistory) {
                    // Skip today's workout
                    const workoutDate = new Date(workout.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    if (workoutDate.getTime() === today.getTime() && workout.day === currentDay) {
                        continue;
                    }

                    const exercise = workout.exercises.find(e => e.id === exerciseId);
                    if (exercise) {
                        // For cardio, check that time is actually > 0 (not just "0:00")
                        if (exercise.isCardio || exercise.type === 'cardio') {
                            const totalSeconds = ((exercise.minutes || 0) * 60) + (exercise.seconds || 0);
                            if (totalSeconds > 0) {
                                return exercise;
                            }
                        } else if (exercise.weight || exercise.reps || exercise.rounds || exercise.time || exercise.intensity) {
                            return exercise;
                        }
                    }
                }
                return null;
            };

            // Get only exercises that match the current day
            const currentDayExerciseIds = new Set(getCurrentExercises().map(e => e.id));
            const currentDayWorkoutExercises = todayWorkout.exercises.filter(e => currentDayExerciseIds.has(e.id));

            // Calculate PRs
            const prs = [];
            currentDayWorkoutExercises.forEach(exercise => {
                // Skip NA exercises - for cardio, check if time is 0:00
                if (exercise.isCardio || exercise.type === 'cardio') {
                    const totalSeconds = ((exercise.minutes || 0) * 60) + (exercise.seconds || 0);
                    if (totalSeconds === 0) {
                        return; // Skip cardio with 0:00
                    }
                } else if (!exercise.weight && !exercise.reps && !exercise.rounds && !exercise.time && !exercise.intensity) {
                    return; // Skip NA exercises
                }

                const previous = getPreviousWorkoutExcludingToday(exercise.id);
                if (!previous) {
                    return; // Skip if no previous workout
                }

                let isPR = false;
                let prType = '';

                if (exercise.type === 'assault-bike') {
                    if (parseInt(exercise.rounds) > parseInt(previous.rounds || 0)) {
                        isPR = true;
                        prType = `${exercise.rounds} rounds (prev: ${previous.rounds})`;
                    }
                } else if (exercise.type === 'stairmaster') {
                    const currentSeconds = parseTimeToSeconds(exercise.time);
                    const previousSeconds = parseTimeToSeconds(previous.time);
                    if (currentSeconds > previousSeconds) {
                        isPR = true;
                        prType = `${exercise.time} (prev: ${previous.time})`;
                    }
                } else if (exercise.isCardio || exercise.type === 'cardio') {
                    const currentTotalSeconds = (parseInt(exercise.minutes) || 0) * 60 + (parseInt(exercise.seconds) || 0);
                    const previousTotalSeconds = (parseInt(previous.minutes) || 0) * 60 + (parseInt(previous.seconds) || 0);
                    if (currentTotalSeconds > previousTotalSeconds) {
                        isPR = true;
                        prType = `${exercise.minutes}:${String(exercise.seconds).padStart(2, '0')} @ ${exercise.intensity} (prev: ${previous.minutes}:${String(previous.seconds).padStart(2, '0')} @ ${previous.intensity})`;
                    }
                } else if (exercise.type === 'bodyweight') {
                    if (parseInt(exercise.reps) > parseInt(previous.reps || 0)) {
                        isPR = true;
                        prType = `${exercise.reps} reps (prev: ${previous.reps})`;
                    }
                } else {
                    // Standard exercise - PR if weight increased or same weight with more reps
                    const currentWeight = parseFloat(exercise.weight);
                    const previousWeight = parseFloat(previous.weight);
                    const currentReps = parseInt(exercise.reps);
                    const previousReps = parseInt(previous.reps);

                    if (currentWeight > previousWeight) {
                        isPR = true;
                        prType = `${exercise.weight}lbs × ${exercise.reps} (prev: ${previous.weight}lbs × ${previous.reps})`;
                    } else if (currentWeight === previousWeight && currentReps > previousReps) {
                        isPR = true;
                        prType = `${exercise.weight}lbs × ${exercise.reps} (prev: ${previous.weight}lbs × ${previous.reps})`;
                    }
                }

                if (isPR) {
                    prs.push({
                        name: exercise.name,
                        description: prType
                    });
                }
            });

            // Count completed exercises (only for current day)
            const completedCount = currentDayWorkoutExercises.filter(e => {
                // For cardio, check that time is actually > 0 (not just "0:00")
                if (e.isCardio || e.type === 'cardio') {
                    const totalSeconds = ((e.minutes || 0) * 60) + (e.seconds || 0);
                    return totalSeconds > 0;
                }
                // For other exercise types, check if any data exists
                return e.weight || e.reps || e.rounds || e.time || e.intensity;
            }).length;
            const totalCount = getCurrentExercises().length;

            // Reconstructed from the per-exercise timestamps logExercise
            // stamps. Null for any workout carrying none — every session logged
            // before this shipped — and the whole block below is then left out
            // rather than rendering a zero.
            const timing = getSessionTiming(todayWorkout, foregroundAt);

            const date = new Date(todayWorkout.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return (
                <div className="modal-overlay" onClick={onClose}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-title">Day {currentDay} Breakdown</div>

                        <div style={{ marginBottom: '20px', color: '#888', fontSize: '14px' }}>
                            {formattedDate}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                                Exercises Completed
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)' }}>
                                {completedCount} / {totalCount}
                            </div>
                        </div>

                        {timing && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                                    Time at the Gym
                                </div>
                                <div data-timing-total style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)' }}>
                                    {formatDuration(timing.totalSeconds)}
                                </div>
                            </div>
                        )}

                        {timing && (
                            <button
                                className="modal-btn"
                                onClick={() => setShowDetails(!showDetails)}
                                style={{ marginBottom: '12px' }}
                            >
                                {showDetails ? 'Hide Details' : 'View More Details'}
                            </button>
                        )}

                        {timing && showDetails && <TimingDetails timing={timing} />}

                        <button className="modal-btn primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            );
        }
