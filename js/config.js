
        // User bodyweight for bodyweight exercises
        const userBodyweight = 185;


        // PR tracking: weight increment per exercise name (lowercase). Empty dict means
        // every exercise uses the 2.5 fallback in getPRWeightIncrement below. Add entries
        // here to override per-exercise.
        const PR_WEIGHT_INCREMENTS = {};

        const getPRWeightIncrement = (exerciseName) => {
            const key = (exerciseName || '').toLowerCase().trim();
            return PR_WEIGHT_INCREMENTS[key] || 2.5;
        };

        // ============================================================================
        // EXERCISE WORD BANK
        // ============================================================================

        const EXERCISE_WORD_BANK = [
            // Most Common "Big 3"
            'Bench Press', 'Deadlift', 'Squat',

            // Common Compound Movements
            'Overhead Press', 'Barbell Row', 'Pull-ups', 'Dips',
            'Lat Pulldown', 'Leg Press', 'Romanian Deadlift',

            // Chest
            'Incline Bench Press', 'Dumbbell Press', 'Incline Dumbbell Press',
            'Decline Bench Press', 'Chest Flies', 'Cable Flies', 'Push-ups', 'Incline Chest Press Machine', 'Chest Press Machine',

            // Back
            'Dumbbell Row', 'T Bar Row', 'Chest Supported Row', 'Cable Row', 'Chin-ups',
            'Face Pulls', 'Shrugs', 'Kelso Shrugs', 'Seated Cable Row', 'Wide Grip Lat Pulldown', 'Row Machine', 'Pulldown Machine',

            // Shoulders
            'Shoulder Press', 'Lateral Raises', 'Cable Lateral Raises', 'Front Raises',
            'Rear Delt Flies', 'Arnold Press', 'Upright Row',

            // Arms
            'Barbell Curls', 'Hammer Curls', 'Tricep Pushdown',
            'Overhead Tricep Extension', 'Dumbbell Curls', 'Preacher Curls', 'Cable Curls', 'Bayesian Curls', 
            'Concentration Curls', 'Tricep Dips', 'Skull Crushers',
            'Close-Grip Bench Press',

            // Legs
            'Front Squat', 'Leg Extensions', 'Seated Leg Curls', 'Prone Leg Curls', 'Bulgarian Split Squat',
            'Lunges', 'Calf Raises', 'Hip Adduction', 'Hip Abduction', 'Hip Thrusts', 'Glute Bridge',

            // Core
            'Ab Crunch', 'Hanging Leg Raises', 'Plank', 'Russian Twists',
            'Cable Crunches', 'Bicycle Crunches',

            // Cardio
            'Treadmill', 'StairMaster', 'Assault Bike', 'Rowing Machine',
            'Elliptical', 'Jump Rope', 'Battle Ropes', 'Cycling', 'Walking', 'Incline Walking',
            'Running', 'Sprinting', 'Jogging'
        ];

        // Cardio exercises list for conditional rendering
        const CARDIO_EXERCISES = [
            'Treadmill', 'StairMaster', 'Assault Bike', 'Rowing Machine',
            'Elliptical', 'Jump Rope', 'Battle Ropes', 'Cycling', 'Walking', 'Incline Walking',
            'Running', 'Sprinting', 'Jogging'
        ];

        // Helper function to check if an exercise is cardio
        function isCardioExercise(exerciseName) {
            return CARDIO_EXERCISES.some(cardio =>
                exerciseName.toLowerCase().includes(cardio.toLowerCase())
            );
        }

