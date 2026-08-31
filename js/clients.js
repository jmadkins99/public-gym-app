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

                // Must stay in lockstep with migrateJessiToFullBody's
                // getDesiredOrder: the preset serves fresh installs, the
                // migration serves devices that already exist, and both have to
                // produce the same program. This preset sat frozen in the
                // Torso/Limbs era from f4afffc through the Full Body switch in
                // 2d88aba, so a coach-code install rendered the old two-day
                // split until a refresh let the migration fix it. Test 33 pins
                // the two together by asserting a refresh changes nothing.
                // Kept in lockstep with JESSI_ANTERIOR_ORDER /
                // JESSI_POSTERIOR_ORDER and migrateJessiSplit: this is the
                // fresh-install path, those are the existing-device path, and
                // they must produce the same program. Test 33 pins them to
                // each other.
                'jessi': {
                    name: 'Anterior - Posterior',
                    minimalistPrTracking: true,
                    repsDropdown: { min: 5, max: 8 },
                    bypassSchedule: true,
                    scheduleDays: JESSI_SPLIT_SCHEDULE,
                    // Stamps the config as an already-split program, which is
                    // what migrateJessiSplit keys off. Without it a
                    // fresh coach-code install has two days and no stamp, so
                    // the migration reads it as "not Jessi's single Full Body
                    // day", returns null, and every future reorder silently
                    // skips exactly the installs that are already correct.
                    splitRevision: JESSI_SPLIT_REVISION,
                    workoutDays: {

                        1: {
                            name: 'Anterior',
                            exercises: [
                                { name: 'Chest Press', id: 'chest-press', startingWeight: '100', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Incline Chest Press', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Chest Flies', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Shoulder Press', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Lateral Raises', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Overhead Tricep Extensions', sets: 1, minReps: 6, maxReps: 8 },
                                // Abs and quads moved up ahead of Tricep
                                // Extensions and the wrist pair (Aug 2026), so
                                // the big movements come before the small
                                // isolation work. Mirrors the personal app.
                                { name: 'Ab Crunches', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Leg Extensions', id: 'actual-leg-extensions', startingWeight: '50', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Tricep Extensions', sets: 1, minReps: 6, maxReps: 8 },
                                // Keep in step with JESSI_ANTERIOR_ORDER below —
                                // this preset builds a FRESH coach-code install
                                // while that list migrates an existing one, and
                                // the two must agree. Test 33 pins them to each
                                // other; a reorder applied to only one fails it.
                                { name: 'Leg Press', sets: 1, minReps: 6, maxReps: 8 },
                            ]
                        },

                        2: {
                            name: 'Posterior',
                            exercises: [
                                { name: 'Recline Curls', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Frontal Plane Pulldowns', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Sagittal Plane Pulldowns', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Transverse Plane Rows', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Kelso Shrugs', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Preacher Curls', id: 'actual-preacher-curls', startingWeight: '50', sets: 1, minReps: 6, maxReps: 8 },
                                // The wrist pair sits with the pulling work
                                // rather than the pressing work (Aug 2026),
                                // matching the personal app's config
                                // version 18.
                                { name: 'Reverse Wrist Curls', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Cable Wrist Curls', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Back Extensions', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Hip Adduction', sets: 1, minReps: 6, maxReps: 8 },
                                { name: 'Calf Raises', sets: 1, minReps: 6, maxReps: 8 },
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

                // Ian. Close to Jessi's split — same two days, same 6-8 goal
                // range, same 5-8 reps dropdown — but his own roster, order and
                // gym. Differences worth knowing:
                //
                //   - No Chest Press, so Anterior is 11 movements to her 12.
                //   - Shoulders and triceps lead the day; chest sits 7th-8th.
                //   - "Wrist Curls" and "Incline Curls" are his names for what
                //     she calls Cable Wrist Curls and Recline Curls.
                //   - Every movement is seeded loadType 'pin'. He trains
                //     somewhere else, so the name-based rules — which would make
                //     six of these plate-loaded, on the assumption they are her
                //     machines — are overridden outright. He can correct any of
                //     them in Settings.
                //   - No startingWeight anywhere. His first session is blank by
                //     choice; note this means the Weight Breakdown opens empty
                //     until he types a weight, since it bails at target === 0.
                //
                // Deliberately NO splitRevision. Stamping one would expose him
                // to migrateJessiSplit rebuilding his program as hers on the
                // next JESSI_SPLIT_REVISION bump; omitting it used to expose him
                // to migrateJessiToFullBody collapsing his two days into one.
                // The coachPreset stamp written by handleCoachIdVerified is what
                // holds both off, and it does so for every future client too.
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

        // Weekday map, mirroring the personal app: Posterior on Mon/Wed/Fri,
        // Anterior on Tue/Thu/Sat and Sunday. Day 1 is Anterior, matching the
        // Anterior-first ordering the personal app uses.
        //
        // Unchanged by the Aug 2026 Anterior/Posterior switch: day 2 was Lower
        // on Mon/Wed/Fri and is Posterior on Mon/Wed/Fri, so only the names
        // moved. Leaving the numbers alone is what keeps a client who has since
        // shifted a day for themselves from having it stomped.
        // Ian's weekday map. The numeric mirror of Jessi's below: day 1 is Anterior
        // on Mon/Wed/Fri, day 2 is Posterior on Tue/Thu/Sat and Sunday. All seven
        // days are listed deliberately — an omitted weekday is a rest day, and
        // getTodayDay() would return null and highlight nothing on it.
        //
        // No revision constant accompanies this, and there is no Ian migration.
        // His program is settled, so the preset is the only path that builds it;
        // the coachPreset stamp is what keeps Jessi's one-shots off it.
        const IAN_SPLIT_SCHEDULE = [
            { dayOfWeek: 'Monday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Tuesday',   workoutDayNumber: 2 },
            { dayOfWeek: 'Wednesday', workoutDayNumber: 1 },
            { dayOfWeek: 'Thursday',  workoutDayNumber: 2 },
            { dayOfWeek: 'Friday',    workoutDayNumber: 1 },
            { dayOfWeek: 'Saturday',  workoutDayNumber: 2 },
            { dayOfWeek: 'Sunday',    workoutDayNumber: 2 },
        ];

        const JESSI_SPLIT_SCHEDULE = [
            { dayOfWeek: 'Monday',    workoutDayNumber: 2 },
            { dayOfWeek: 'Tuesday',   workoutDayNumber: 1 },
            { dayOfWeek: 'Wednesday', workoutDayNumber: 2 },
            { dayOfWeek: 'Thursday',  workoutDayNumber: 1 },
            { dayOfWeek: 'Friday',    workoutDayNumber: 2 },
            { dayOfWeek: 'Saturday',  workoutDayNumber: 1 },
            { dayOfWeek: 'Sunday',    workoutDayNumber: 1 },
        ];
