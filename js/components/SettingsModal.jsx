        const { useState, useEffect, useRef, useMemo } = React;

        function SettingsModal({ onClose, onExport, onImport, onReset, exercisesByDay, updateExerciseName, moveExercise, schedule }) {
            const fileInputRef = useRef();
            const [settingsView, setSettingsView] = useState('main'); // 'main', 'exercises-1', 'exercises-2', etc.
            const [editingExercise, setEditingExercise] = useState(null);
            const [tempName, setTempName] = useState('');
            const [tempSets, setTempSets] = useState('');
            const [tempMinReps, setTempMinReps] = useState('');
            const [tempMaxReps, setTempMaxReps] = useState('');
            const [tempLoadType, setTempLoadType] = useState('pin');

            const handleStartEdit = (exercise) => {
                setEditingExercise(exercise.id);
                setTempName(exercise.name);
                setTempSets(exercise.sets || '');
                setTempMinReps(exercise.minReps || '');
                setTempMaxReps(exercise.maxReps || '');
                // Seed from the resolved value, not the raw field: an exercise
                // the user has never edited has no loadType, and the dropdown
                // should open showing the guess it is currently being given
                // rather than defaulting to the first option.
                setTempLoadType(resolveLoadType(exercise));
            };

            const handleSaveEdit = (day, exerciseId) => {
                if (tempName.trim()) {
                    updateExerciseName(day, exerciseId, tempName.trim(), {
                        sets: tempSets === '' ? '' : parseInt(tempSets) || 0,
                        minReps: tempMinReps === '' ? '' : parseInt(tempMinReps) || 0,
                        maxReps: tempMaxReps === '' ? '' : parseInt(tempMaxReps) || 0,
                        loadType: tempLoadType
                    });
                }
                setEditingExercise(null);
                setTempName('');
                setTempSets('');
                setTempMinReps('');
                setTempMaxReps('');
                setTempLoadType('pin');
            };

            const handleCancelEdit = () => {
                setEditingExercise(null);
                setTempName('');
                setTempSets('');
                setTempMinReps('');
                setTempMaxReps('');
            };

            if (settingsView.startsWith('exercises-')) {
                const day = parseInt(settingsView.replace('exercises-', ''));
                const exercises = exercisesByDay[day] || [];

                return (
                    <div className="modal-overlay" onClick={onClose}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div className="modal-title">Day {day} Exercises</div>

                            <div style={{ marginBottom: '20px' }}>
                                {exercises.map((exercise, idx) => (
                                    <div key={exercise.id} style={{
                                        background: '#1a1a2a',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '8px',
                                        border: '1px solid #2a2a3a'
                                    }}>
                                        {editingExercise === exercise.id ? (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--accent-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Exercise Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        background: '#0d0d1a',
                                                        border: '1px solid var(--accent)',
                                                        borderRadius: '4px',
                                                        color: '#b8b8d0',
                                                        marginBottom: '12px',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    autoFocus
                                                />
                                                {!exercise.isCardio && !exercise.type?.includes('bike') && !exercise.type?.includes('stairmaster') && exercise.type !== 'cardio' && exercise.typeId !== 'cardio' && (
                                                    <>
                                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--accent-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            Sets & Rep Range Goal
                                                        </label>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Sets</span>
                                                                <input
                                                                    type="number"
                                                                    value={tempSets}
                                                                    onChange={(e) => setTempSets(e.target.value)}
                                                                    placeholder="3"
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px',
                                                                        background: '#0d0d1a',
                                                                        border: '1px solid #2a2a3a',
                                                                        borderRadius: '4px',
                                                                        color: '#b8b8d0',
                                                                        fontSize: '14px',
                                                                        textAlign: 'center',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Min Reps</span>
                                                                <input
                                                                    type="number"
                                                                    value={tempMinReps}
                                                                    onChange={(e) => setTempMinReps(e.target.value)}
                                                                    placeholder="8"
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px',
                                                                        background: '#0d0d1a',
                                                                        border: '1px solid #2a2a3a',
                                                                        borderRadius: '4px',
                                                                        color: '#b8b8d0',
                                                                        fontSize: '14px',
                                                                        textAlign: 'center',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>
                                                            <span style={{ color: 'var(--accent-muted)', paddingTop: '20px' }}>-</span>
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Max Reps</span>
                                                                <input
                                                                    type="number"
                                                                    value={tempMaxReps}
                                                                    onChange={(e) => setTempMaxReps(e.target.value)}
                                                                    placeholder="12"
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px',
                                                                        background: '#0d0d1a',
                                                                        border: '1px solid #2a2a3a',
                                                                        borderRadius: '4px',
                                                                        color: '#b8b8d0',
                                                                        fontSize: '14px',
                                                                        textAlign: 'center',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* How this machine is loaded, which decides what the
                                                            Weight Breakdown shows. Sits under the same guard as
                                                            the sets/reps goal — cardio has no load to break
                                                            down. Defaults to whatever the name-based rules
                                                            guess; this is where the user overrules them. */}
                                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--accent-muted)', marginTop: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            How It's Loaded
                                                        </label>
                                                        <select
                                                            data-field="loadType"
                                                            value={tempLoadType}
                                                            onChange={(e) => setTempLoadType(e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                background: '#0d0d1a',
                                                                border: '1px solid #2a2a3a',
                                                                borderRadius: '4px',
                                                                color: '#b8b8d0',
                                                                fontSize: '14px',
                                                                marginBottom: '12px',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        >
                                                            <option value="pin">Pin-loaded</option>
                                                            <option value="plate-two-sided">Plate-loaded on both sides</option>
                                                            <option value="plate-one-sided">Plate-loaded on one side</option>
                                                        </select>
                                                    </>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleSaveEdit(day, exercise.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            background: 'var(--accent)',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            color: '#b8b8d0',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            background: '#1a1a2a',
                                                            border: '1px solid #2a2a3a',
                                                            borderRadius: '4px',
                                                            color: '#8a8aa0',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, fontWeight: '600' }}>
                                                    {exercise.name}
                                                </div>
                                                <button
                                                    onClick={() => moveExercise(day, exercise.id, 'up')}
                                                    disabled={idx === 0}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: idx === 0 ? '#0d0d1a' : '#1a1a2a',
                                                        border: '1px solid #2a2a3a',
                                                        borderRadius: '4px',
                                                        color: idx === 0 ? '#555' : '#8a8aa0',
                                                        cursor: idx === 0 ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    ↑
                                                    </button>
                                                <button
                                                    onClick={() => moveExercise(day, exercise.id, 'down')}
                                                    disabled={idx === exercises.length - 1}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: idx === exercises.length - 1 ? '#0d0d1a' : '#1a1a2a',
                                                        border: '1px solid #2a2a3a',
                                                        borderRadius: '4px',
                                                        color: idx === exercises.length - 1 ? '#555' : '#8a8aa0',
                                                        cursor: idx === exercises.length - 1 ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(exercise)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: '#1a1a2a',
                                                        border: '1px solid #2a2a3a',
                                                        borderRadius: '4px',
                                                        color: '#8a8aa0',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button className="modal-btn" onClick={() => setSettingsView('main')}>
                                ← Back to Settings
                            </button>
                        </div>
                    </div>
                );
            }

            const totalWorkoutDays = schedule ? schedule.totalWorkoutDays : Object.keys(exercisesByDay).length;

            return (
                <div className="modal-overlay" onClick={onClose}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">Settings</div>

                        {Array.from({ length: totalWorkoutDays }, (_, i) => i + 1).map(dayNum => (
                            <button key={dayNum} className="modal-btn" onClick={() => setSettingsView(`exercises-${dayNum}`)}>
                                ✏️ Manage Day {dayNum} Exercises
                            </button>
                        ))}

                        <div style={{ height: '1px', background: '#2a2a3a', margin: '12px 0' }}></div>

                        {window.FIREBASE_READY && window.repo && (
                            window.repo.mode === 'firestore' ? (
                                <div style={{
                                    background: '#1a1a2a',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '8px',
                                    border: '1px solid #2a2a3a',
                                    fontSize: '14px'
                                }}>
                                    <div style={{ marginBottom: '8px' }}>
                                        ☁️ Syncing as <strong>{window.repo.status().email}</strong>
                                        {window.repo.status().pendingWrites > 0 &&
                                            <span style={{ color: '#8a8aa0' }}> ({window.repo.status().pendingWrites} pending)</span>}
                                    </div>
                                    <button className="modal-btn" onClick={() => window.repoSignOut()}>
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <button className="modal-btn" onClick={() => window.repoSignIn()}>
                                    ☁️ Sign in with Google to sync
                                </button>
                            )
                        )}
                        {window.FIREBASE_READY && <div style={{ height: '1px', background: '#2a2a3a', margin: '12px 0' }}></div>}

                        <button className="modal-btn" onClick={onExport}>
                            💾 Backup Data (Export)
                        </button>
                        <button className="modal-btn" onClick={() => fileInputRef.current.click()}>
                            📤 Import Data
                        </button>
                        <button className="modal-btn danger" onClick={onReset}>
                            🗑️ Reset All Data
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="file-input"
                            onChange={onImport}
                        />
                        <button className="modal-btn" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            );
        }
