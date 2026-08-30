
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
            const weekWorkouts = workoutHistory.filter(w => w.week === viewingWeek);

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
                                const completedIds = new Set(workout.exercises.map(e => e.id));

                                // Calculate sequential day number (total workouts completed)
                                const workoutIndex = workoutHistory.indexOf(workout);
                                const dayNumber = workoutHistory.length - workoutIndex;

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
                                            return (
                                                <div key={expectedExercise.id} className="history-exercise">
                                                    <div className="history-exercise-name">{expectedExercise.name}</div>
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
