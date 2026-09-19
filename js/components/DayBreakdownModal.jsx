
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
            // How long each run is, by id, for the badge on the timing row —
            // counted as of this session, exactly as History counts it.
            const prStreaksById = {};
            currentDayWorkoutExercises.forEach(exercise => {
                if (isExercisePRInWorkout(exercise, todayWorkout, workoutHistory)) {
                    prCount++;
                    prExerciseIds.push(exercise.id);
                    prStreaksById[exercise.id] = getPRStreakInWorkout(exercise, todayWorkout, workoutHistory);
                }
            });

            // Count completed exercises (only for current day)
            // The first log of a day writes a row for every exercise on it, and
            // some of those placeholders are not empty: a bodyweight row carries
            // weight 'Body Weight'. So each type is judged on the field its LOG
            // actually fills, and NA is not an answer. Mirrors the personal app.
            const filled = (v) => !!v && String(v).trim() !== '' && v !== 'NA';
            const completedCount = currentDayWorkoutExercises.filter(e => {
                if (e.isCardio || e.type === 'cardio') {
                    const totalSeconds = ((e.minutes || 0) * 60) + (e.seconds || 0);
                    return totalSeconds > 0;
                }
                if (e.type === 'assault-bike') return filled(e.rounds);
                if (e.type === 'stairmaster') return filled(e.time);
                if (e.type === 'bodyweight') return filled(e.reps);
                return filled(e.weight) || filled(e.reps);
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

                        {timing && <TimingDetails timing={timing} prExerciseIds={prExerciseIds}
                                                  prStreaksById={prStreaksById} />}

                        <button className="modal-btn primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            );
        }
