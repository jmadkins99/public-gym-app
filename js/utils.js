        // Calculate which day it should be based on the date
        function getTodayDay() {
            // Load schedule from localStorage
            const savedSchedule = storage.getItem('gymScheduleConfig');
            if (!savedSchedule) {
                // Fallback to alternating days if no schedule
                const today = new Date();
                const referenceDate = new Date(2025, 11, 14);
                today.setHours(0, 0, 0, 0);
                referenceDate.setHours(0, 0, 0, 0);
                const diffTime = today - referenceDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                return (diffDays % 2 === 0) ? 1 : 2;
            }

            const schedule = JSON.parse(savedSchedule);

            // If the schedule wasn't explicitly set on the preset, don't highlight any day as today
            if (!schedule.scheduleIsExplicit) return null;

            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            // Map day numbers to day names
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = dayNames[dayOfWeek];

            // Find today's workout day from schedule
            const todayWorkout = schedule.workoutDays.find(wd => wd.dayOfWeek === todayName);

            if (todayWorkout) {
                return todayWorkout.workoutDayNumber;
            }

            // If today is not a workout day, return null (no day to highlight)
            return null;
        }

        // Get the Monday of the week containing a given date
        function getMondayOfWeek(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days; otherwise go to Monday
            d.setDate(d.getDate() + diff);
            return d;
        }

        // Get the Monday of the first workout (Week 1 start date)
        // This is cached in localStorage to avoid recalculating
        function getFirstWorkoutMonday(workoutHistory) {
            // Try to get cached value first
            const cached = storage.getItem('firstWorkoutMonday');
            if (cached) {
                return new Date(cached);
            }

            // If no cache and no workout history, use today as default
            if (!workoutHistory || workoutHistory.length === 0) {
                const today = getMondayOfWeek(new Date());
                storage.setItem('firstWorkoutMonday', today.toISOString());
                return today;
            }

            // Find the earliest workout date
            const earliestWorkout = workoutHistory.reduce((earliest, workout) => {
                const workoutDate = new Date(workout.date);
                return !earliest || workoutDate < earliest ? workoutDate : earliest;
            }, null);

            // Get the Monday of that week
            const firstMonday = getMondayOfWeek(earliestWorkout);

            // Cache it for future use
            storage.setItem('firstWorkoutMonday', firstMonday.toISOString());

            return firstMonday;
        }

        // Calculate consecutive week number starting from first workout
        // Week 1 = the week of the first workout, incrementing indefinitely
        function getConsecutiveWeek(date, workoutHistory) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);

            const firstMonday = getFirstWorkoutMonday(workoutHistory);
            const currentMonday = getMondayOfWeek(d);

            // Calculate weeks difference
            const diffTime = currentMonday - firstMonday;
            const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

            return diffWeeks + 1; // Week 1 is the first week
        }

        // Calculate current week number (consecutive weeks starting from first workout)
        function getCurrentWeek(workoutHistory) {
            return getConsecutiveWeek(new Date(), workoutHistory);
        }

        // Get week number for a specific date
        function getWeekNumber(date, workoutHistory) {
            return getConsecutiveWeek(date, workoutHistory);
        }

        // Parse MM:SS to total seconds
        function parseTimeToSeconds(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            if (parts.length !== 2) return 0;
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }

        // Format seconds to MM:SS
        function formatSecondsToTime(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Generate deterministic hash for verification purposes
        function hashVerifier(input) {
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        }

        // Namespace localStorage based on app path to prevent conflicts between gym-tracker and public-gym-app
        const APP_NAMESPACE = (() => {
            const path = window.location.pathname;
            if (path.includes('/gym-tracker/')) return 'gym-tracker:';
            if (path.includes('/public-gym-app/')) return 'public-gym-app:';
            // Fallback for local development or other paths
            return 'gym-local:';
        })();

        // Helper functions for namespaced localStorage
        const storage = {
            getItem: (key) => localStorage.getItem(APP_NAMESPACE + key),
            setItem: (key, value) => localStorage.setItem(APP_NAMESPACE + key, value),
            removeItem: (key) => localStorage.removeItem(APP_NAMESPACE + key),
        };


        // Generate UUID for exercises
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // ============================================================
        // SESSION TIMING
        // ============================================================
        // Ported from the personal app, which has run this since Aug 2026.
        // The two apps share no code, only a design, so this is a copy — and
        // case 84 exists to catch the two drifting apart.

        // How long an un-anchored exercise gets docked. When a movement is
        // logged without its Weight Breakdown ever being opened there is no
        // real start, so the span back to the previous log is used instead —
        // minus this, as a flat allowance for walking to the machine and
        // setting it up. Deliberately a blunt constant: it is an estimate
        // standing in for a measurement, and the rows it produces are marked as
        // such rather than dressed up as precise.
        const UNANCHORED_TRANSITION_SECONDS = 120;

        // The longest a single movement is allowed to claim. Past this the
        // number is not wrong-but-plausible, it is nonsense, and the row reports
        // NA instead of a figure nobody should trust.
        //
        // It catches two different things with one rule, which is why there is
        // one constant and not two. A stale foreground stamp — a tab brought
        // forward on the couch an hour before the first log — produces an
        // over-long first movement. So does the one gap the open-panel anchor
        // cannot close: open a panel, touch nothing else for hours, then log it
        // without reopening. Both arrive here as "this movement claims to have
        // taken longer than any movement takes", and both get the same answer.
        const MAX_EXERCISE_SECONDS = 30 * 60;

        // Reconstruct how long a session took, and how long each movement in it
        // took, from the timestamps logExercise stamps on each exercise.
        //
        // The clock for one movement runs from the moment its Weight Breakdown
        // panel was opened (`startedAt` — you open it at the machine, to see how
        // to load it) to the moment it was logged (`loggedAt`). That pairing is
        // the whole design: it needs no stopwatch discipline, and because both
        // ends are real gestures, the number measures the work rather than the
        // work plus the walk over.
        //
        // Rows are ordered by `loggedAt`, NOT by program order. Skipping a busy
        // machine and coming back to it later is normal, and sorting by the
        // roster would then attribute a wildly wrong span to whatever sat
        // between them.
        //
        // A row's `seconds` is null when the movement cannot be honestly timed —
        // no usable start, or a span so long it is not credible. The caller
        // renders those NA.
        //
        // Returns null for any workout with no timestamps at all, which is every
        // session logged before this shipped — history is never migrated, so the
        // caller renders nothing rather than a zero.
        function getSessionTiming(workout, foregroundAt) {
            if (!workout || !workout.exercises) return null;

            const logged = workout.exercises
                .map(e => ({ entry: e, loggedMs: new Date(e.loggedAt).getTime() }))
                .filter(x => x.entry.loggedAt && !isNaN(x.loggedMs))
                .sort((a, b) => a.loggedMs - b.loggedMs);

            if (logged.length === 0) return null;

            const foregroundMs = foregroundAt ? new Date(foregroundAt).getTime() : NaN;

            const rows = [];
            let sessionStartMs = null;

            for (let i = 0; i < logged.length; i++) {
                const { entry, loggedMs } = logged[i];
                const startedMs = entry.startedAt ? new Date(entry.startedAt).getTime() : NaN;

                // Three anchors, in descending order of trust.
                let startMs = null;
                let estimated = false;

                if (!isNaN(startedMs) && startedMs <= loggedMs) {
                    // Measured: the panel was opened on this card.
                    startMs = startedMs;
                } else if (i > 0) {
                    // Estimated: span back to the previous log, less the
                    // transition allowance. Clamped so a gap shorter than the
                    // allowance reads 0 rather than negative.
                    startMs = Math.min(
                        logged[i - 1].loggedMs + UNANCHORED_TRANSITION_SECONDS * 1000,
                        loggedMs);
                    estimated = true;
                } else if (!isNaN(foregroundMs) && foregroundMs <= loggedMs) {
                    // Estimated: the first movement of the day has no previous
                    // log to lean on, so the last time the app came to the
                    // foreground stands in. A stale one is rejected below, by
                    // the same rule that rejects any over-long movement.
                    startMs = foregroundMs;
                    estimated = true;
                }

                // Refuse a span no single movement plausibly takes. Dropping the
                // start rather than the row means the movement still appears —
                // it was performed — but reports NA instead of a figure that
                // would quietly wreck the session total too.
                if (startMs !== null && loggedMs - startMs > MAX_EXERCISE_SECONDS * 1000) {
                    startMs = null;
                    estimated = false;
                }

                if (i === 0) {
                    // The session starts where its first movement starts. With
                    // no usable anchor that is the log itself, which undercounts
                    // by one movement rather than inventing a start — and is
                    // what keeps a rejected anchor out of the total as well.
                    sessionStartMs = startMs !== null ? startMs : loggedMs;
                }

                rows.push({
                    id: entry.id,
                    name: entry.name,
                    seconds: startMs === null ? null : Math.round((loggedMs - startMs) / 1000),
                    estimated
                });
            }

            return {
                totalSeconds: Math.round(
                    (logged[logged.length - 1].loggedMs - sessionStartMs) / 1000),
                rows
            };
        }

        // Session-scale duration: "1h 13m", or "58m" under the hour. Distinct
        // from formatSecondsToTime above, which renders M:SS and is what the
        // per-exercise rows use — an hour-long total reads badly as "73:24",
        // and a four-minute movement reads badly as "0h 4m".
        function formatDuration(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }

        // Title for the two timing modals. The personal app can name its days
        // outright; here days are numbered and their display name is whatever
        // the client's own exercises call themselves, so read it off the
        // workout the same way the day selector reads it off the roster.
        function getWorkoutDayLabel(workout) {
            if (!workout) return '';
            const named = (workout.exercises || []).find(e => e && e.category);
            if (named) return named.category;
            return workout.day ? `Day ${workout.day}` : '';
        }
