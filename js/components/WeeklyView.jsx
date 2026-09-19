
        // Both buttons in a history entry's header row are bare emoji at the
        // same weight, so the styling lives in one place.
        const iconBtnStyle = {
            background: 'none',
            border: 'none',
            color: 'var(--accent-muted)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px'
        };

        function WeeklyView({ workoutHistory, viewingWeek, setViewingWeek, currentWeek, exercisesByDay, onEditWorkout, onViewTiming, foregroundAt }) {
            // Newest first whatever order storage holds them in: an import, a
            // cloud load or an edit can all leave it otherwise.
            const weekWorkouts = workoutHistory
                .filter(w => w.week === viewingWeek)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return (
                <>
                    <div className="week-nav">
                        <button
                            className="week-nav-btn"
                            onClick={() => setViewingWeek(viewingWeek - 1)}
                            disabled={viewingWeek <= 1}
                        >
                            ← Prev
                        </button>
                        <div className="week-title">
                            Week {viewingWeek}
                            {viewingWeek === currentWeek && ' (Current)'}
                        </div>
                        <button
                            className="week-nav-btn"
                            onClick={() => setViewingWeek(viewingWeek + 1)}
                            disabled={viewingWeek >= currentWeek}
                        >
                            Next →
                        </button>
                    </div>

                    {weekWorkouts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <div>No workouts in Week {viewingWeek}</div>
                        </div>
                    ) : (
                        <>
                            {weekWorkouts.map((workout, idx) => {
                                const date = new Date(workout.date);
                                const formattedDate = date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });
                                const formattedTime = date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                });

                                // Get all exercises for this day.
                                // Fall back to the workout's own exercises for legacy days
                                // (e.g. Jessi's old Legs/Day 3 after the AP migration).
                                const allExercises = (exercisesByDay[workout.day] && exercisesByDay[workout.day].length > 0)
                                    ? exercisesByDay[workout.day]
                                    : (workout.exercises || []);

                                // Numbered within the week, counting down from the
                                // newest. Mirrors the personal app.
                                const dayNumber = weekWorkouts.length - idx;

                                // Null for anything carrying no per-exercise
                                // timestamps, which is every session logged
                                // before this shipped — and that is what hides
                                // the stopwatch on those entries rather than
                                // offering an empty modal.
                                const timing = getSessionTiming(workout, foregroundAt);

                                return (
                                    <div key={idx} className="history-item">
                                        <div className="history-date" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Day {dayNumber} - {formattedDate}</span>
                                            <span>
                                                {timing && (
                                                    <button
                                                        onClick={() => onViewTiming(workout)}
                                                        style={iconBtnStyle}
                                                    >
                                                        ⏱️
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onEditWorkout(workout)}
                                                    style={iconBtnStyle}
                                                >
                                                    ✏️
                                                </button>
                                            </span>
                                        </div>
                                        {allExercises.map((expectedExercise) => {
                                            const completedExercise = workout.exercises.find(e => e.id === expectedExercise.id);
                                            // Not gated on workout.submitted: today's in-progress
                                            // entry is already in this list, and the badge should
                                            // land the moment the set is logged. Submitting a day
                                            // cannot change any badge either way - the baseline
                                            // isExercisePRInWorkout compares against is simply the
                                            // last session older than this one, submitted or not.
                                            const isPR = completedExercise &&
                                                isExercisePRInWorkout(completedExercise, workout, workoutHistory);
                                            // Counted as of this entry, not today, so an older
                                            // row in a run keeps the number it earned.
                                            const prStreak = isPR
                                                ? getPRStreakInWorkout(completedExercise, workout, workoutHistory) : 0;
                                            return (
                                                <div key={expectedExercise.id} className="history-exercise">
                                                    <div className="history-exercise-title">
                                                        <div className="history-exercise-name">{expectedExercise.name}</div>
                                                        {isPR ? (
                                                            <div className="streak-badge history-pr-badge" data-pr-badge
                                                                 data-streak={prStreak > 1 ? prStreak : undefined}>
                                                                {prBadgeText(prStreak)}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div className="history-exercise-data">
                                                        {completedExercise ? (
                                                            completedExercise.type === 'assault-bike'
                                                                ? (completedExercise.rounds ? `${completedExercise.rounds} rounds` : <span style={{ color: '#555' }}>NA</span>)
                                                                : completedExercise.type === 'stairmaster'
                                                                ? (completedExercise.time ? `${completedExercise.level || 'Level 7'} - ${completedExercise.time}` : <span style={{ color: '#555' }}>NA</span>)
                                                                : (completedExercise.isCardio || completedExercise.type === 'cardio')
                                                                ? ((completedExercise.intensity || completedExercise.minutes !== undefined)
                                                                    ? `${completedExercise.intensity || 'No intensity'} - ${completedExercise.minutes || 0}:${String(completedExercise.seconds || 0).padStart(2, '0')}`
                                                                    : <span style={{ color: '#555' }}>NA</span>)
                                                                : (completedExercise.weight && completedExercise.reps
                                                                    ? `${completedExercise.weight}${completedExercise.weight === 'Body Weight' ? '' : 'lbs'} × ${completedExercise.reps}`
                                                                    : <span style={{ color: '#555' }}>NA</span>)
                                                        ) : (
                                                            <span style={{ color: '#555' }}>NA</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </>
            );
        }
