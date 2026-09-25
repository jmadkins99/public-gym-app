        // Verify doom_id against manifest
        function verifyDoomId(doomId) {
            const manifest = {
                'D0O0O0M1': 'lexi',
                'D1O9O9M2': 'jessi',
                'D6O9O6M9': 'graciepoo',
                'B1G4RK': 'noah',
                'D2O9O9M1': 'shawn',
                'D2O0O1M7': 'ian'
            };
            return manifest[doomId] || null;
        }

        // Get preset template by identifier
        function getPresetTemplate(identifier) {
            // Jessi's program is built from JESSI_PROGRAM in migrations.jessi.js,
            // the same table his existing devices are migrated from, so the two
            // cannot drift. Returned before anyone else's template is built, so
            // nothing in his builder can reach another client's install.
            if (identifier === 'jessi') return buildJessiPreset();

            const templates = {

                'lexi': {
                    name: 'Upper - Lower',
                    prTracking: true,
                    bypassSchedule: true,
                    workoutDays: {

                        1: {
                            name: 'Upper',
                            exercises: [
                                { name: 'Bench Press', sets: 4, minReps: 6, maxReps: 8 },
                                { name: 'Barbell Row', sets: 4, minReps: 6, maxReps: 8 },
                                { name: 'Overhead Press', sets: 3, minReps: 8, maxReps: 10 },
                                { name: 'Lat Pulldown', sets: 3, minReps: 8, maxReps: 12 },
                                { name: 'Dumbbell Lateral Raise', sets: 3, minReps: 12, maxReps: 15 },
                                { name: 'Cable Bicep Curl', sets: 3, minReps: 10, maxReps: 12 },
                                { name: 'Tricep Rope Pushdown', sets: 3, minReps: 10, maxReps: 12 },
                            ]
                        },

                        2: {
                            name: 'Lower',
                            exercises: [
                                { name: 'Squat', sets: 4, minReps: 6, maxReps: 8 },
                                { name: 'Romanian Deadlift', sets: 3, minReps: 8, maxReps: 10 },
                                { name: 'Leg Press', sets: 3, minReps: 10, maxReps: 12 },
                                { name: 'Leg Curl', sets: 3, minReps: 10, maxReps: 12 },
                                { name: 'Leg Extension', sets: 3, minReps: 10, maxReps: 12 },
                                { name: 'Calf Raise', sets: 4, minReps: 12, maxReps: 15 },
                                { name: 'Plank', sets: 3, minReps: 30, maxReps: 60 },
                            ]

                        }
                    }
                },

                'graciepoo': {
                    name: 'Full Body',
                    prTracking: true,
                    bypassSchedule: true,
                    workoutDays: {

                        1: {
                            name: 'Full Body',
                            exercises: [
                                { name: 'Romanian Deadlifts', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Seated Leg Curls', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Pendulum Squat', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Hip Thrusts', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Hip Adductor Machine', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Glute Kickbacks', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Leg Extensions', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Standing Calf Raises', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Neutral Grip Row Machine', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Chest Press Machine', sets: 1, minReps: 6, maxReps: 8 },
                            ]

                        }

                    }
                },

                'noah': {
                    name: 'Upper - Lower',
                    prTracking: true,
                    bypassSchedule: true,
                    schedule: ['Monday', 'Wednesday', 'Thursday', 'Saturday'],
                    workoutDays: {

                        1: {
                            name: 'Lower',
                            exercises: [
                                { name: 'Leg Extensions', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Seated Leg Curls', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Pendulum Squat', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Hip Thrusts', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Hip Adduction Machine', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Calf Raise Machine', sets: 2, minReps: 6, maxReps: 8 },
                            ]
                        },

                        2: {
                            name: 'Upper',
                            exercises: [
                                { name: 'Flat Chest Press Machine', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Shoulder Press Machine', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Preacher Curls', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Tricep Pushdowns', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Wide Grip Lat Pulldowns', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Upper Back Row Machine', sets: 2, minReps: 6, maxReps: 8 },
                                { name: 'Neutral Grip Row Machine', sets: 2, minReps: 6, maxReps: 8 },

                            ]
                        }

                    }
                },

                'shawn': {
                    name: 'Push - Pull - Legs - Upper - Lower',
                    prTracking: true,
                    bypassSchedule: true,
                    schedule: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
                    workoutDays: {

			1: {
			    name: 'Legs',
			    exercises: [
				{ name: 'Seated Leg Curls', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Leg Press', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Hip Thrusts', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Leg Extensions', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Standing Calf Raise Machine', sets: 2, minReps: 6, maxReps: 8 },
			    ]
			},
			2: {
			    name: 'Pull',
			    exercises: [
				{ name: 'Barbell Row', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Lat Pulldowns', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Seated Cable Row', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'DB Shrugs', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Face Pulls', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Incline DB Curls', sets: 2, minReps: 6, maxReps: 8 },
			    ]
			},
			3: {
			    name: 'Push',
			    exercises: [
				{ name: 'Flat DB Bench Press', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Seated DB OHP', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Chest Flies', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Tricep Pushdown', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Overhead Tricep Extension', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Cable Lateral Raises', sets: 2, minReps: 6, maxReps: 8 },
			    ]
			},
			4: {
			    name: 'Lower',
			    exercises: [
				{ name: 'Romanian Deadlift', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Hip Thrusts', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Lying Leg Curls', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Standing Calf Raise Machine', sets: 2, minReps: 6, maxReps: 8 },
			    ]
			},
			5: {
			    name: 'Upper',
			    exercises: [
				{ name: 'Seated DB OHP', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Pull-ups', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Incline DB Bench Press', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'DB Shrugs', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Machine Lateral Raises', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Tricep Pushdown', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'EZ Bar Curls', sets: 2, minReps: 6, maxReps: 8 },
				{ name: 'Hammer Curls', sets: 2, minReps: 6, maxReps: 8 },
			    ]
			},

                    }
                },

                // Ian. Modelled on Jessi's Aug 2026 Anterior/Posterior split —
                // same two days, same 6-8 goal range, same 5-8 reps dropdown —
                // but his own roster, order and gym, and unaffected by Jessi's
                // Sep 2026 move to Full Body. Differences worth knowing:
                //
                //   - No Chest Press, so Anterior is 11 movements.
                //   - Shoulders and triceps lead the day; chest sits 7th-8th.
                //   - "Wrist Curls" and "Incline Curls" are his names for what
                //     Jessi's program called Cable Wrist Curls and Recline Curls.
                //   - Every movement is seeded loadType 'pin'. He trains
                //     somewhere else, so the name-based rules — which would make
                //     six of these plate-loaded, on the assumption they are
                //     Jessi's machines — are overridden outright. He can correct any of
                //     them in Settings.
                //   - No startingWeight anywhere. His first session is blank by
                //     choice; note this means the Weight Breakdown opens empty
                //     until he types a weight, since it bails at target === 0.
                //
                // Deliberately NO splitRevision: it is the one mark
                // migrateJessiSplit requires, so stamping it would have that
                // rebuild his program as Jessi's on the next revision bump. The
                // coachPreset stamp written by handleCoachIdVerified is a second
                // guard. (Before revision 16 a local one-shot could also collapse
                // an unstamped copy of this program into one day; it is gone.)
                'ian': {
                    name: 'Anterior - Posterior',
                    minimalistPrTracking: true,
                    repsDropdown: { min: 5, max: 8 },
                    bypassSchedule: true,
                    scheduleDays: IAN_SPLIT_SCHEDULE,
                    workoutDays: {

                        1: {
                            name: 'Anterior',
                            exercises: [
                                { name: 'Shoulder Press', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Tricep Extensions', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Lateral Raises', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Overhead Tricep Extensions', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Reverse Wrist Curls', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Wrist Curls', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Chest Flies', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Incline Chest Press', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Ab Crunches', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Leg Extensions', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Leg Press', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                            ]
                        },

                        2: {
                            name: 'Posterior',
                            exercises: [
                                { name: 'Sagittal Plane Pulldowns', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Frontal Plane Pulldowns', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Transverse Plane Rows', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Kelso Shrugs', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Preacher Curls', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Incline Curls', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Back Extensions', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Hip Adduction', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                                { name: 'Calf Raises', sets: 1, minReps: 6, maxReps: 8, loadType: 'pin' },
                            ]
                        }

                    }
                }

            };

            return templates[identifier] || null;
        }

        // Ian's weekday map: day 1 is Anterior
        // on Mon/Wed/Fri, day 2 is Posterior on Tue/Thu/Sat and Sunday. All seven
        // days are listed deliberately — an omitted weekday is a rest day, and
        // getTodayDay() would return null and highlight nothing on it.
        //
        // No revision constant accompanies this, and there is no Ian migration.
        // His program is settled, so the preset is the only path that builds it.
        const IAN_SPLIT_SCHEDULE = [
            { dayOfWeek: 'Monday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Tuesday',   workoutDayNumber: 2 },
            { dayOfWeek: 'Wednesday', workoutDayNumber: 1 },
            { dayOfWeek: 'Thursday',  workoutDayNumber: 2 },
            { dayOfWeek: 'Friday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Saturday',  workoutDayNumber: 2 },
            { dayOfWeek: 'Sunday',    workoutDayNumber: 2 },
        ];

        // Jessi's weekday map. Since revision 16 (Sep 2026) his program is one
        // Full Body day, trained six days a week with no rest day modelled, so
        // every weekday is day 1 — the same as the personal app, which has no
        // weekday map at all. All seven days are listed: an omitted weekday is a
        // rest day, and getTodayDay() would return null on it. Fresh installs
        // get this from buildJessiPreset; existing devices from migrateJessiSplit,
        // which writes it once because the old map names a day 2 that is gone.
        const JESSI_SPLIT_SCHEDULE = [
            { dayOfWeek: 'Monday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Tuesday',   workoutDayNumber: 1 },
            { dayOfWeek: 'Wednesday', workoutDayNumber: 1 },
            { dayOfWeek: 'Thursday',  workoutDayNumber: 1 },
            { dayOfWeek: 'Friday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Saturday',  workoutDayNumber: 1 },
            { dayOfWeek: 'Sunday',    workoutDayNumber: 1 },
        ];
