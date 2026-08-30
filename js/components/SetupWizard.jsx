        const { useState, useEffect, useRef, useMemo } = React;
        // ============================================================================
        // SETUP WIZARD COMPONENTS
        // ============================================================================

        function WelcomeAnimation({ clientName }) {
            return (
                <div className="welcome-animation-overlay">
                    <div className="welcome-animation-content">
                        <div className="circular-loader-container">
                            <svg className="circular-loader" viewBox="0 0 200 200">
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: 'var(--accent-pale)', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: 'var(--accent-muted)', stopOpacity: 1 }} />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>
                                <circle
                                    className="loader-bg"
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    fill="none"
                                    stroke="#2a2a3a"
                                    strokeWidth="4"
                                />
                                <circle
                                    className="loader-progress"
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    filter="url(#glow)"
                                />
                            </svg>
                            <div className="welcome-text-container">
                                <div className="welcome-greeting">Welcome, {clientName}</div>
                                <div className="welcome-loading">
                                    <div className="loading-dots">
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                    </div>
                                    <div className="loading-text">Loading your personalized coaching program</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        function SetupWizard({ onComplete }) {
            const [step, setStep] = useState(1);
            const [schedule, setSchedule] = useState(null);
            const [workoutDays, setWorkoutDays] = useState({}); // { 1: { name: 'Push', exercises: [...] }, 2: { ... } }
            const [isCoachMode, setIsCoachMode] = useState(false);
            const [coachIdentifier, setCoachIdentifier] = useState(null);
            const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
            const [clientName, setClientName] = useState('');

            const goNext = () => setStep(step + 1);
            const goBack = () => {
                if (step === 2 && isCoachMode) {
                    setStep(1.5); // Go back to coach ID step
                } else {
                    setStep(step - 1);
                }
            };

            const handleCoachMode = () => {
                setIsCoachMode(true);
                setStep(1.5); // Coach ID step
            };

            const handleCoachIdVerified = (identifier) => {
                setCoachIdentifier(identifier);

                const preset = getPresetTemplate(identifier);

                // Check if template has bypassSchedule enabled
                if (preset && preset.bypassSchedule) {
                    // Capitalize first letter of client name
                    const name = identifier.charAt(0).toUpperCase() + identifier.slice(1);
                    setClientName(name);

                    // Show welcome animation only for bypass schedule programs
                    setShowWelcomeAnimation(true);
                    // Auto-detect number of workout days in preset
                    const numWorkoutDays = Object.keys(preset.workoutDays).length;

                    // `scheduleDays` pins an exact weekday -> day-number map.
                    // The round-robin fallback below can only produce a
                    // strictly alternating week, which cannot express a map
                    // like Jessi's (Sat and Sun both Upper).
                    const scheduleWorkoutDays = preset.scheduleDays
                        ? preset.scheduleDays.map(d => ({ ...d }))
                        : (preset.schedule || ['Monday', 'Wednesday', 'Friday']).map((day, index) => ({
                            dayOfWeek: day,
                            workoutDayNumber: (index % numWorkoutDays) + 1
                        }));

                    const generatedSchedule = {
                        workoutDays: scheduleWorkoutDays,
                        totalWorkoutDays: numWorkoutDays,
                        scheduleIsExplicit: !!(preset.schedule || preset.scheduleDays)
                    };

                    setSchedule(generatedSchedule);
                    setWorkoutDays(preset.workoutDays);

                    // Convert to exercise config format and save immediately (background loading)
                    const exercisesByDay = {};
                    const allCategories = new Set();

                    Object.entries(preset.workoutDays).forEach(([dayNum, dayData]) => {
                        exercisesByDay[dayNum] = dayData.exercises.map((ex, idx) => {
                            if (ex.isCardio) {
                                return {
                                    id: generateUUID(),
                                    name: ex.name,
                                    category: dayData.name,
                                    typeId: 'cardio',
                                    isCardio: true,
                                    intensity: ex.intensity || '',
                                    minutes: ex.minutes || 0,
                                    seconds: ex.seconds || 0,
                                    order: idx
                                };
                            } else {
                                return {
                                    // A preset may pin a stable id so that the
                                    // fresh-install and existing-device paths
                                    // agree on one key for the same movement.
                                    id: ex.id || generateUUID(),
                                    name: ex.name,
                                    category: dayData.name,
                                    typeId: 'standard',
                                    sets: ex.sets || 3,
                                    minReps: ex.minReps || 8,
                                    maxReps: ex.maxReps || 12,
                                    ...(ex.startingWeight ? { startingWeight: ex.startingWeight } : {}),
                                    // A preset may seed how each machine is
                                    // loaded, for a client whose gym the
                                    // name-based rules would guess wrong about.
                                    // Omitted leaves resolveLoadType to guess.
                                    ...(ex.loadType ? { loadType: ex.loadType } : {}),
                                    order: idx
                                };
                            }
                        });
                        allCategories.add(dayData.name);
                    });

                    // Save immediately so data is ready when animation finishes
                    // (repo saves also land in localStorage synchronously).
                    window.repo.saveSetupCompleted({
                        version: 1,
                        completed: true,
                        completedAt: new Date().toISOString()
                    });

                    window.repo.saveScheduleConfig({
                        version: 2,
                        ...generatedSchedule
                    });

                    window.repo.saveExerciseConfig({
                        version: 2,
                        days: exercisesByDay,
                        categories: Array.from(allCategories),
                        prTracking: preset.prTracking || false,
                        advancedPrTracking: preset.advancedPrTracking || false,
                        minimalistPrTracking: preset.minimalistPrTracking || false,
                        // Which preset built this config. Read by the Jessi
                        // one-shots below, which otherwise identify her install
                        // by the shape of its categories — a signal that also
                        // matches any other client on an Anterior/Posterior
                        // split, and would collapse their program into one day.
                        coachPreset: identifier,
                        // Carried from the preset so a coach-code install gets
                        // this immediately. The one-shot enabler below only runs
                        // at mount, so without this a fresh install would need a
                        // second load before the dropdown appeared.
                        repsDropdown: preset.repsDropdown || null,
                        // Only present on presets that are a revision of a
                        // migrated program; see the note on the jessi preset.
                        ...(preset.splitRevision !== undefined
                            ? { splitRevision: preset.splitRevision } : {})
                    });

                    // Wait for animation to complete, then hide and load app
                    setTimeout(() => {
                        setShowWelcomeAnimation(false);
                        onComplete();
                    }, 6000);
                } else {
                    setStep(2); // Go to schedule step
                }
            };

            const handleScheduleComplete = (newSchedule) => {
                setSchedule(newSchedule);

                if (isCoachMode && coachIdentifier) {
                    // Load preset workouts for coach mode
                    const preset = getPresetTemplate(coachIdentifier);
                    if (preset) {
                        const uniqueDays = Array.from(new Set(newSchedule.workoutDays.map(d => d.workoutDayNumber))).sort();
                        const presetDays = {};

                        uniqueDays.forEach((dayNum, index) => {
                            const presetDayNum = (index % Object.keys(preset.workoutDays).length) + 1;
                            const presetDay = preset.workoutDays[presetDayNum];
                            if (presetDay) {
                                presetDays[dayNum] = {
                                    name: presetDay.name,
                                    exercises: [...presetDay.exercises]
                                };
                            }
                        });

                        setWorkoutDays(presetDays);
                        setStep(4); // Skip exercise building, go straight to confirm
                        return;
                    }
                }

                // Normal flow - Initialize empty workout days
                const uniqueDays = Array.from(new Set(newSchedule.workoutDays.map(d => d.workoutDayNumber))).sort();
                const initialDays = {};
                uniqueDays.forEach(dayNum => {
                    initialDays[dayNum] = {
                        name: `Day ${dayNum}`,
                        exercises: []
                    };
                });
                setWorkoutDays(initialDays);

                goNext();
            };

            const handleExercisesComplete = (newWorkoutDays) => {
                setWorkoutDays(newWorkoutDays);
                goNext();
            };

            const handleComplete = () => {
                // Convert to exercise config format
                const exercisesByDay = {};
                const allCategories = new Set();

                Object.entries(workoutDays).forEach(([dayNum, dayData]) => {
                    exercisesByDay[dayNum] = dayData.exercises.map((ex, idx) => {
                        if (ex.isCardio) {
                            return {
                                id: generateUUID(),
                                name: ex.name,
                                category: dayData.name,
                                typeId: 'cardio',
                                isCardio: true,
                                intensity: ex.intensity || '',
                                minutes: ex.minutes || 0,
                                seconds: ex.seconds || 0,
                                order: idx
                            };
                        } else {
                            return {
                                id: generateUUID(),
                                name: ex.name,
                                category: dayData.name,
                                typeId: 'standard',
                                sets: ex.sets || 3,
                                minReps: ex.minReps || 8,
                                maxReps: ex.maxReps || 12,
                                order: idx
                            };
                        }
                    });
                    allCategories.add(dayData.name);
                });

                // Save through the repo (also lands in localStorage synchronously)
                window.repo.saveSetupCompleted({
                    version: 1,
                    completed: true,
                    completedAt: new Date().toISOString()
                });

                window.repo.saveScheduleConfig({
                    version: 2,
                    ...schedule
                });

                window.repo.saveExerciseConfig({
                    version: 2,
                    days: exercisesByDay,
                    categories: Array.from(allCategories)
                });

                onComplete();
            };

            const presetTemplate = isCoachMode && coachIdentifier ? getPresetTemplate(coachIdentifier) : null;

            return (
                <>
                    {showWelcomeAnimation && <WelcomeAnimation clientName={clientName} />}
                    {!showWelcomeAnimation && (
                        <div className="wizard-overlay">
                            <div className="wizard-container">
                                {step === 1 && <WelcomeStep onNext={goNext} onCoach={handleCoachMode} />}
                                {step === 1.5 && <CoachIdStep onNext={handleCoachIdVerified} onBack={() => { setIsCoachMode(false); setStep(1); }} />}
                                {step === 2 && <ScheduleStep onNext={handleScheduleComplete} onBack={goBack} isCoachMode={isCoachMode} presetTemplate={presetTemplate} />}
                                {step === 3 && <ExerciseBuildingStep schedule={schedule} initialWorkoutDays={workoutDays} onNext={handleExercisesComplete} onBack={goBack} />}
                                {step === 4 && <ConfirmStep schedule={schedule} workoutDays={workoutDays} onComplete={handleComplete} onBack={goBack} />}
                            </div>
                        </div>
                    )}
                </>
            );
        }

        function WelcomeStep({ onNext, onCoach }) {
            return (
                <>
                    <div className="wizard-header">
                        <div className="wizard-icon">💪</div>
                        <h1 className="wizard-title">Welcome to Gym Tracker</h1>
                        <p className="wizard-subtitle">Let's set up your personalized workout program</p>
                    </div>

                    <div className="wizard-progress">
                        <div className="wizard-progress-dot active"></div>
                        <div className="wizard-progress-dot"></div>
                        <div className="wizard-progress-dot"></div>
                        <div className="wizard-progress-dot"></div>
                    </div>

                    <div className="wizard-content" style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#8a8aa0', lineHeight: '1.6', marginBottom: '20px' }}>
                            Build a fully customized program that works for you:
                        </p>
                        <ul style={{ textAlign: 'left', fontSize: '14px', color: '#8a8aa0', lineHeight: '2', listStyle: 'none', padding: 0 }}>
                            <li>📅 Pick which days you work out</li>
                            <li>🏋️ Name your workout days (Push/Pull/Legs, Upper/Lower, etc.)</li>
                            <li>✏️ Choose exercises or type your own</li>
                            <li>📈 Track progress and PRs over time</li>
                        </ul>
                    </div>

                    <div className="wizard-buttons">
                        <button className="wizard-btn" style={{ background: '#2a2a3a', marginTop: '10px' }} onClick={onCoach}>I Have a Coach</button>
                        <button className="wizard-btn" onClick={onNext}>Get Started</button>
                    </div>
                </>
            );
        }

        function CoachIdStep({ onNext, onBack }) {
            const [doomId, setDoomId] = useState('');
            const [error, setError] = useState('');

            const handleSubmit = () => {
                const identifier = verifyDoomId(doomId.trim());
                if (identifier) {
                    onNext(identifier);
                } else {
                    setError('Invalid ID. Please check with your coach.');
                }
            };

            return (
                <>
                    <div className="wizard-header">
                        <div className="wizard-icon">🔑</div>
                        <h1 className="wizard-title">Enter Your Coach ID</h1>
                        <p className="wizard-subtitle">Enter the unique ID provided by your coach</p>
                    </div>

                    <div className="wizard-progress">
                        <div className="wizard-progress-dot active"></div>
                        <div className="wizard-progress-dot"></div>
                        <div className="wizard-progress-dot"></div>
                        <div className="wizard-progress-dot"></div>
                    </div>

                    <div className="wizard-content">
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#b8b8d0', fontSize: '14px' }}>
                                Coach ID
                            </label>
                            <input
                                type="text"
                                value={doomId}
                                onChange={(e) => {
                                    setDoomId(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter your ID"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#1a1a2a',
                                    border: error ? '2px solid #ff4444' : '1px solid #2a2a3a',
                                    borderRadius: '8px',
                                    color: '#b8b8d0',
                                    fontSize: '16px',
                                    outline: 'none'
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                            {error && (
                                <p style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="wizard-buttons">
			<button className="wizard-btn secondary" onClick={onBack}>Back</button>
                        <button className="wizard-btn" onClick={handleSubmit}>Continue</button>
                    </div>
                </>
            );
        }

        function ScheduleStep({ onNext, onBack, isCoachMode, presetTemplate }) {
            const [schedule, setSchedule] = useState([]);

            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            // Get max days allowed based on preset template
            const maxDays = isCoachMode && presetTemplate
                ? Object.keys(presetTemplate.workoutDays).length
                : Infinity;

            const daysRemaining = maxDays === Infinity ? 0 : maxDays - schedule.length;

            const toggleDay = (dayOfWeek) => {
                const existingDay = schedule.find(d => d.dayOfWeek === dayOfWeek);

                if (existingDay) {
                    // Remove this day
                    setSchedule(schedule.filter(d => d.dayOfWeek !== dayOfWeek));
                } else {
                    // Check if we've reached the max for coach mode
                    if (isCoachMode && schedule.length >= maxDays) {
                        return; // Don't allow more days
                    }

                    // Add this day - assign next available workout day number
                    const usedDayNumbers = new Set(schedule.map(d => d.workoutDayNumber));
                    let nextDayNumber = 1;
                    while (usedDayNumbers.has(nextDayNumber)) {
                        nextDayNumber++;
                    }
                    setSchedule([...schedule, { dayOfWeek, workoutDayNumber: nextDayNumber }]);
                }
            };

            const changeDayNumber = (dayOfWeek, newNumber) => {
                setSchedule(schedule.map(d =>
                    d.dayOfWeek === dayOfWeek ? { ...d, workoutDayNumber: newNumber } : d
                ));
            };

            const handleContinue = () => {
                const uniqueDays = new Set(schedule.map(d => d.workoutDayNumber));
                onNext({
                    workoutDays: schedule,
                    totalWorkoutDays: uniqueDays.size
                });
            };

            const isActive = (day) => schedule.some(d => d.dayOfWeek === day);
            const getDayNumber = (day) => schedule.find(d => d.dayOfWeek === day)?.workoutDayNumber || 1;
            const maxDayNumber = Math.max(1, ...schedule.map(d => d.workoutDayNumber));

            return (
                <>
                    <div className="wizard-header">
                        <h1 className="wizard-title">Set Your Schedule</h1>
                        <p className="wizard-subtitle">
                            {isCoachMode && presetTemplate ? (
                                <>
                                    {presetTemplate.name}
                                    <br />
                                    <span style={{ fontSize: '14px', color: 'var(--accent-muted)' }}>{maxDays}-day Split</span>
                                </>
                            ) : (
                                'Which days will you work out?'
                            )}
                        </p>
                    </div>

                    <div className="wizard-progress">
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot active"></div>
                        <div className="wizard-progress-dot"></div>
                        <div className="wizard-progress-dot"></div>
                    </div>

                    <div className="wizard-content">
                        {isCoachMode && daysRemaining > 0 && (
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '20px',
                                fontSize: '14px',
                                color: '#8a8aa0',
                                padding: '12px',
                                background: '#1a1a2a',
                                borderRadius: '8px',
                                border: '1px solid #2a2a3a'
                            }}>
                                Pick {daysRemaining} More {daysRemaining === 1 ? 'Day' : 'Days'}
                            </div>
                        )}

                        <div className="calendar-grid">
                            {daysOfWeek.map(day => (
                                <div
                                    key={day}
                                    className={`calendar-day ${isActive(day) ? 'active' : 'rest'}`}
                                    onClick={() => toggleDay(day)}
                                    style={{
                                        opacity: (isCoachMode && !isActive(day) && schedule.length >= maxDays) ? 0.3 : 1,
                                        cursor: (isCoachMode && !isActive(day) && schedule.length >= maxDays) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <div className="calendar-day-name">{day.substring(0, 3)}</div>
                                    <div className="calendar-day-number">
                                        {isActive(day) ? getDayNumber(day) : 'Rest'}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div className="wizard-buttons">
                        <button className="wizard-btn secondary" onClick={onBack}>Back</button>
                        <button className="wizard-btn" onClick={handleContinue} disabled={isCoachMode ? schedule.length !== maxDays : schedule.length === 0}>
                            Continue
                        </button>
                    </div>
                </>
            );
        }

        function ExerciseBuildingStep({ schedule, initialWorkoutDays, onNext, onBack }) {
            const [workoutDays, setWorkoutDays] = useState(initialWorkoutDays);
            const [selectedDay, setSelectedDay] = useState(null);
            const [customExercise, setCustomExercise] = useState('');
            const [showExample, setShowExample] = useState(false);
            const [validationErrors, setValidationErrors] = useState({});

            const uniqueDays = Array.from(new Set(schedule.workoutDays.map(d => d.workoutDayNumber))).sort();

            // Auto-select first day on mount
            useEffect(() => {
                if (!selectedDay && uniqueDays.length > 0) {
                    setSelectedDay(uniqueDays[0]);
                }
            }, []);

            const currentDay = workoutDays[selectedDay];

            const updateDayName = (dayNum, newName) => {
                setWorkoutDays({
                    ...workoutDays,
                    [dayNum]: {
                        ...workoutDays[dayNum],
                        name: newName
                    }
                });
            };

            const addExercise = (exerciseName) => {
                if (!exerciseName.trim()) return;

                const trimmedName = exerciseName.trim();
                const isCardio = isCardioExercise(trimmedName);

                const newExercise = isCardio ? {
                    name: trimmedName,
                    isCardio: true,
                    intensity: '',
                    minutes: 0,
                    seconds: 0
                } : {
                    name: trimmedName,
                    sets: 3,
                    minReps: 8,
                    maxReps: 12
                };

                setWorkoutDays({
                    ...workoutDays,
                    [selectedDay]: {
                        ...workoutDays[selectedDay],
                        exercises: [...workoutDays[selectedDay].exercises, newExercise]
                    }
                });

                setCustomExercise('');
            };

            const updateExerciseField = (dayNum, exerciseIndex, field, value) => {
                const updatedExercises = [...workoutDays[dayNum].exercises];
                // For numeric fields, allow empty string temporarily so user can clear and retype
                const processedValue = (field === 'sets' || field === 'minReps' || field === 'maxReps' || field === 'minutes' || field === 'seconds')
                    ? (value === '' ? '' : (parseInt(value) || 0))
                    : value;

                updatedExercises[exerciseIndex] = {
                    ...updatedExercises[exerciseIndex],
                    [field]: processedValue
                };
                setWorkoutDays({
                    ...workoutDays,
                    [dayNum]: {
                        ...workoutDays[dayNum],
                        exercises: updatedExercises
                    }
                });
            };

            const removeExercise = (dayNum, index) => {
                setWorkoutDays({
                    ...workoutDays,
                    [dayNum]: {
                        ...workoutDays[dayNum],
                        exercises: workoutDays[dayNum].exercises.filter((_, i) => i !== index)
                    }
                });
            };

            const moveExercise = (dayNum, exerciseIndex, direction) => {
                const exercises = workoutDays[dayNum].exercises;

                // Prevent moving beyond boundaries
                if (direction === 'up' && exerciseIndex === 0) return;
                if (direction === 'down' && exerciseIndex === exercises.length - 1) return;

                // Calculate new index
                const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;

                // Create a copy and swap exercises
                const reordered = [...exercises];
                [reordered[exerciseIndex], reordered[newIndex]] = [reordered[newIndex], reordered[exerciseIndex]];

                // Update state with reordered exercises
                setWorkoutDays({
                    ...workoutDays,
                    [dayNum]: {
                        ...workoutDays[dayNum],
                        exercises: reordered
                    }
                });
            };

            const hasAtLeastOneExercise = Object.values(workoutDays).some(day => day.exercises.length > 0);
            const allDaysHaveExercises = Object.values(workoutDays).every(day => day.exercises.length > 0);

            const validateExercises = () => {
                const errors = {};

                Object.entries(workoutDays).forEach(([dayNum, dayData]) => {
                    dayData.exercises.forEach((ex, idx) => {
                        if (ex.isCardio) {
                            if (!ex.intensity || ex.intensity.trim() === '') {
                                const errorKey = `${dayNum}-${idx}-intensity`;
                                errors[errorKey] = 'Intensity is required for cardio exercises';
                            }
                            if (!ex.minutes || ex.minutes === 0) {
                                const errorKey = `${dayNum}-${idx}-minutes`;
                                errors[errorKey] = 'Minutes is required for cardio exercises';
                            }
                        }
                    });
                });

                return errors;
            };

            const handleContinue = () => {
                const errors = validateExercises();
                setValidationErrors(errors);

                if (Object.keys(errors).length > 0) {
                    // Find first day with errors and switch to it
                    const firstErrorKey = Object.keys(errors)[0];
                    const dayNum = parseInt(firstErrorKey.split('-')[0]);
                    setSelectedDay(dayNum);
                    return;
                }

                if (allDaysHaveExercises) {
                    onNext(workoutDays);
                } else {
                    // Find first day without exercises and switch to it
                    const emptyDay = Object.keys(workoutDays).find(dayNum => workoutDays[dayNum].exercises.length === 0);
                    if (emptyDay) {
                        setSelectedDay(parseInt(emptyDay));
                    }
                }
            };

            const dayLabels = schedule.workoutDays
                .filter(d => d.workoutDayNumber === selectedDay)
                .map(d => d.dayOfWeek.substring(0, 3))
                .join('/');

            return (
                <>
                    <div className="wizard-header">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                            <h1 className="wizard-title" style={{ margin: 0 }}>Build Your Workouts</h1>
                            <button
                                onClick={() => setShowExample(true)}
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))',
                                    border: '2px solid var(--accent-soft)',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#b8b8d0',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(var(--accent-rgb), 0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, var(--accent-hi), var(--accent-soft))';
                                    e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, var(--accent), var(--accent-hi))';
                                    e.target.style.transform = 'scale(1)';
                                }}
                                title="Show example"
                            >
                                ?
                            </button>
                        </div>
                        <p className="wizard-subtitle">Name each day and add exercises</p>
                    </div>

                    <div className="wizard-progress">
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot active"></div>
                        <div className="wizard-progress-dot"></div>
                    </div>

                    <div className="wizard-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                                {/* Day selector tabs */}
                                <div className="workout-day-selector" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    {uniqueDays.map(dayNum => {
                                        const labels = schedule.workoutDays
                                            .filter(d => d.workoutDayNumber === dayNum)
                                            .map(d => d.dayOfWeek.substring(0, 3))
                                            .join('/');
                                        return (
                                            <button
                                                key={dayNum}
                                                onClick={() => setSelectedDay(dayNum)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '100px',
                                                    padding: '12px',
                                                    background: selectedDay === dayNum ? 'var(--accent)' : '#1a1a2a',
                                                    border: `2px solid ${selectedDay === dayNum ? 'var(--accent-hi)' : '#2a2a3a'}`,
                                                    borderRadius: '8px',
                                                    color: '#b8b8d0',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {labels}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Day name input */}
                                {currentDay && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--accent-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Name this day (e.g., "Push", "Upper", "Chest & Back")
                                        </label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={currentDay.name}
                                            onChange={(e) => updateDayName(selectedDay, e.target.value)}
                                            placeholder="Day name..."
                                            style={{ marginBottom: 0 }}
                                        />
                                    </div>
                                )}

                                {/* Exercise list */}
                                {currentDay && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--accent-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Exercises ({currentDay.exercises.length})
                                        </div>
                                        {/* Column headers */}
                                        {currentDay.exercises.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', marginBottom: '6px' }}>
                                                <span style={{ minWidth: '160px', flex: '0 0 auto', fontSize: '11px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exercise Name</span>
                                            </div>
                                        )}
                                        <div style={{ background: '#1a1a2a', borderRadius: '8px', padding: '12px', minHeight: '100px' }}>
                                            {currentDay.exercises.length === 0 && (
                                                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                                    Start typing your exercises to see common exercises, or create your own
                                                </div>
                                            )}
                                            {currentDay.exercises.map((ex, idx) => (
                                                <div key={idx} className="wizard-exercise-row" style={{ padding: '8px', background: '#0d0d1a', borderRadius: '4px', marginBottom: '6px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0' }}>
                                                        <span style={{ color: '#b8b8d0', flex: '1' }}>{idx + 1}. {ex.name}</span>
                                                        <button
                                                            onClick={() => moveExercise(selectedDay, idx, 'up')}
                                                            disabled={idx === 0}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: idx === 0 ? '#0d0d1a' : '#1a1a2a',
                                                                border: '1px solid #2a2a3a',
                                                                borderRadius: '4px',
                                                                color: idx === 0 ? '#555' : '#8a8aa0',
                                                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                                                fontSize: '14px'
                                                            }}
                                                            title="Move up"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            onClick={() => moveExercise(selectedDay, idx, 'down')}
                                                            disabled={idx === currentDay.exercises.length - 1}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: idx === currentDay.exercises.length - 1 ? '#0d0d1a' : '#1a1a2a',
                                                                border: '1px solid #2a2a3a',
                                                                borderRadius: '4px',
                                                                color: idx === currentDay.exercises.length - 1 ? '#555' : '#8a8aa0',
                                                                cursor: idx === currentDay.exercises.length - 1 ? 'not-allowed' : 'pointer',
                                                                fontSize: '14px'
                                                            }}
                                                            title="Move down"
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            onClick={() => removeExercise(selectedDay, idx)}
                                                            style={{ background: 'none', border: 'none', color: '#8a5a5a', cursor: 'pointer', fontSize: '18px' }}
                                                            title="Remove exercise"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="wizard-exercise-inputs" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                                        {ex.isCardio ? (
                                                            <>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: validationErrors[`${selectedDay}-${idx}-intensity`] ? '#ff5555' : 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Intensity</span>
                                                                    <input
                                                                        type="text"
                                                                        value={ex.intensity || ''}
                                                                        onChange={(e) => {
                                                                            updateExerciseField(selectedDay, idx, 'intensity', e.target.value);
                                                                            // Clear validation error when user types
                                                                            if (validationErrors[`${selectedDay}-${idx}-intensity`]) {
                                                                                const newErrors = { ...validationErrors };
                                                                                delete newErrors[`${selectedDay}-${idx}-intensity`];
                                                                                setValidationErrors(newErrors);
                                                                            }
                                                                        }}
                                                                        placeholder="Level 7"
                                                                        style={{
                                                                            width: '100px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: validationErrors[`${selectedDay}-${idx}-intensity`] ? '2px solid #ff5555' : '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Intensity"
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: validationErrors[`${selectedDay}-${idx}-minutes`] ? '#ff5555' : 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Minutes</span>
                                                                    <input
                                                                        type="number"
                                                                        value={ex.minutes === '' ? '' : (ex.minutes || 0)}
                                                                        onChange={(e) => {
                                                                            updateExerciseField(selectedDay, idx, 'minutes', e.target.value);
                                                                            // Clear validation error when user types
                                                                            if (validationErrors[`${selectedDay}-${idx}-minutes`]) {
                                                                                const newErrors = { ...validationErrors };
                                                                                delete newErrors[`${selectedDay}-${idx}-minutes`];
                                                                                setValidationErrors(newErrors);
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                        min="0"
                                                                        style={{
                                                                            width: '50px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: validationErrors[`${selectedDay}-${idx}-minutes`] ? '2px solid #ff5555' : '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Minutes"
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Seconds</span>
                                                                    <input
                                                                        type="number"
                                                                        value={ex.seconds === '' ? '' : (ex.seconds || 0)}
                                                                        onChange={(e) => updateExerciseField(selectedDay, idx, 'seconds', e.target.value)}
                                                                        placeholder="0"
                                                                        min="0"
                                                                        max="59"
                                                                        style={{
                                                                            width: '50px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Seconds"
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Sets</span>
                                                                    <input
                                                                        type="number"
                                                                        value={ex.sets === '' ? '' : (ex.sets || 3)}
                                                                        onChange={(e) => updateExerciseField(selectedDay, idx, 'sets', e.target.value)}
                                                                        placeholder="Sets"
                                                                        style={{
                                                                            width: '60px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Sets"
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Min</span>
                                                                    <input
                                                                        type="number"
                                                                        value={ex.minReps === '' ? '' : (ex.minReps || 8)}
                                                                        onChange={(e) => updateExerciseField(selectedDay, idx, 'minReps', e.target.value)}
                                                                        placeholder="Min"
                                                                        style={{
                                                                            width: '60px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Minimum Reps"
                                                                    />
                                                                </div>
                                                                <span style={{ color: 'var(--accent-muted)', paddingBottom: '6px' }}>-</span>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Max</span>
                                                                    <input
                                                                        type="number"
                                                                        value={ex.maxReps === '' ? '' : (ex.maxReps || 12)}
                                                                        onChange={(e) => updateExerciseField(selectedDay, idx, 'maxReps', e.target.value)}
                                                                        placeholder="Max"
                                                                        style={{
                                                                            width: '60px',
                                                                            padding: '6px',
                                                                            background: '#1a1a2a',
                                                                            border: '2px solid #2a2a3a',
                                                                            borderRadius: '4px',
                                                                            color: '#b8b8d0',
                                                                            fontSize: '14px',
                                                                            textAlign: 'center',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        title="Maximum Reps"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Exercise input with dropdown */}
                                {currentDay && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--accent-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Add Exercise
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    list="exercise-suggestions"
                                                    className="input-field"
                                                    value={customExercise}
                                                    onChange={(e) => setCustomExercise(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && addExercise(customExercise)}
                                                    placeholder="Type or select exercise..."
                                                    style={{ marginBottom: 0 }}
                                                />
                                                <datalist id="exercise-suggestions">
                                                    {EXERCISE_WORD_BANK.map((exercise, idx) => (
                                                        <option key={idx} value={exercise} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <button
                                                onClick={() => addExercise(customExercise)}
                                                className="log-btn"
                                                disabled={!customExercise.trim()}
                                                style={{ padding: '12px 20px', width: 'auto' }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                    </div>

                    <div className="wizard-buttons">
                        <button className="wizard-btn secondary" onClick={onBack}>Back</button>
                        <button className="wizard-btn" onClick={handleContinue} disabled={!hasAtLeastOneExercise}>
                            Continue
                        </button>
                    </div>

                    {/* Example Modal */}
                    {showExample && (
                        <div className="modal-overlay" onClick={() => setShowExample(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                                <div className="modal-title">How It Works</div>
                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ color: '#b8b8d0', marginBottom: '16px', lineHeight: '1.6' }}>
                                        Name each workout day and add your exercises with target sets and rep ranges. Here's an example:
                                    </p>

                                    <div style={{ background: '#1a1a2a', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--accent-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Name this day (e.g., "Push", "Upper", "Chest & Back")
                                        </label>
                                        <div style={{ padding: '12px', background: '#0d0d1a', border: '1px solid #2a2a3a', borderRadius: '4px', color: '#b8b8d0', fontWeight: 600 }}>
                                            Push
                                        </div>
                                    </div>

                                    <div style={{ background: '#1a1a2a', borderRadius: '8px', padding: '16px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--accent-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Exercises (1)
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', marginBottom: '6px' }}>
                                            <span style={{ minWidth: '160px', flex: '0 0 auto', fontSize: '11px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exercise Name</span>
                                            <span style={{ width: '60px', fontSize: '11px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Sets</span>
                                            <span style={{ width: '60px', fontSize: '11px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Min</span>
                                            <span style={{ width: '10px' }}></span>
                                            <span style={{ width: '60px', fontSize: '11px', color: 'var(--accent-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Max</span>
                                        </div>
                                        <div style={{ background: '#0d0d1a', borderRadius: '4px', padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', background: '#050510', borderRadius: '4px' }}>
                                                <span style={{ color: '#b8b8d0', minWidth: '160px', flex: '0 0 auto', fontWeight: 600 }}>1. Bench Press</span>
                                                <div style={{ width: '60px', padding: '6px', background: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: '4px', color: '#b8b8d0', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>3</div>
                                                <div style={{ width: '60px', padding: '6px', background: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: '4px', color: '#b8b8d0', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>8</div>
                                                <span style={{ color: 'var(--accent-muted)' }}>-</span>
                                                <div style={{ width: '60px', padding: '6px', background: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: '4px', color: '#b8b8d0', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>12</div>
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ color: '#8a8aa0', marginTop: '16px', fontSize: '14px', fontStyle: 'italic' }}>
                                        This means: 3 sets of Bench Press, aiming for 8-12 reps per set.
                                    </p>
                                </div>

                                <button className="modal-btn" onClick={() => setShowExample(false)}>
                                    Got it!
                                </button>
                            </div>
                        </div>
                    )}
                </>
            );
        }

        function ConfirmStep({ schedule, workoutDays, onComplete, onBack }) {
            const uniqueDays = Array.from(new Set(schedule.workoutDays.map(d => d.workoutDayNumber))).sort();
            const totalExercises = Object.values(workoutDays).reduce((sum, day) => sum + day.exercises.length, 0);

            return (
                <>
                    <div className="wizard-header">
                        <div className="wizard-icon">🎉</div>
                        <h1 className="wizard-title">You're All Set!</h1>
                        <p className="wizard-subtitle">Here's your program summary</p>
                    </div>

                    <div className="wizard-progress">
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot completed"></div>
                        <div className="wizard-progress-dot active"></div>
                    </div>

                    <div className="wizard-content">
                        <div className="summary-section">
                            <div className="summary-label">Workout Days</div>
                            <div className="summary-value">{schedule.workoutDays.length} days per week</div>
                            <div style={{ fontSize: '14px', color: '#8a8aa0', marginTop: '4px' }}>
                                {schedule.workoutDays.map(d => {
                                    const dayName = workoutDays[d.workoutDayNumber]?.name || `Day ${d.workoutDayNumber}`;
                                    return `${d.dayOfWeek.substring(0, 3)} (${dayName})`;
                                }).join(', ')}
                            </div>
                        </div>

                        <div className="summary-section">
                            <div className="summary-label">Your Workouts</div>
                            {uniqueDays.map(dayNum => {
                                const day = workoutDays[dayNum];
                                return (
                                    <div key={dayNum} style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#b8b8d0' }}>
                                            {day.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8a8aa0' }}>
                                            {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="summary-section">
                            <div className="summary-label">Total Exercises</div>
                            <div className="summary-value">{totalExercises} exercises</div>
                        </div>

                        <div style={{ fontSize: '14px', color: 'var(--accent-muted)', marginTop: '20px', lineHeight: '1.6' }}>
                            You can customize exercise order and exercise names anytime in Settings ⚙️
                        </div>
                    </div>

                    <div className="wizard-buttons">
                        <button className="wizard-btn secondary" onClick={onBack}>Back</button>
                        <button className="wizard-btn" onClick={onComplete}>Start Tracking!</button>
                    </div>
                </>
            );
        }
