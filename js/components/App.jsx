        const { useState, useEffect, useRef, useMemo } = React;
        // ============================================================================
        // APP COMPONENT
        // ============================================================================

        function App() {
            const [currentView, setCurrentView] = useState('workout');
            const [currentDay, setCurrentDay] = useState(1);
            const [workoutData, setWorkoutData] = useState({});
            const [loggedExercises, setLoggedExercises] = useState({});
            const [workoutHistory, setWorkoutHistory] = useState([]);
            const [showSuccess, setShowSuccess] = useState(false);
            const [successMessage, setSuccessMessage] = useState('');
            const [exercisesByDay, setExercisesByDay] = useState({});
            const [schedule, setSchedule] = useState(null);
            const [exerciseCategories, setExerciseCategories] = useState([]);
            const [prTracking, setPrTracking] = useState(false);
            const [advancedPrTracking, setAdvancedPrTracking] = useState(false);
            const [minimalistPrTracking, setMinimalistPrTracking] = useState(false);
            // { min, max } turns the standard card's free-type Reps field into a
            // dropdown of that inclusive range. null = free-type (everyone else).
            const [repsDropdown, setRepsDropdown] = useState(null);
            const [expandedWeightBreakdown, setExpandedWeightBreakdown] = useState(null);
            const [selectedExercise, setSelectedExercise] = useState('');
            const [celebration, setCelebration] = useState(null);
            const [showSettings, setShowSettings] = useState(false);
            const [showBackupReminder, setShowBackupReminder] = useState(false);
            const [showTutorial, setShowTutorial] = useState(false);
            const [showDayBreakdown, setShowDayBreakdown] = useState(false);
            const [showEditWorkout, setShowEditWorkout] = useState(false);
            const [editingWorkout, setEditingWorkout] = useState(null);
            const [viewingWeek, setViewingWeek] = useState(1);
            const [showWizard, setShowWizard] = useState(false);
            const [fieldErrors, setFieldErrors] = useState({});
            const [hydrated, setHydrated] = useState(false);
            const [showSyncPrompt, setShowSyncPrompt] = useState(false);
            const currentWeek = useMemo(() => getCurrentWeek(workoutHistory), [workoutHistory]);
            const hasMigratedWeeks = useRef(false);

            useEffect(() => {
                window.repoReady.then((repo) => {
                // Legacy localStorage-era migrations. Only meaningful in local
                // mode: cloud data is imported post-migration, and a fresh
                // device must not re-run one-shots just because its own
                // localStorage lacks the sentinel flags. They reshape the
                // stored keys, so they run before loadAll reads them.
                if (repo.mode === 'local') {
                // Migrate existing data to namespaced storage (one-time for existing users)
                migrateToNamespacedStorage();

                // One-shot Anterior/Posterior migration for Jessi's PPL data
                migrateJessiToAnteriorPosterior();

                // One-shot Torso/Limbs migration for Jessi's Anterior/Posterior data
                migrateJessiToFullBody();

                // One-shot auto-enable of the 5-8 reps dropdown for Jessi
                enableRepsDropdownForJessi();

                // Check if setup is completed
                const setupCompleted = storage.getItem('gymSetupCompleted');

                if (!setupCompleted) {
                    // Check if user has existing data
                    const hasHistory = storage.getItem('gymWorkoutHistory');
                    const hasConfig = storage.getItem('gymExerciseConfig');

                    if (hasHistory || hasConfig) {
                        // Existing user - auto-migrate
                        migrateExerciseConfig();
                        migrateWorkoutHistory();
                        createDefaultSchedule();

                        // Mark setup as completed
                        storage.setItem('gymSetupCompleted', JSON.stringify({
                            version: 1,
                            completed: true,
                            completedAt: new Date().toISOString(),
                            migrated: true
                        }));
                    } else {
                        // New user - show wizard
                        setShowWizard(true);
                        setHydrated(true);
                        return; // Don't load data yet
                    }
                }
                }

                return repo.loadAll().then(({ workoutHistory: savedHistory, exerciseConfig: savedConfig, scheduleConfig: savedSchedule, setupCompleted: savedSetup }) => {
                // Cloud mode, nothing set up yet (brand-new client on a fresh
                // device): run the wizard; its saves sync through the repo.
                if (repo.mode !== 'local' && !savedSetup) {
                    setShowWizard(true);
                    setHydrated(true);
                    return;
                }

                // Load workout history
                if (savedHistory) {
                    setWorkoutHistory(savedHistory);
                }

                // Load workout schedule
                if (savedSchedule) {
                    setSchedule(savedSchedule);
                }

                // Load custom exercise configurations
                if (savedConfig) {
                    // Aug 2026: split Full Body into Upper/Lower, and apply any
                    // later code-side reorder on top. Runs in BOTH modes: on a
                    // signed-in device this is the only path that can change
                    // the program, since the legacy sentinel migrations above
                    // are gated on repo.mode === 'local'. Needs the loaded
                    // history so returning movements reclaim their original ids.
                    const split = migrateJessiSplit(savedConfig, savedHistory, savedSchedule);
                    if (split) {
                        savedConfig = split.config;
                        repo.saveExerciseConfig(split.config);
                        if (split.schedule) {
                            repo.saveScheduleConfig(split.schedule);
                            setSchedule(split.schedule);
                        }
                        console.log('[Jessi Upper/Lower] applied; recovered ids:', split.recoveredIds);
                    }

                    const config = savedConfig;

                    // Check for version 2 format (from wizard)
                    if (config.version === 2 && config.days) {
                        // Sort exercises in each day by order
                        const sortedDays = {};
                        Object.keys(config.days).forEach(dayNum => {
                            sortedDays[dayNum] = config.days[dayNum].sort((a, b) => a.order - b.order);
                        });
                        setExercisesByDay(sortedDays);

                        // Set first exercise as selected for progress view
                        const allExercises = Object.values(sortedDays).flat();
                        if (allExercises.length > 0 && !selectedExercise) {
                            setSelectedExercise(allExercises[0].id);
                        }

                        if (config.categories) {
                            setExerciseCategories(config.categories);
                        }

                        // Load prTracking flags
                        if (config.prTracking !== undefined) {
                            setPrTracking(config.prTracking);
                        }
                        if (config.advancedPrTracking !== undefined) {
                            setAdvancedPrTracking(config.advancedPrTracking);
                        }
                        if (config.minimalistPrTracking !== undefined) {
                            setMinimalistPrTracking(config.minimalistPrTracking);
                        }
                        if (config.repsDropdown !== undefined) {
                            setRepsDropdown(config.repsDropdown);
                        }
                    }
                    // Fallback to old format for backward compatibility
                    else if (config.day1 || config.day2) {
                        const days = {};
                        if (config.day1) {
                            days[1] = config.day1.sort((a, b) => a.order - b.order);
                        }
                        if (config.day2) {
                            days[2] = config.day2.sort((a, b) => a.order - b.order);
                        }
                        setExercisesByDay(days);

                        // Set first exercise as selected for progress view
                        const allExercises = Object.values(days).flat();
                        if (allExercises.length > 0 && !selectedExercise) {
                            setSelectedExercise(allExercises[0].id);
                        }
                    }
                }

                // Check last backup reminder (monthly only, not on first time)
                const lastReminder = storage.getItem('lastBackupReminder');
                const now = new Date().getTime();
                const oneMonth = 30 * 24 * 60 * 60 * 1000;

                if (lastReminder && (now - parseInt(lastReminder)) > oneMonth) {
                    setShowBackupReminder(true);
                }

                // Cloud sync available, signed out, and setup already complete
                // (reaching here means the wizard was passed — i.e. a coached
                // or established user, not a passing visitor): offer sign-in
                // once, dismissible, never blocking the workout flow.
                if (window.FIREBASE_READY && repo.mode === 'local' &&
                    !storage.getItem('syncPromptDismissed')) {
                    setShowSyncPrompt(true);
                }

                setHydrated(true);
                });
                });
            }, []);

            // Update viewing week and migrate workout history when it loads
            useEffect(() => {
                if (workoutHistory.length > 0 && !hasMigratedWeeks.current) {
                    // Clear the cached first workout Monday to recalculate based on actual data
                    storage.removeItem('firstWorkoutMonday');

                    // Recalculate and migrate week numbers for all workouts
                    const migratedHistory = workoutHistory.map(workout => ({
                        ...workout,
                        week: getWeekNumber(workout.date, workoutHistory)
                    }));

                    // Only update if week numbers actually changed
                    const hasChanges = migratedHistory.some((workout, idx) =>
                        workout.week !== workoutHistory[idx].week
                    );

                    if (hasChanges) {
                        setWorkoutHistory(migratedHistory);
                        window.repo.saveHistory(migratedHistory);
                    }

                    // Set viewing week to current week
                    setViewingWeek(currentWeek);

                    // Mark migration as complete
                    hasMigratedWeeks.current = true;
                }
            }, [workoutHistory.length, currentWeek]); // Run when history loads or length changes

            // Pick the day to open on when the schedule loads.
            //
            // For an EXPLICIT weekday schedule, prefer whatever today maps to,
            // so a program like Upper on Tue/Thu/Sat actually opens on Upper
            // on a Tuesday. The old behavior always took workoutDays[0], which
            // meant a two-day split opened on whichever day happened to be
            // listed first regardless of the date.
            //
            // Non-explicit schedules keep the first-entry behavior unchanged,
            // as do explicit ones on a non-training day.
            useEffect(() => {
                if (schedule && schedule.workoutDays && schedule.workoutDays.length > 0) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                                      'Thursday', 'Friday', 'Saturday'];
                    const todayName = dayNames[new Date().getDay()];
                    const todayEntry = schedule.scheduleIsExplicit
                        ? schedule.workoutDays.find(wd => wd.dayOfWeek === todayName)
                        : null;
                    setCurrentDay(todayEntry
                        ? todayEntry.workoutDayNumber
                        : schedule.workoutDays[0].workoutDayNumber);
                }
            }, [schedule]);

            // Restore logged state and workout data from today's workout
            useEffect(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayWorkout = workoutHistory.find(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    return isSameDay && isSameWorkoutDay;
                });

                if (todayWorkout && !todayWorkout.submitted) {
                    // Only restore state if workout hasn't been submitted yet
                    const newLoggedExercises = {};
                    const newWorkoutData = {};

                    todayWorkout.exercises.forEach(exercise => {
                        let hasData = false;

                        if (exercise.type === 'assault-bike') {
                            hasData = exercise.rounds && exercise.rounds.trim() !== '';
                        } else if (exercise.type === 'stairmaster') {
                            hasData = exercise.time && exercise.time.trim() !== '';
                        } else if (exercise.isCardio || exercise.type === 'cardio') {
                            hasData = (exercise.intensity && exercise.intensity.trim() !== '') ||
                                      (exercise.minutes && exercise.minutes > 0) ||
                                      (exercise.seconds && exercise.seconds > 0);
                        } else if (exercise.type === 'bodyweight') {
                            hasData = exercise.reps && exercise.reps.toString().trim() !== '';
                        } else {
                            hasData = (exercise.weight && exercise.weight.toString().trim() !== '') ||
                                      (exercise.reps && exercise.reps.toString().trim() !== '');
                        }

                        if (hasData) {
                            newLoggedExercises[exercise.id] = true;

                            if (exercise.type === 'assault-bike') {
                                newWorkoutData[exercise.id] = { rounds: exercise.rounds };
                            } else if (exercise.type === 'stairmaster') {
                                newWorkoutData[exercise.id] = { time: exercise.time, level: exercise.level || 'Level 7' };
                            } else if (exercise.isCardio || exercise.type === 'cardio') {
                                newWorkoutData[exercise.id] = {
                                    intensity: exercise.intensity,
                                    minutes: exercise.minutes,
                                    seconds: exercise.seconds
                                };
                            } else if (exercise.type === 'bodyweight') {
                                newWorkoutData[exercise.id] = { reps: exercise.reps };
                            } else {
                                newWorkoutData[exercise.id] = {
                                    weight: exercise.weight,
                                    reps: exercise.reps
                                };
                            }
                        }
                    });

                    setLoggedExercises(newLoggedExercises);
                    setWorkoutData(newWorkoutData);
                } else {
                    // Clear logged state if switching to a day with no workout or if workout is submitted
                    setLoggedExercises({});
                    setWorkoutData({});
                }
            }, [workoutHistory, currentDay]);

            const getCurrentExercises = () => {
                return exercisesByDay[currentDay] || [];
            };

            const getTodayWorkout = () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return workoutHistory.find(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    return isSameDay && isSameWorkoutDay;
                });
            };

            const isWorkoutSubmitted = () => {
                const todayWorkout = getTodayWorkout();
                return todayWorkout && todayWorkout.submitted;
            };

            // Build a full exercise-config payload, carrying forward any tracking flags
            // stored alongside the config so they survive writes from rename/reorder/etc.
            const buildExerciseConfig = (days) => {
                const existingRaw = storage.getItem('gymExerciseConfig');
                const existing = existingRaw ? (() => { try { return JSON.parse(existingRaw); } catch (e) { return {}; } })() : {};
                return {
                    ...existing,
                    version: 2,
                    days,
                    categories: exerciseCategories,
                    prTracking,
                    advancedPrTracking,
                    minimalistPrTracking,
                    repsDropdown
                };
            };

            const saveExerciseConfig = () => {
                window.repo.saveExerciseConfig(buildExerciseConfig(exercisesByDay));
            };

            const updateExerciseName = (day, exerciseId, newName, additionalProps = {}) => {
                setExercisesByDay(prev => {
                    const updated = {
                        ...prev,
                        [day]: prev[day].map(ex =>
                            ex.id === exerciseId ? { ...ex, name: newName, ...additionalProps } : ex
                        )
                    };
                    window.repo.saveExerciseConfig(buildExerciseConfig(updated));
                    return updated;
                });
            };

            const moveExercise = (day, exerciseId, direction) => {
                const exercises = exercisesByDay[day] || [];
                const currentIndex = exercises.findIndex(ex => ex.id === exerciseId);

                if (direction === 'up' && currentIndex === 0) return;
                if (direction === 'down' && currentIndex === exercises.length - 1) return;

                const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                const reordered = [...exercises];
                [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

                // Update order values
                const updated = reordered.map((ex, idx) => ({ ...ex, order: idx }));

                setExercisesByDay(prev => {
                    const updatedDays = {
                        ...prev,
                        [day]: updated
                    };
                    window.repo.saveExerciseConfig(buildExerciseConfig(updatedDays));
                    return updatedDays;
                });
            };

            const getPreviousWorkout = (exerciseId) => {
                if (workoutHistory.length === 0) return null;

                // Collect all sessions that included this exercise (regardless of NA status)
                const lastThreeSessions = [];
                for (let workout of workoutHistory) {
                    const exercise = workout.exercises.find(e => e.id === exerciseId);
                    if (exercise) {
                        lastThreeSessions.push(exercise);
                    }
                }

                // From those, find the most recent one with actual data (non-NA)
                for (let exercise of lastThreeSessions) {
                    let hasData = false;
                    if (exercise.type === 'assault-bike') {
                        hasData = exercise.rounds && exercise.rounds.trim() !== '';
                    } else if (exercise.type === 'stairmaster') {
                        hasData = exercise.time && exercise.time.trim() !== '';
                    } else if (exercise.isCardio || exercise.type === 'cardio') {
                        // For cardio, check that total time is > 0 (not just "0:00")
                        const totalSeconds = ((exercise.minutes || 0) * 60) + (exercise.seconds || 0);
                        hasData = totalSeconds > 0;
                    } else if (exercise.type === 'bodyweight') {
                        hasData = exercise.reps && exercise.reps.toString().trim() !== '';
                    } else {
                        hasData = (exercise.weight && exercise.weight.toString().trim() !== '') ||
                                  (exercise.reps && exercise.reps.toString().trim() !== '');
                    }

                    if (hasData) {
                        return exercise;
                    }
                }

                return null;
            };

            const handleInputChange = (exerciseId, field, value) => {
                setWorkoutData(prev => ({
                    ...prev,
                    [exerciseId]: {
                        ...prev[exerciseId],
                        [field]: value
                    }
                }));

                // Clear validation error for this field when user types
                const errorKey = `${exerciseId}-${field}`;
                if (fieldErrors[errorKey]) {
                    setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[errorKey];
                        return newErrors;
                    });
                }
            };

            const logExercise = (exerciseId) => {
                const exercise = getCurrentExercises().find(e => e.id === exerciseId);
                let data = workoutData[exerciseId] || {};

                // Capture the reps dropdown's pre-selected value when the user
                // never touched it. The <select> always displays something, but
                // workoutData only gets a value on change — without this, a
                // one-tap LOG fails reps validation against a visibly filled
                // field. Runs before the weight capture below, which is gated on
                // data.reps. No-op for the free-type input (no such <select>).
                if (!data.reps) {
                    const card = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
                    const repsSelect = card && card.querySelector('select[data-field="reps"]');
                    if (repsSelect && repsSelect.value) {
                        data = { ...data, reps: repsSelect.value };
                    }
                }

                // Capture auto-filled weight if user didn't manually enter it
                if ((exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio')) && !data.weight && data.reps) {
                    // Find the weight input field for this exercise and read its displayed value
                    const exerciseCard = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
                    if (exerciseCard) {
                        // Find the weight input (it's the first number input with inputmode="decimal")
                        const weightInput = exerciseCard.querySelector('input[type="number"][inputmode="decimal"]');
                        if (weightInput && weightInput.value) {
                            data = { ...data, weight: weightInput.value };
                        }
                    }
                }

                // Validate data based on exercise type and set field errors
                const errors = {};

                // For standard exercises, validate weight and reps
                if (exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio')) {
                    if (!data.weight || data.weight.toString().trim() === '') {
                        errors[`${exerciseId}-weight`] = true;
                    }
                    if (!data.reps || data.reps.toString().trim() === '') {
                        errors[`${exerciseId}-reps`] = true;
                    }

                    // If there are validation errors, set them and return
                    if (Object.keys(errors).length > 0) {
                        setFieldErrors(errors);
                        return;
                    }
                }

                if (exercise.type === 'assault-bike' && !data.rounds) return;
                if (exercise.type === 'stairmaster' && !data.time) return;
                if (exercise.type === 'bodyweight' && !data.reps) return;
                if (exercise.isCardio || exercise.typeId === 'cardio') {
                    // Check if minutes is filled (required)
                    if (!data.minutes || data.minutes === 0) {
                        errors[`${exerciseId}-minutes`] = true;
                        setFieldErrors(errors);
                        return;
                    }

                    // For intensity, check if there's a default available (from previous workout or exercise config)
                    const previous = getPreviousWorkout(exerciseId);
                    const hasIntensity = (data.intensity && data.intensity.trim()) ||
                                        (previous && previous.intensity && previous.intensity.trim()) ||
                                        (exercise.intensity && exercise.intensity.trim());
                    if (!hasIntensity) return;
                }

                let finalData = { ...data };

                const timestamp = new Date().toISOString();
                finalData.timestamp = timestamp;

                // Update workoutData with final data
                setWorkoutData(prev => ({
                    ...prev,
                    [exerciseId]: finalData
                }));

                // Find if there's already a workout for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayWeek = getWeekNumber(today, workoutHistory);

                let existingWorkoutIndex = workoutHistory.findIndex(w => {
                    const workoutDate = new Date(w.date);
                    workoutDate.setHours(0, 0, 0, 0);
                    const isSameDay = workoutDate.getTime() === today.getTime();
                    const isSameWorkoutDay = w.day === currentDay;
                    const isNotSubmitted = !w.submitted;
                    return isSameDay && isSameWorkoutDay && isNotSubmitted;
                });

                // Create exercise object to save
                let exerciseToSave;
                if (exercise.type === 'assault-bike') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        intensity: '30/30',
                        rounds: finalData.rounds || ''
                    };
                } else if (exercise.type === 'stairmaster') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        level: finalData.level || 'Level 7',
                        time: finalData.time || ''
                    };
                } else if (exercise.isCardio || exercise.typeId === 'cardio') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: 'cardio',
                        isCardio: true,
                        intensity: finalData.intensity !== undefined ? finalData.intensity : (exercise.intensity || ''),
                        minutes: finalData.minutes !== undefined ? finalData.minutes : (exercise.minutes || 0),
                        seconds: finalData.seconds !== undefined ? finalData.seconds : (exercise.seconds || 0)
                    };
                } else if (exercise.type === 'bodyweight') {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        weight: 'Body Weight',
                        reps: finalData.reps || '',
                        minReps: exercise.minReps,
                        maxReps: exercise.maxReps
                    };
                } else {
                    exerciseToSave = {
                        id: exercise.id,
                        name: exercise.name,
                        category: exercise.category,
                        type: exercise.type,
                        weight: finalData.weight || '',
                        reps: finalData.reps || '',
                        minReps: exercise.minReps,
                        maxReps: exercise.maxReps
                    };
                }

                let updatedHistory;
                if (existingWorkoutIndex !== -1) {
                    // Update existing workout
                    updatedHistory = [...workoutHistory];
                    const workout = updatedHistory[existingWorkoutIndex];
                    const exerciseIndex = workout.exercises.findIndex(e => e.id === exerciseId);

                    if (exerciseIndex !== -1) {
                        workout.exercises[exerciseIndex] = exerciseToSave;
                    } else {
                        workout.exercises.push(exerciseToSave);
                    }

                    workout.date = timestamp; // Update to latest timestamp
                } else {
                    // Create new workout with all exercises initialized to NA
                    const allExercises = getCurrentExercises().map(ex => {
                        if (ex.id === exerciseId) {
                            return exerciseToSave;
                        } else {
                            // Initialize as NA
                            if (ex.type === 'assault-bike') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    intensity: '30/30',
                                    rounds: ''
                                };
                            } else if (ex.type === 'stairmaster') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    level: 'Level 7',
                                    time: ''
                                };
                            } else if (ex.isCardio || ex.typeId === 'cardio') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: 'cardio',
                                    isCardio: true,
                                    intensity: '',
                                    minutes: 0,
                                    seconds: 0
                                };
                            } else if (ex.type === 'bodyweight') {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    weight: 'Body Weight',
                                    reps: ''
                                };
                            } else {
                                return {
                                    id: ex.id,
                                    name: ex.name,
                                    category: ex.category,
                                    type: ex.type,
                                    weight: '',
                                    reps: ''
                                };
                            }
                        }
                    });

                    const newWorkout = {
                        date: timestamp,
                        day: currentDay,
                        week: todayWeek,
                        exercises: allExercises,
                        submitted: false
                    };

                    updatedHistory = [newWorkout, ...workoutHistory];
                }

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);

                setLoggedExercises(prev => ({
                    ...prev,
                    [exerciseId]: true
                }));

                setSuccessMessage('Exercise logged!');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            };

            const completeDay = () => {
                // Find today's workout
                const todayWorkout = getTodayWorkout();

                if (!todayWorkout) {
                    alert('Please log at least one exercise first!');
                    return;
                }

                // Detect plateau busters for advancedPrTracking
                let plateauBusters = [];
                if (advancedPrTracking) {
                    // Helper: find previous valid submitted workout data for an exercise
                    const findPreviousValidExercise = (exerciseId) => {
                        const previousWorkouts = workoutHistory
                            .filter(w => {
                                if (w.date === todayWorkout.date) return false;
                                if (!w.submitted) return false;
                                return true;
                            })
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 5);
                        for (const workout of previousWorkouts) {
                            const ex = workout.exercises.find(e => e.id === exerciseId);
                            if (ex && ex.reps && ex.reps !== 'NA' &&
                                (ex.type === 'bodyweight' || (ex.weight && ex.weight !== 'NA'))) {
                                return ex;
                            }
                        }
                        return null;
                    };

                    todayWorkout.exercises.forEach(exercise => {
                        if ((exercise.type === 'standard' || exercise.type === 'bodyweight' ||
                            (!exercise.type && !exercise.isCardio)) &&
                            exercise.reps && exercise.reps !== 'NA') {
                            const reps = parseInt(exercise.reps);
                            if (isNaN(reps)) return;

                            const exMinReps = exercise.minReps || 6;
                            const exMaxReps = exercise.maxReps || 8;

                            // Rule 1: below minReps — always plateau buster
                            if (reps < exMinReps) {
                                plateauBusters.push(exercise.id);
                                return;
                            }

                            // Rule 2: in the rep range (minReps to maxReps-1) — plateau buster only if stagnating
                            if (reps >= exMinReps && reps < exMaxReps) {
                                // Don't chain plateau busters — skip if previous session already had one
                                const prevWorkoutWithPlateau = workoutHistory
                                    .filter(w => {
                                        if (w.date === todayWorkout.date) return false;
                                        if (!w.submitted) return false;
                                        const ex = w.exercises.find(e => e.id === exercise.id);
                                        return ex && ex.reps && ex.reps !== 'NA';
                                    })
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                                if (prevWorkoutWithPlateau?.plateauBusters?.includes(exercise.id)) return;

                                const previousExercise = findPreviousValidExercise(exercise.id);
                                if (previousExercise) {
                                    const previousReps = parseInt(previousExercise.reps) || 0;
                                    if (exercise.type === 'bodyweight') {
                                        if (reps <= previousReps) plateauBusters.push(exercise.id);
                                    } else {
                                        const currentWeight = parseFloat(exercise.weight) || 0;
                                        const previousWeight = parseFloat(previousExercise.weight) || 0;
                                        if (currentWeight <= previousWeight && reps <= previousReps) {
                                            plateauBusters.push(exercise.id);
                                        }
                                    }
                                }
                            }
                            // Rule 3: reps >= maxReps — PR, no plateau buster
                        }
                    });
                }

                // Mark workout as submitted (immutable) and save plateau busters
                const updatedHistory = workoutHistory.map(w => {
                    if (w === todayWorkout) {
                        return { ...w, submitted: true, plateauBusters };
                    }
                    return w;
                });

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);

                // Reset all log states so exercises act like a fresh day
                setLoggedExercises({});
                setWorkoutData({});

                setShowDayBreakdown(true);
            };

            const updateWorkout = (workoutDate, updatedExercises) => {
                const updatedHistory = workoutHistory.map(w => {
                    if (w.date === workoutDate) {
                        return { ...w, exercises: updatedExercises };
                    }
                    return w;
                });

                setWorkoutHistory(updatedHistory);
                window.repo.saveHistory(updatedHistory);
                setSuccessMessage('Workout updated!');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            };

            const exportData = () => {
                const exportObj = {
                    workoutHistory,
                    exerciseConfig: buildExerciseConfig(exercisesByDay),
                    schedule: schedule,
                    exportDate: new Date().toISOString()
                };
                const dataStr = JSON.stringify(exportObj, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `gym-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
            };

            const importData = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);

                        // Handle old format (just workout history array) or new format (object with configs)
                        if (Array.isArray(imported)) {
                            // Old format
                            setWorkoutHistory(imported);
                            window.repo.saveHistory(imported);
                        } else {
                            // New format
                            if (imported.workoutHistory) {
                                setWorkoutHistory(imported.workoutHistory);
                                window.repo.saveHistory(imported.workoutHistory);
                            }
                            if (imported.schedule) {
                                setSchedule(imported.schedule);
                                window.repo.saveScheduleConfig(imported.schedule);
                            }
                            if (imported.exerciseConfig) {
                                // Check for version 2 format
                                if (imported.exerciseConfig.version === 2 && imported.exerciseConfig.days) {
                                    const sortedDays = {};
                                    Object.keys(imported.exerciseConfig.days).forEach(dayNum => {
                                        sortedDays[dayNum] = imported.exerciseConfig.days[dayNum].sort((a, b) => a.order - b.order);
                                    });
                                    setExercisesByDay(sortedDays);
                                    if (imported.exerciseConfig.categories) {
                                        setExerciseCategories(imported.exerciseConfig.categories);
                                    }
                                }
                                // Fallback to old format
                                else if (imported.exerciseConfig.day1 || imported.exerciseConfig.day2) {
                                    const days = {};
                                    if (imported.exerciseConfig.day1) {
                                        days[1] = imported.exerciseConfig.day1.sort((a, b) => a.order - b.order);
                                    }
                                    if (imported.exerciseConfig.day2) {
                                        days[2] = imported.exerciseConfig.day2.sort((a, b) => a.order - b.order);
                                    }
                                    setExercisesByDay(days);
                                }
                                // Restore tracking flags into state
                                if (imported.exerciseConfig.prTracking !== undefined) {
                                    setPrTracking(imported.exerciseConfig.prTracking);
                                }
                                if (imported.exerciseConfig.advancedPrTracking !== undefined) {
                                    setAdvancedPrTracking(imported.exerciseConfig.advancedPrTracking);
                                }
                                if (imported.exerciseConfig.minimalistPrTracking !== undefined) {
                                    setMinimalistPrTracking(imported.exerciseConfig.minimalistPrTracking);
                                }
                                if (imported.exerciseConfig.repsDropdown !== undefined) {
                                    setRepsDropdown(imported.exerciseConfig.repsDropdown);
                                }
                                window.repo.saveExerciseConfig(imported.exerciseConfig);
                            }
                        }

                        setSuccessMessage('Data imported successfully!');
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 3000);
                        setShowSettings(false);
                    } catch (error) {
                        alert('Invalid backup file');
                    }
                };
                reader.readAsText(file);
            };

            const resetData = () => {
                if (confirm('ARE YOU VERY SURE? This will delete ALL your workout data AND exercise customizations permanently. This cannot be undone!')) {
                    if (confirm('FINAL WARNING: All your progress and custom exercise names/order will be lost forever. Continue?')) {
                        window.repo.clearAll();
                        storage.removeItem('lastBackupReminder');
                        storage.removeItem('hasSeenTutorial');
                        // Every one-shot gate, not just the oldest one. These
                        // self-gate on a flag, so leaving any of them set means
                        // a post-reset install (e.g. re-entering a coach code)
                        // silently never gets that feature back.
                        storage.removeItem('jessiAPMigrationApplied');
                        storage.removeItem('jessiFullBodyMigrationApplied5');
                        storage.removeItem('jessiFullBodyMigrationApplied4');
                        storage.removeItem('jessiFullBodyMigrationApplied3');
                        storage.removeItem('jessiFullBodyMigrationApplied2');
                        storage.removeItem('jessiFullBodyMigrationApplied1');
                        storage.removeItem('jessiRepsDropdownEnabled');
                        setWorkoutHistory([]);
                        setWorkoutData({});
                        setLoggedExercises({});
                        setExercisesByDay({});
                        setSchedule(null);
                        setExerciseCategories([]);
                        setPrTracking(false);
                        setAdvancedPrTracking(false);
                        setMinimalistPrTracking(false);
                        setRepsDropdown(null);
                        setShowSettings(false);
                        setShowWizard(true); // Show wizard after reset
                    }
                }
            };

            const dismissBackupReminder = () => {
                storage.setItem('lastBackupReminder', new Date().getTime().toString());
                setShowBackupReminder(false);

                // Show tutorial on first time
                const hasSeenTutorial = storage.getItem('hasSeenTutorial');
                if (!hasSeenTutorial) {
                    setShowTutorial(true);
                }
            };

            const dismissTutorial = () => {
                storage.setItem('hasSeenTutorial', 'true');
                setShowTutorial(false);
            };

            // Storage not read yet: render nothing rather than a flash of
            // default state (avoids acting on data that is about to change).
            if (!hydrated) {
                return <div className="app" />;
            }

            return (
                <div className="app">
                    {showWizard && (
                        <SetupWizard
                            onComplete={() => {
                                // Load data directly instead of reloading page for instant transition
                                const savedSchedule = storage.getItem('gymScheduleConfig');
                                if (savedSchedule) {
                                    setSchedule(JSON.parse(savedSchedule));
                                }

                                const savedExercises = storage.getItem('gymExerciseConfig');
                                if (savedExercises) {
                                    const config = JSON.parse(savedExercises);
                                    if (config.version === 2 && config.days) {
                                        const sortedDays = {};
                                        Object.keys(config.days).forEach(dayNum => {
                                            sortedDays[dayNum] = config.days[dayNum].sort((a, b) => a.order - b.order);
                                        });
                                        setExercisesByDay(sortedDays);

                                        const allExercises = Object.values(sortedDays).flat();
                                        if (allExercises.length > 0 && !selectedExercise) {
                                            setSelectedExercise(allExercises[0].id);
                                        }

                                        if (config.categories) {
                                            setExerciseCategories(config.categories);
                                        }

                                        if (config.prTracking !== undefined) {
                                            setPrTracking(config.prTracking);
                                        }
                                        if (config.advancedPrTracking !== undefined) {
                                            setAdvancedPrTracking(config.advancedPrTracking);
                                        }
                                        if (config.minimalistPrTracking !== undefined) {
                                            setMinimalistPrTracking(config.minimalistPrTracking);
                                        }
                                        if (config.repsDropdown !== undefined) {
                                            setRepsDropdown(config.repsDropdown);
                                        }
                                    }
                                }

                                // Show tutorial for new users (both custom and coaching programs)
                                const hasSeenTutorial = storage.getItem('hasSeenTutorial');
                                if (!hasSeenTutorial) {
                                    setShowTutorial(true);
                                }

                                setShowWizard(false);
                            }}
                        />
                    )}

                    {showSyncPrompt && !showWizard && (
                        <div style={{
                            background: '#1a1a2a',
                            border: '1px solid var(--accent)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            margin: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '14px'
                        }}>
                            <span style={{ flex: 1 }}>☁️ Sign in to sync your workouts across devices</span>
                            <button
                                onClick={() => window.repoSignIn()}
                                style={{
                                    padding: '6px 10px', background: 'var(--accent)', border: 'none',
                                    borderRadius: '4px', color: '#b8b8d0', cursor: 'pointer'
                                }}
                            >
                                Sign in
                            </button>
                            <button
                                onClick={() => {
                                    storage.setItem('syncPromptDismissed', 'true');
                                    setShowSyncPrompt(false);
                                }}
                                style={{
                                    padding: '6px 10px', background: 'transparent',
                                    border: '1px solid #2a2a3a', borderRadius: '4px',
                                    color: '#8a8aa0', cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    {showSuccess && <div className={`success-message ${showBackupReminder ? 'backup-reminder' : ''}`}>{successMessage}</div>}

                    {showBackupReminder && (
                        <BackupReminderModal
                            onExport={() => { exportData(); dismissBackupReminder(); }}
                            onDismiss={dismissBackupReminder}
                        />
                    )}

                    {showTutorial && (
                        <TutorialModal onDismiss={dismissTutorial} />
                    )}

                    {showSettings && (
                        <SettingsModal
                            onClose={() => setShowSettings(false)}
                            onExport={exportData}
                            onImport={importData}
                            onReset={resetData}
                            exercisesByDay={exercisesByDay}
                            updateExerciseName={updateExerciseName}
                            moveExercise={moveExercise}
                            schedule={schedule}
                        />
                    )}

                    {showDayBreakdown && (
                        <DayBreakdownModal
                            onClose={() => setShowDayBreakdown(false)}
                            workoutHistory={workoutHistory}
                            currentDay={currentDay}
                            getCurrentExercises={getCurrentExercises}
                            getPreviousWorkout={getPreviousWorkout}
                        />
                    )}

                    {showEditWorkout && editingWorkout && (
                        <EditWorkoutModal
                            workout={editingWorkout}
                            onClose={() => {
                                setShowEditWorkout(false);
                                setEditingWorkout(null);
                            }}
                            onSave={updateWorkout}
                            exercisesByDay={exercisesByDay}
                        />
                    )}

                    <div className="header">
                        <div className="header-top">
                            <h1>Gym Tracker</h1>
                            <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
                        </div>
                        <div className="week-indicator">Week {currentWeek}</div>
                        <div className="nav">
                            <button
                                className={`nav-btn ${currentView === 'workout' ? 'active' : ''}`}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('workout'); }}
                            >
                                Workout
                            </button>
                            <button
                                className={`nav-btn ${currentView === 'weekly' ? 'active' : ''}`}
                                onClick={() => { setCurrentView('weekly'); setViewingWeek(currentWeek); window.scrollTo(0, 0); }}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    <div className="content">
                        {currentView === 'workout' && <WorkoutView
                            currentDay={currentDay}
                            setCurrentDay={setCurrentDay}
                            workoutData={workoutData}
                            loggedExercises={loggedExercises}
                            handleInputChange={handleInputChange}
                            getPreviousWorkout={getPreviousWorkout}
                            logExercise={logExercise}
                            completeDay={completeDay}
                            celebration={celebration}
                            getCurrentExercises={getCurrentExercises}
                            currentWeek={currentWeek}
                            userBodyweight={userBodyweight}
                            schedule={schedule}
                            exercisesByDay={exercisesByDay}
                            fieldErrors={fieldErrors}
                            prTracking={prTracking}
                            advancedPrTracking={advancedPrTracking}
                            minimalistPrTracking={minimalistPrTracking}
                            repsDropdown={repsDropdown}
                            expandedWeightBreakdown={expandedWeightBreakdown}
                            setExpandedWeightBreakdown={setExpandedWeightBreakdown}
                            workoutHistory={workoutHistory}
                        />}
                        {currentView === 'weekly' && <WeeklyView
                            workoutHistory={workoutHistory}
                            viewingWeek={viewingWeek}
                            setViewingWeek={setViewingWeek}
                            currentWeek={currentWeek}
                            exercisesByDay={exercisesByDay}
                            onEditWorkout={(workout) => {
                                setEditingWorkout(workout);
                                setShowEditWorkout(true);
                            }}
                        />}
                        {currentView === 'progress' && <ProgressView
                            workoutHistory={workoutHistory}
                            selectedExercise={selectedExercise}
                            setSelectedExercise={setSelectedExercise}
                            exercisesByDay={exercisesByDay}
                        />}
                    </div>
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
