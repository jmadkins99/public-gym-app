        // One exercise's card, lifted out of WorkoutView's renderExercise.
        //
        // The body below is unchanged from the closure it came from — this move
        // only turns the free variables into props, so the card can be rendered
        // by something other than the list. Everything the four tracking modes
        // do (prTracking hints, the minimalist prefill and streak badge, the
        // advanced plateau-buster machine, the reps dropdown) is preserved
        // exactly; the PR helpers it calls now live in js/plateauLogic.js.
        function ExerciseCard({ exercise,
                                isRevealed,
                                getPreviousWorkout,
                                loggedExercises,
                                workoutData,
                                prTracking,
                                advancedPrTracking,
                                minimalistPrTracking,
                                repsDropdown,
                                workoutHistory,
                                handleInputChange,
                                onLog,
                                fieldErrors }) {
            // Fit the revealed contents to the card instead of scrolling them.
            //
            // A scrollable region inside a touch-action:none stage competes
            // with the horizontal swipe, and on iOS the scroller tends to win —
            // so a card tall enough to scroll was also a card that was awkward
            // to swipe off. A card you have to scroll is not one screen any
            // more either, which was the whole premise.
            //
            // Declared above the front-face return because hooks cannot be
            // called conditionally; on a nameplate the refs are simply null and
            // the effect does nothing.
            const fitBox = React.useRef(null);
            const fitInner = React.useRef(null);
            const [fit, setFit] = React.useState(1);

            React.useLayoutEffect(() => {
                const box = fitBox.current;
                const inner = fitInner.current;
                if (!box || !inner) return;
                const measure = () => {
                    // scrollHeight is the UNSCALED layout height — a CSS
                    // transform never feeds back into layout — so this reading
                    // is stable whatever scale is currently applied, and the
                    // measurement cannot chase its own tail.
                    const needed = inner.scrollHeight;
                    const avail = box.clientHeight;
                    if (!needed || !avail) return;
                    setFit((prev) => {
                        const raw = needed > avail ? avail / needed : 1;
                        // Floor it: past this the text is too small to read at
                        // arm's length, and something else has gone wrong.
                        const next = Math.round(Math.max(0.6, raw) * 1000) / 1000;
                        return Math.abs(prev - next) < 0.002 ? prev : next;
                    });
                };
                measure();
                const ro = new ResizeObserver(measure);
                ro.observe(box);
                ro.observe(inner);
                return () => ro.disconnect();
            });

            const previous = getPreviousWorkout(exercise.id);
            const isLogged = loggedExercises[exercise.id];
            const data = workoutData[exercise.id] || {};

            // ---- Front: a nameplate. Nothing numeric, deliberately. --------
            //
            // Deliberately BEFORE the PR helpers below. Three cards are mounted
            // at once so the neighbours can peek in during a swipe, and those
            // helpers walk the whole workout history per exercise — work a
            // nameplate has no use for.
            //
            // Hiding the working weight until you swipe up is the point of the
            // screen: the reveal is what stamps startedAt, so the number you
            // came for is on the other side of the gesture that starts the
            // clock.
            if (!isRevealed) {
                return (
                    <div data-exercise-id={exercise.id}
                         className={'card card-front' + (isLogged ? ' is-done' : '')}>
                        {/* No logged branch: a logged card renders the revealed
                            face unconditionally, so this one is only ever seen
                            before a set is recorded. */}
                        <div className="card-name">{exercise.name}</div>
                        <div className="card-hint">
                            <div className="card-hint-arrow">↑</div>
                            swipe up to start
                        </div>
                    </div>
                );
            }

            // Check for PR tracking recommendations (only for standard exercises when prTracking is enabled)
            const prRecommendation = prTracking && !isLogged && (exercise.type === 'standard' || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio'))
                ? getPRTrackingRecommendation(exercise.id, workoutHistory)
                : null;

            // Advanced PR tracking state machine (standard + bodyweight)
            const isStandardOrBw = exercise.type === 'standard' || exercise.type === 'bodyweight'
                || (!exercise.type && !exercise.isCardio && exercise.typeId !== 'cardio');
            const showAdvancedPR = advancedPrTracking && !isLogged && isStandardOrBw;

            // Minimalist PR tracking (Jessi, and anyone else opted in via minimalistPrTracking)
            const showMinimalistPR = minimalistPrTracking && !isLogged && isStandardOrBw;
            const minimalistPR = showMinimalistPR ? getMinimalistPR(exercise.id, workoutHistory) : null;
            const minimalistStagnation = showMinimalistPR && !minimalistPR ? getMinimalistStagnation(exercise.id, workoutHistory) : null;
            // No !isLogged here, unlike the hints above: the streak reports
            // history rather than suggesting a target, so it should stay put
            // once the card is logged.
            const prStreak = minimalistPrTracking && isStandardOrBw ? getPRStreak(exercise.id, workoutHistory) : null;
            const showPlateauBuster = showAdvancedPR ? isPlateauBuster(exercise.id, workoutHistory) : false;
            const advPrWeightRecovery = showAdvancedPR ? getPRWeightRecovery(exercise.id, workoutHistory) : null;
            const advFailedRetry = showAdvancedPR && !advPrWeightRecovery
                ? getFailedPlateauBusterRetry(exercise.id, workoutHistory) : null;
            const advAutoRegulation = showAdvancedPR && !advPrWeightRecovery && !advFailedRetry && exercise.type !== 'bodyweight'
                ? getPRAutoRegulation(exercise.id, workoutHistory) : null;
            const advPlateauDecrement = showAdvancedPR && showPlateauBuster && !advPrWeightRecovery && exercise.type !== 'bodyweight'
                ? getPlateauBusterDecrement(exercise.id, workoutHistory) : null;

            if (exercise.type === 'assault-bike') {
                const isPROpportunity = previous && previous.rounds;
                const suggestedRounds = isPROpportunity ? (parseInt(previous.rounds) + 1).toString() : null;
                const isCurrentlyPRAttempt = isPROpportunity && data.rounds &&
                    parseInt(data.rounds) > parseInt(previous.rounds);

                return (
                    <div data-exercise-id={exercise.id}
                         className={`card card-open exercise-card ${isLogged ? 'logged' : ''}`}>
                        <div className="card-body" ref={fitBox}>
                          <div className="card-fit" ref={fitInner} style={{ transform: 'scale(' + fit + ')' }}>
                        <div className="exercise-header">
                            <div>
                                <div className="exercise-name card-open-name">
                                    {exercise.name}
                                </div>
                                {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                    </div>
                                )}
                            </div>
                            {previous && (
                                <div className="previous-data card-last">
                                    Last: {previous.rounds} rounds
                                </div>
                            )}
                        </div>
                        {isPROpportunity && (
                            <div className="pr-suggestion">
                                Try {suggestedRounds} rounds for a new PR
                            </div>
                        )}
                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Intensity</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value="30/30"
                                    disabled
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Rounds</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className={`input-field ${isCurrentlyPRAttempt ? 'pr-attempt' : ''}`}
                                    value={data.rounds || ''}
                                    onChange={(e) => handleInputChange(exercise.id, 'rounds', e.target.value)}
                                    placeholder={suggestedRounds || previous?.rounds || '5'}
                                    disabled={isLogged}
                                />
                            </div>
                        </div>
                          </div>
                        </div>
                        <button
                            className={`log-btn ${isLogged ? 'logged' : ''}`}
                            onClick={() => onLog(exercise.id)}
                            disabled={isLogged}
                        >
                            {isLogged ? '✓ Logged' : 'LOG'}
                        </button>
                    </div>
                );
            }

            if (exercise.type === 'stairmaster') {
                const isPROpportunity = previous && previous.time;
                let suggestedTime = null;
                let suggestedLevel = previous?.level || 'Level 7';
                if (isPROpportunity) {
                    const prevSeconds = parseTimeToSeconds(previous.time);
                    const newSeconds = prevSeconds + 15;
                    suggestedTime = formatSecondsToTime(newSeconds);
                }
                const isCurrentlyPRAttempt = isPROpportunity && data.time &&
                    parseTimeToSeconds(data.time) > parseTimeToSeconds(previous.time);

                // Generate time options from 5:00 to 20:00 in 15-second increments
                const timeOptions = [];
                for (let minutes = 5; minutes <= 20; minutes++) {
                    for (let seconds = 0; seconds < 60; seconds += 15) {
                        if (minutes === 20 && seconds > 0) break; // Stop at 20:00
                        timeOptions.push(formatSecondsToTime(minutes * 60 + seconds));
                    }
                }

                return (
                    <div data-exercise-id={exercise.id}
                         className={`card card-open exercise-card ${isLogged ? 'logged' : ''}`}>
                        <div className="card-body" ref={fitBox}>
                          <div className="card-fit" ref={fitInner} style={{ transform: 'scale(' + fit + ')' }}>
                        <div className="exercise-header">
                            <div>
                                <div className="exercise-name card-open-name">
                                    {exercise.name}
                                </div>
                                {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                    </div>
                                )}
                            </div>
                            {previous && (
                                <div className="previous-data card-last">
                                    Last: {previous.level || 'Level 7'} - {previous.time}
                                </div>
                            )}
                        </div>
                        {isPROpportunity && (
                            <div className="pr-suggestion">
                                Try {suggestedTime} for a new PR
                            </div>
                        )}
                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Level</label>
                                <select
                                    className="input-field"
                                    value={data.level || suggestedLevel}
                                    onChange={(e) => handleInputChange(exercise.id, 'level', e.target.value)}
                                    disabled={isLogged}
                                >
                                    <option value="Level 7">Level 7</option>
                                    <option value="Level 8">Level 8</option>
                                    <option value="Level 9">Level 9</option>
                                    <option value="Level 10">Level 10</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Time</label>
                                <select
                                    className={`input-field ${isCurrentlyPRAttempt ? 'pr-attempt' : ''}`}
                                    value={data.time || ''}
                                    onChange={(e) => handleInputChange(exercise.id, 'time', e.target.value)}
                                    disabled={isLogged}
                                >
                                    <option value="">{suggestedTime || previous?.time || 'Select time'}</option>
                                    {timeOptions.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                          </div>
                        </div>
                        <button
                            className={`log-btn ${isLogged ? 'logged' : ''}`}
                            onClick={() => onLog(exercise.id)}
                            disabled={isLogged}
                        >
                            {isLogged ? '✓ Logged' : 'LOG'}
                        </button>
                    </div>
                );
            }

            if (exercise.type === 'bodyweight') {
                const bwRepsPlaceholder = (() => {
                    if (advancedPrTracking) {
                        if (advPrWeightRecovery?.reps) return advPrWeightRecovery.reps;
                        if (advFailedRetry?.targetReps) return advFailedRetry.targetReps;
                        if (showPlateauBuster && previous?.reps) return String(parseInt(previous.reps));
                        if (previous?.reps) return String(parseInt(previous.reps) + 1);
                        return '';
                    }
                    if (prTracking && previous?.reps) {
                        return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                            ? (exercise.minReps || 0).toString()
                            : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                    }
                    return previous?.reps || '0';
                })();

                return (
                    <div data-exercise-id={exercise.id}
                         className={`card card-open exercise-card ${isLogged ? 'logged' : ''}`}>
                        <div className="card-body" ref={fitBox}>
                          <div className="card-fit" ref={fitInner} style={{ transform: 'scale(' + fit + ')' }}>
                        <div className="exercise-header">
                            <div>
                                <div className="exercise-name card-open-name">{exercise.name}</div>
                                {(exercise.sets || exercise.minReps || exercise.maxReps) && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {exercise.sets || 3} sets × {exercise.minReps || 8}-{exercise.maxReps || 12} reps
                                    </div>
                                )}
                            </div>
                            {previous && (
                                <div className="previous-data card-last">
                                    Last: {previous.reps} reps
                                </div>
                            )}
                        </div>
                        {advancedPrTracking && (
                            advPrWeightRecovery ? (
                                <div style={{ color: '#4CAF50', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Trial of Strength
                                </div>
                            ) : (showPlateauBuster && !advFailedRetry) ? (
                                <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Plateau Buster - Hit 2 Sets
                                </div>
                            ) : advFailedRetry ? (
                                <div style={{ color: '#ff9500', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                                    Plateau Buster - Hit 1 Set of {advFailedRetry.targetReps} Reps
                                </div>
                            ) : null
                        )}
                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Weight</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value="Body Weight"
                                    disabled
                                />
                            </div>
                            <div className="input-group" style={{ position: 'relative' }}>
                                {advancedPrTracking && advPrWeightRecovery && (
                                    <div style={{ position: 'absolute', top: '-20px', left: '0', color: '#4CAF50', fontSize: '12px', fontWeight: '600' }}>
                                        PR Reps to Beat
                                    </div>
                                )}
                                <label className="input-label">Reps on First Set</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-field"
                                    value={data.reps || ''}
                                    onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                    placeholder={bwRepsPlaceholder}
                                    disabled={isLogged}
                                    style={advancedPrTracking && advPrWeightRecovery ? { border: '2px solid #4CAF50' } : {}}
                                />
                            </div>
                        </div>
                          </div>
                        </div>
                        <button
                            className={`log-btn ${isLogged ? 'logged' : ''}`}
                            onClick={() => onLog(exercise.id)}
                            disabled={isLogged}
                        >
                            {isLogged ? '✓ Logged' : 'LOG'}
                        </button>
                    </div>
                );
            }

            // Cardio exercise (generic cardio type from wizard)
            if (exercise.isCardio || exercise.typeId === 'cardio') {
                const placeholderIntensity = previous?.intensity || exercise.intensity || '';
                const placeholderMinutes = previous?.minutes || exercise.minutes || 0;
                const placeholderSeconds = previous?.seconds || exercise.seconds || 0;

                return (
                    <div data-exercise-id={exercise.id}
                         className={`card card-open exercise-card ${isLogged ? 'logged' : ''}`}>
                        <div className="card-body" ref={fitBox}>
                          <div className="card-fit" ref={fitInner} style={{ transform: 'scale(' + fit + ')' }}>
                        <div className="exercise-header">
                            <div>
                                <div className="exercise-name card-open-name">
                                    {exercise.name}
                                </div>
                                {previous && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {previous.intensity || 'Any intensity'} - {previous.minutes || 0}:{String(previous.seconds || 0).padStart(2, '0')}
                                    </div>
                                )}
                                {!previous && (exercise.intensity !== undefined || exercise.minutes !== undefined) && (
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pale)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Goal: {exercise.intensity || 'Any intensity'} - {exercise.minutes || 0}:{String(exercise.seconds || 0).padStart(2, '0')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Intensity</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={data.intensity !== undefined ? data.intensity : (exercise.intensity || '')}
                                    onChange={(e) => handleInputChange(exercise.id, 'intensity', e.target.value)}
                                    disabled={isLogged}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Minutes</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className={`input-field ${fieldErrors[`${exercise.id}-minutes`] ? 'error' : ''}`}
                                    value={data.minutes !== undefined ? data.minutes : ''}
                                    onChange={(e) => handleInputChange(exercise.id, 'minutes', e.target.value)}
                                    placeholder={placeholderMinutes}
                                    min="0"
                                    disabled={isLogged}
                                    style={{ textAlign: 'center' }}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Seconds</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-field"
                                    value={data.seconds !== undefined ? data.seconds : ''}
                                    onChange={(e) => handleInputChange(exercise.id, 'seconds', e.target.value)}
                                    placeholder={placeholderSeconds}
                                    min="0"
                                    max="59"
                                    disabled={isLogged}
                                    style={{ textAlign: 'center' }}
                                />
                            </div>
                        </div>
                          </div>
                        </div>
                        <button
                            className={`log-btn ${isLogged ? 'logged' : ''}`}
                            onClick={() => onLog(exercise.id)}
                            disabled={isLogged}
                        >
                            {isLogged ? '✓ Logged' : 'LOG'}
                        </button>
                    </div>
                );
            }

            // Standard exercise
            const stdWeightValue = (() => {
                if (data.weight !== undefined) return data.weight;
                if (advancedPrTracking) {
                    return advPrWeightRecovery?.weight || advFailedRetry?.weight
                        || advAutoRegulation?.weight || advPlateauDecrement?.weight
                        || previous?.weight || '';
                }
                if (minimalistPrTracking && minimalistPR) {
                    return minimalistPR.weight;
                }
                // startingWeight seeds a brand-new exercise so the client
                // has a number to work from on its first session. Only
                // consulted when there is no history at all; once logged
                // once, `previous` takes over permanently.
                return previous?.weight || exercise.startingWeight || '';
            })();

            const placeholderReps = (() => {
                if (advancedPrTracking) {
                    if (advPrWeightRecovery?.reps) return advPrWeightRecovery.reps;
                    if (advFailedRetry?.targetReps) return advFailedRetry.targetReps;
                    if (advAutoRegulation) return ADV_MIN_REPS.toString();
                    if (advPlateauDecrement) return ADV_MAX_REPS.toString();
                    if (showPlateauBuster && previous?.reps) return String(parseInt(previous.reps));
                    if (previous?.reps) return String(parseInt(previous.reps) + 1);
                    return '';
                }
                if (minimalistPrTracking && previous?.reps) {
                    return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                        ? (exercise.minReps || 0).toString()
                        : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                }
                if (prTracking && previous?.reps) {
                    return parseInt(previous.reps) >= (exercise.maxReps || Infinity)
                        ? (exercise.minReps || 0).toString()
                        : Math.max(parseInt(previous.reps) + 1, exercise.minReps || 0).toString();
                }
                return previous?.reps || '';
            })();

            // Reps dropdown (Jessi: 5-9), parity with the personal app's 3-6
            // dropdown. Unlike the free-type field this ALWAYS has a value
            // selected, so a one-tap LOG records it. After a weight bump the
            // target resets to the bottom of the goal range for the new
            // heavier load; otherwise last session's reps carry over, clamped
            // into the dropdown range. First-ever session falls back the same
            // way. The range bounds themselves never feed the PR logic.
            const repsDropdownOptions = repsDropdown
                ? Array.from({ length: repsDropdown.max - repsDropdown.min + 1 },
                             (_, i) => String(repsDropdown.min + i))
                : null;
            const repsDropdownDefault = (() => {
                if (!repsDropdown) return '';
                const clamp = (n) => String(Math.min(repsDropdown.max, Math.max(repsDropdown.min, n)));
                const fallback = clamp(exercise.minReps || repsDropdown.min);
                if (minimalistPR) return fallback;
                const prev = parseInt(previous?.reps);
                return isNaN(prev) ? fallback : clamp(prev);
            })();

            const stdWeightBorder = (() => {
                if (advancedPrTracking) {
                    if (advPrWeightRecovery || advAutoRegulation) return '2px solid #4CAF50';
                    if (showPlateauBuster || advFailedRetry) return '2px solid #ff9500';
                }
                if (minimalistPrTracking && minimalistPR) return '2px solid #4CAF50';
                if (prRecommendation) return `2px solid ${prRecommendation.borderColor}`;
                return undefined;
            })();

            // Every exercise gets a Weight Breakdown button. This used to be
            // gated behind `gympinMode`, an exerciseConfig flag switched on
            // by ?gympin=on and auto-enabled for Jessi's installs, so in
            // practice only she ever saw it. The gate went away in Aug 2026
            // when the load type became something each user sets for
            // themselves: the name-based rules guess, the user corrects, and
            // there is no longer a reason to hide the result from anyone.
            // The `gympin` prefix on the helpers and data attributes below
            // is left over from that era and means nothing now.
            const gympinConfig = breakdownConfigFor(exercise);
            const hasGympinBreakdown = true;

            // ---- Warmup rows, in the personal app's shape ------------------
            // The same numbers her monospace block carried, laid out as a
            // label, an optional percentage, the weight, and the plates
            // underneath — readable at arm's length rather than parsed as prose.
            const plateList = (plates) => Object.entries(plates)
                .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                .map(([w, count]) => (count > 1 ? w + ' × ' + count : String(w)))
                .join(', ');

            const breakdownRow = (label, pct, value, sub) => (
                <div key={label} className="breakdown-row">
                    <div className="breakdown-label">
                        {label}
                        {pct ? <span className="breakdown-pct">{pct}</span> : null}
                    </div>
                    <div className="breakdown-value">
                        <div className="breakdown-weight">{value}</div>
                        {sub ? <div className="breakdown-plates">{sub}</div> : null}
                    </div>
                </div>
            );

            const renderBreakdown = () => {
                const target = parseFloat(stdWeightValue) || 0;
                if (target === 0) return null;

                if (gympinConfig.type === 'pin-stack') {
                    const b = gympinCalculatePinStackBreakdown(target, gympinConfig);
                    const pinRow = (label, pct, set) => (!set || set.totalWeight <= 0) ? null
                        : breakdownRow(label, pct,
                            (set.overflow ? set.totalWeight : set.pinWeight) + ' lbs',
                            set.overflow
                                ? 'pin ' + set.pinWeight + '  ·  ' + plateList(set.plates)
                                : null);
                    return (
                        <div className="breakdown" data-gympin-breakdown-panel={exercise.id}>
                            {pinRow('Warmup 1', '70%', b.warmup1)}
                            {pinRow('Warmup 2', '90%', b.warmup2)}
                            {/* The top set only says something once the stack has
                                run out and plates are involved; otherwise it is
                                the number already shown above it. */}
                            {b.topSet.overflow ? pinRow('Top set', '', b.topSet) : null}
                        </div>
                    );
                }

                const bd = gympinCalculatePlateBreakdown(target, gympinConfig);
                const two = bd.isTwoSided;
                const plateRow = (label, pct, set) => (!set || set.totalWeight <= 0) ? null
                    : breakdownRow(label, pct,
                        (two ? set.perSideWeight * 2 : set.perSideWeight) + ' lbs',
                        (two ? set.perSideWeight + '/side  ·  ' : '') + plateList(set.plates));
                return (
                    <div className="breakdown" data-gympin-breakdown-panel={exercise.id}>
                        {plateRow('Warmup 1', '70%', bd.warmup1)}
                        {plateRow('Warmup 2', '90%', bd.warmup2)}
                        {plateRow('Top set', '', bd.topSet)}
                    </div>
                );
            };

            // ---- The hero's tag pill --------------------------------------
            // One line at most. Each tracking mode has a single thing worth
            // saying above the fold, and a client has at most one mode; the old
            // card stacked these as separate coloured banners down the middle.
            const heroTag = advancedPrTracking
                ? (advPrWeightRecovery ? { cls: 'up', text: 'Trial of Strength' }
                    : advAutoRegulation ? { cls: 'up', text: '+' + advAutoRegulation.increment + ' lbs' }
                    : advFailedRetry ? { cls: 'flat', text: 'Hit 1 set of ' + advFailedRetry.targetReps }
                    : advPlateauDecrement ? { cls: 'flat', text: '-' + advPlateauDecrement.increment + ' lbs' }
                    : showPlateauBuster ? { cls: 'flat', text: 'Plateau buster' }
                    : null)
                : minimalistPrTracking
                ? (minimalistPR ? { cls: 'up', text: '+' + minimalistPR.increment + ' lbs' }
                    : minimalistStagnation ? { cls: 'flat', text: '2 sets recommended' }
                    : null)
                : prRecommendation
                ? { cls: prRecommendation.type === 'strength' ? 'up' : 'flat',
                    text: prRecommendation.message }
                : null;

            // What the hero shows as the rep target: whatever the field below it
            // is actually going to log, so the two can never disagree.
            const heroReps = data.reps !== undefined ? data.reps
                : (repsDropdownOptions ? repsDropdownDefault : (placeholderReps || ''));

            return (
                <div data-exercise-id={exercise.id}
                     className={`card card-open exercise-card ${isLogged ? 'logged' : ''}`}>
                    <div className="card-open-head">
                        <div className="exercise-name card-open-name">{exercise.name}</div>
                        {isLogged ? <div className="logged-chip">logged</div> : null}
                        {/* Sibling of .exercise-name, never a child: a pile of
                            tests compare that node's textContent to the bare
                            exercise name. */}
                        {prStreak ? (
                            <div className="streak-badge" data-streak={prStreak}>🔥 {prStreak}</div>
                        ) : null}
                    </div>

                    <div className="card-body" ref={fitBox}>
                      <div className="card-fit" ref={fitInner} style={{ transform: 'scale(' + fit + ')' }}>
                        <div className="hero">
                            <div className="hero-weight">
                                {stdWeightValue || '—'}<span className="hero-unit">lbs</span>
                            </div>
                            <div className="hero-reps">× {heroReps}</div>
                            {heroTag ? (
                                <div className={'hero-tag ' + heroTag.cls}>{heroTag.text}</div>
                            ) : null}
                        </div>

                        {previous ? (
                            <div className="previous-data card-last">
                                Last: {previous.weight}lbs × {previous.reps}
                            </div>
                        ) : null}

                        {renderBreakdown()}

                        <div className="input-row">
                            <div className="input-group">
                                <label className="input-label">Weight (lbs)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className={`input-field ${fieldErrors[`${exercise.id}-weight`] ? 'error' : ''}`}
                                    value={stdWeightValue}
                                    onChange={(e) => handleInputChange(exercise.id, 'weight', e.target.value)}
                                    placeholder={previous?.weight || ''}
                                    disabled={isLogged}
                                    style={stdWeightBorder ? { border: stdWeightBorder } : {}}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reps</label>
                                {repsDropdownOptions ? (
                                    <select
                                        className={`input-field ${fieldErrors[`${exercise.id}-reps`] ? 'error' : ''}`}
                                        data-field="reps"
                                        value={data.reps !== undefined ? data.reps : repsDropdownDefault}
                                        onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                        disabled={isLogged}
                                    >
                                        {repsDropdownOptions.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className={`input-field ${fieldErrors[`${exercise.id}-reps`] ? 'error' : ''}`}
                                        value={data.reps || ''}
                                        onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                                        placeholder={placeholderReps}
                                        disabled={isLogged}
                                    />
                                )}
                            </div>
                        </div>
                      </div>
                    </div>

                    <button
                        className={`log-btn ${isLogged ? 'logged' : ''}`}
                        onClick={() => onLog(exercise.id)}
                        disabled={isLogged}
                    >
                        {isLogged ? '✓ Logged' : 'LOG'}
                    </button>
                </div>
            );
        }
