
        function DayBreakdownModal({ onClose, workoutHistory, currentDay, getCurrentExercises, getPreviousWorkout, foregroundAt }) {
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

            // Get only exercises that match the current day
            const currentDayExerciseIds = new Set(getCurrentExercises().map(e => e.id));
            const currentDayWorkoutExercises = todayWorkout.exercises.filter(e => currentDayExerciseIds.has(e.id));

            // Calculate PRs. Submit Day's count, row badges, History badges,
            // and logged-card badges all use this helper so they cannot drift.
            let prCount = 0;
            const prExerciseIds = [];
            currentDayWorkoutExercises.forEach(exercise => {
                if (isExercisePRInWorkout(exercise, todayWorkout, workoutHistory)) {
                    prCount++;
                    prExerciseIds.push(exercise.id);
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

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                                PRs Smashed
                            </div>
                            <div data-pr-count style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)' }}>
                                {prCount}
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

                        {timing && <TimingDetails timing={timing} prExerciseIds={prExerciseIds} />}

                        <button className="modal-btn primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            );
        }
