        // Migrate existing data to namespaced keys (one-time migration for existing users)
        function migrateToNamespacedStorage() {
            const keysToMigrate = ['gymWorkoutHistory', 'gymExerciseConfig', 'lastBackupReminder'];

            keysToMigrate.forEach(key => {
                // Check if data exists in the old location (without namespace)
                const oldData = localStorage.getItem(key);
                // Check if data already exists in the new location (with namespace)
                const newData = storage.getItem(key);

                // Only migrate if old data exists and new location is empty
                if (oldData && !newData) {
                    storage.setItem(key, oldData);
                    // Optionally remove the old data to clean up
                    // Commenting this out to be safe - users can manually clear old data later
                    // localStorage.removeItem(key);
                }
            });
        }

        // ============================================================================
        // MIGRATION FUNCTIONS
        // ============================================================================

        function migrateExerciseConfig() {
            const oldConfig = storage.getItem('gymExerciseConfig');
            if (!oldConfig) return;

            const config = JSON.parse(oldConfig);
            if (config.version === 2) return; // Already migrated

            // Transform old format to new
            const newConfig = {
                version: 2,
                days: {
                    1: config.day1 || [],
                    2: config.day2 || []
                },
                categories: config.categories || []
            };

            storage.setItem('gymExerciseConfig', JSON.stringify(newConfig));
        }

        function migrateWorkoutHistory() {
            const history = storage.getItem('gymWorkoutHistory');
            if (!history) return;

            const workouts = JSON.parse(history);
            if (workouts.length === 0) return;
            if (workouts[0].dayOfWeek) return; // Already migrated

            const migratedHistory = workouts.map(workout => {
                const date = new Date(workout.date);
                const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

                // Migrate exercise format
                const migratedExercises = workout.exercises.map(ex => {
                    const values = {};
                    if (ex.weight) values.weight = ex.weight;
                    if (ex.reps) values.reps = ex.reps;
                    if (ex.rounds) values.rounds = ex.rounds;
                    if (ex.time) values.time = ex.time;
                    if (ex.level) values.level = ex.level;

                    return {
                        id: ex.id,
                        name: ex.name,
                        category: ex.category,
                        typeId: ex.type || 'standard', // Rename type → typeId
                        values: values,
                        order: ex.order
                    };
                });

                return {
                    date: workout.date,
                    dayOfWeek: dayOfWeek,
                    workoutDayNumber: workout.day, // Rename day → workoutDayNumber
                    week: workout.week,
                    exercises: migratedExercises,
                    submitted: workout.submitted
                };
            });

            storage.setItem('gymWorkoutHistory', JSON.stringify(migratedHistory));
        }


        function createDefaultSchedule() {
            // Create a 2-day alternating schedule to preserve old behavior
            const defaultSchedule = {
                version: 2,
                workoutDays: [
                    { dayOfWeek: 'Monday', workoutDayNumber: 1 },
                    { dayOfWeek: 'Wednesday', workoutDayNumber: 2 },
                    { dayOfWeek: 'Friday', workoutDayNumber: 1 },
                    { dayOfWeek: 'Saturday', workoutDayNumber: 2 }
                ],
                totalWorkoutDays: 2
            };

            storage.setItem('gymScheduleConfig', JSON.stringify(defaultSchedule));
        }

