        const { useState, useEffect, useRef, useMemo } = React;

        function EditWorkoutModal({ workout, onClose, onSave, exercisesByDay }) {
            const [editedExercises, setEditedExercises] = useState(workout.exercises);
            // Fall back to the workout's own exercises for legacy days whose config has
            // been removed (e.g. Jessi's old Day 3 after the AP migration).
            const configExercises = exercisesByDay[workout.day];
            const allExercises = (configExercises && configExercises.length > 0)
                ? configExercises
                : (workout.exercises || []);

            const handleExerciseChange = (exerciseId, field, value) => {
                setEditedExercises(prev => {
                    const updated = [...prev];
                    const exerciseIndex = updated.findIndex(e => e.id === exerciseId);
                    if (exerciseIndex !== -1) {
                        updated[exerciseIndex] = {
                            ...updated[exerciseIndex],
                            [field]: value
                        };
                    }
                    return updated;
                });
            };

            const handleSave = () => {
                onSave(workout.date, editedExercises);
                onClose();
            };

            const date = new Date(workout.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return (
                <div className="modal-overlay" onClick={onClose}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="modal-title">Edit Workout - Day {workout.day}</div>
                        <div style={{ marginBottom: '20px', color: '#888', fontSize: '14px' }}>
                            {formattedDate}
                        </div>

                        {allExercises.map((exercise) => {
                            const editedExercise = editedExercises.find(e => e.id === exercise.id);

                            return (
                                <div key={exercise.id} style={{
                                    background: '#1a1a2a',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '12px',
                                    border: '1px solid #2a2a3a'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                                        {exercise.name}
                                    </div>
                                    {exercise.type === 'assault-bike' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value="30/30"
                                                disabled
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid #2a2a3a',
                                                    borderRadius: '4px',
                                                    color: '#666'
                                                }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Rounds"
                                                value={editedExercise?.rounds || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'rounds', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            />
                                        </div>
                                    ) : exercise.type === 'stairmaster' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                value={editedExercise?.level || 'Level 7'}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'level', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            >
                                                <option value="Level 7">Level 7</option>
                                                <option value="Level 8">Level 8</option>
                                                <option value="Level 9">Level 9</option>
                                                <option value="Level 10">Level 10</option>
                                            </select>
                                            <select
                                                value={editedExercise?.time || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'time', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            >
                                                <option value="">Select time</option>
                                                {(() => {
                                                    const timeOptions = [];
                                                    for (let minutes = 5; minutes <= 20; minutes++) {
                                                        for (let seconds = 0; seconds < 60; seconds += 15) {
                                                            if (minutes === 20 && seconds > 0) break;
                                                            const time = formatSecondsToTime(minutes * 60 + seconds);
                                                            timeOptions.push(<option key={time} value={time}>{time}</option>);
                                                        }
                                                    }
                                                    return timeOptions;
                                                })()}
                                            </select>
                                        </div>
                                    ) : (exercise.isCardio || exercise.typeId === 'cardio') ? (
                                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                            <input
                                                type="text"
                                                placeholder="Intensity"
                                                value={editedExercise?.intensity || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'intensity', e.target.value)}
                                                style={{
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    placeholder="Minutes"
                                                    value={editedExercise?.minutes || ''}
                                                    onChange={(e) => handleExerciseChange(exercise.id, 'minutes', e.target.value)}
                                                    min="0"
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        background: '#0d0d1a',
                                                        border: '1px solid var(--accent)',
                                                        borderRadius: '4px',
                                                        color: '#b8b8d0',
                                                        textAlign: 'center'
                                                    }}
                                                />
                                                <span style={{ color: 'var(--accent-muted)', alignSelf: 'center' }}>:</span>
                                                <input
                                                    type="number"
                                                    placeholder="Seconds"
                                                    value={editedExercise?.seconds || ''}
                                                    onChange={(e) => handleExerciseChange(exercise.id, 'seconds', e.target.value)}
                                                    min="0"
                                                    max="59"
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        background: '#0d0d1a',
                                                        border: '1px solid var(--accent)',
                                                        borderRadius: '4px',
                                                        color: '#b8b8d0',
                                                        textAlign: 'center'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : exercise.type === 'bodyweight' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value="Body Weight"
                                                disabled
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid #2a2a3a',
                                                    borderRadius: '4px',
                                                    color: '#666'
                                                }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Reps"
                                                value={editedExercise?.reps || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'reps', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="number"
                                                placeholder="Weight"
                                                value={editedExercise?.weight || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'weight', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Reps"
                                                value={editedExercise?.reps || ''}
                                                onChange={(e) => handleExerciseChange(exercise.id, 'reps', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: '#0d0d1a',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '4px',
                                                    color: '#b8b8d0'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                            <button className="modal-btn primary" onClick={handleSave} style={{ flex: 1 }}>
                                Save Changes
                            </button>
                            <button className="modal-btn" onClick={onClose} style={{ flex: 1 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
