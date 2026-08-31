        // ============================================================================
        // Weight Breakdown
        // ============================================================================
        // Shown for every exercise, for every user. It was opt-in for coached
        // users until Aug 2026, behind a `gympinMode` field on exerciseConfig
        // that was set by visiting with `?gympin=on` and auto-enabled for
        // Jessi-shaped installs. That flag, its URL toggle and its one-shot
        // enabler are all gone: once each user can say how their own machines
        // are loaded, there is no reason to hide the breakdown from anyone. The
        // `gympin` prefix on the helpers below is what is left of the name.
        //
        // An old backup may still carry `gympinMode`. It is ignored on restore
        // rather than migrated away — nothing reads it.

        // Classify a Jessi-style exercise display name into a weight-breakdown
        // config. Mirrors gym_app/js/config.js: pin-stack machines (with optional
        // overflow above a cap) and plate-loaded machines (one- or two-sided).
        // Unknown names return null and don't get a breakdown button.
        function getWeightBreakdownConfig(name) {
            const n = String(name || '').toLowerCase();

            // Plate-loaded — checked before pin-stack. one-sided = plates hang
            // on one arm, total = perSide; two-sided = plates on both arms,
            // total = 2 * perSide.
            //
            // Incline Chest Press used to sit here as two-sided plate-loaded,
            // and this block led with it so a generic chest rule couldn't steal
            // it. Aug 2026 moved it to a pin stack in both apps, so the rule is
            // gone and the /chest press/ pin-stack rule below now deliberately
            // catches BOTH "Chest Press" and "Incline Chest Press".
            // Jessi's preacher station is renamed "Recline Curls" and is a pin
            // stack (see below); this plate-loaded rule is for everyone else's.
            if (/preacher/.test(n))              return { type: 'plate-loaded', plateMode: 'one-sided' };
            if (/stiff legged|deadlift/.test(n)) return { type: 'plate-loaded', plateMode: 'two-sided' };
            if (/pendulum|squat/.test(n))        return { type: 'plate-loaded', plateMode: 'one-sided' };
            // Back Extensions moved from a single-plate station to a two-side
            // plate-loaded one (Aug 2026), matching the personal app. The
            // logged number is now the total across both arms.
            if (/back extension/.test(n))        return { type: 'plate-loaded', plateMode: 'two-sided' };
            // Leg Press is back here after a brief stint as a pin stack in Aug
            // 2026, matching the personal app's `hip-adduction` revert. It must
            // stay in THIS block: the pin-stack rules below run second, so a
            // duplicate /leg press/ rule down there would be dead code rather
            // than a conflict — and the live one would be this, silently.
            if (/leg press/.test(n))             return { type: 'plate-loaded', plateMode: 'two-sided' };
            if (/hammer row|sagittal/.test(n))   return { type: 'plate-loaded', plateMode: 'one-sided' };
            if (/transverse|upper back row/.test(n))
                                                 return { type: 'plate-loaded', plateMode: 'one-sided' };
            if (/kelso|shrug/.test(n))           return { type: 'plate-loaded', plateMode: 'one-sided' };

            // Cable Wrist Curls was capped at 97.5 here until Aug 2026, with the
            // excess hung as one-sided plates. The personal app dropped that cap
            // when the user moved to a cable machine whose working weights are
            // nowhere near its ceiling, and this was the last copy of it. There
            // is now no capped machine in these rules at all: `cable wrist curl`
            // falls through to the generic wrist rule below and comes back a
            // plain stack. Reinstating a cap is one rule returning
            // `{ type: 'pin-stack', maxPin: N }` — the calculator still honours
            // it (see gympinCalculatePinStackBreakdown).

            // Plain pin-stack — any other movement that uses a stack.
            if (/recline/.test(n))                                 return { type: 'pin-stack' };
            if (/chest fl/.test(n))                                return { type: 'pin-stack' };
            // Matches "Chest Press" and "Incline Chest Press" alike — both are
            // pin stacks as of Aug 2026, as is Shoulder Press.
            if (/chest press/.test(n))                             return { type: 'pin-stack' };
            if (/shoulder press/.test(n))                          return { type: 'pin-stack' };
            if (/frontal plane|pulldown/.test(n))                  return { type: 'pin-stack' };
            if (/seated row/.test(n))                              return { type: 'pin-stack' };
            if (/lateral raise/.test(n))                           return { type: 'pin-stack' };
            // "Dips" / "Weighted Dips" are Jessi's historical names for the
            // movement now called Overhead Tricep Extensions. It is a pin stack,
            // matching the personal app; it was misclassified as plate-loaded
            // two-sided back when the display name was still "Dips".
            if (/\bdip|weighted dip|overhead tricep/.test(n))      return { type: 'pin-stack' };
            if (/tricep pushdown|pushdown|tricep ext/.test(n))     return { type: 'pin-stack' };
            if (/reverse.*wrist|wrist curl/.test(n))               return { type: 'pin-stack' };
            if (/ab crunch|crunch/.test(n))                        return { type: 'pin-stack' };
            if (/calf/.test(n))                                    return { type: 'pin-stack' };
            if (/leg extension|hip adduction/.test(n))             return { type: 'pin-stack' };
            // No /leg press/ rule here: it was a pin stack for part of Aug 2026
            // and is two-side plate-loaded again, up in the plate block. Note
            // /leg extension/ above does NOT catch "Leg Press", so removing the
            // rule leaves the name to the plate block rather than to `null`.

            return null;
        }

        // How a machine is loaded. A per-exercise USER setting, chosen in
        // Settings > Manage Exercises and stored on the exercise alongside
        // `name`, `sets`, `minReps` and `maxReps`.
        //
        // getWeightBreakdownConfig above is no longer the authority — it is the
        // DEFAULT. It guesses from the display name, which is the only thing
        // available for an exercise the user typed in themselves, and it is
        // right often enough to be a good starting point. But it is guessing
        // about someone else's gym: two people with a machine called "Chest
        // Press" may have a stack and a plate sled respectively, and no regex
        // can tell them apart. The dropdown is how they correct it.
        const LOAD_TYPES = ['pin', 'plate-one-sided', 'plate-two-sided'];

        // The effective load type: the user's choice if they made one, else
        // whatever the name-based rules guess, else a plain pin stack. Note the
        // final fallback matters more here than in the personal app — there is
        // no fixed roster, so a custom exercise named something the rules have
        // never seen is normal rather than exceptional.
        function resolveLoadType(exercise) {
            if (exercise && LOAD_TYPES.includes(exercise.loadType)) return exercise.loadType;
            const guess = getWeightBreakdownConfig(exercise && exercise.name);
            if (!guess) return 'pin';
            if (guess.type === 'plate-loaded') {
                return guess.plateMode === 'two-sided' ? 'plate-two-sided' : 'plate-one-sided';
            }
            return 'pin';
        }

        // Build the config the breakdown calculators expect from the resolved
        // load type.
        //
        // This used to copy a `maxPin` (and an `overflowPlateMode` that nothing
        // ever read) off the name-based guess. No rule produces a cap any more,
        // so both were dead weight and the pin branch is now a bare type. If a
        // capped machine reappears, give it a rule returning `maxPin` and carry
        // that through here — the calculator's cap handling was left intact.
        function breakdownConfigFor(exercise) {
            const loadType = resolveLoadType(exercise);
            if (loadType === 'plate-two-sided') return { type: 'plate-loaded', plateMode: 'two-sided' };
            if (loadType === 'plate-one-sided') return { type: 'plate-loaded', plateMode: 'one-sided' };
            return { type: 'pin-stack' };
        }

        // Break `weight` into the largest combination of standard plates that
        // doesn't exceed it. Used for plate-loaded sets, and for the overflow
        // portion of a capped pin stack if one ever exists again — no rule
        // produces a cap today. Returns { 45: count, 25: count, ... }.
        function gympinBreakdownPlatesFloor(weight) {
            const available = [45, 25, 10, 5, 2.5, 1.25];
            const plates = {};
            let remaining = weight;
            for (const p of available) {
                const count = Math.floor(remaining / p);
                if (count > 0) {
                    plates[p] = count;
                    remaining = parseFloat((remaining - count * p).toFixed(2));
                }
            }
            return plates;
        }

        // Plate-loaded breakdown.
        //
        // Warmups round to a load you can actually BUILD, rather than to a
        // round number. A warmup per-side load is any number of 45s plus at
        // most ONE each of 25, 10 and 5. Stacking two of the same small plate
        // is the fiddly part of loading a warmup you do not care about, so
        // 45+10+10 is not offered — 45+25 is, and it is the same trip to the
        // rack. Micro-plates (2.5, 1.25) never appear on a warmup at all; they
        // exist to hit an exact working weight, which is the top set's job.
        //
        // The top set is NEVER rounded. It always shows the exact working
        // weight, micro-plates and all.
        //
        // Replaced a nearest-10 rule in Aug 2026, matching the personal app.
        function gympinCalculatePlateBreakdown(totalWeight, config) {
            const isTwoSided = config.plateMode === 'two-sided';

            const WARMUP_SMALLS = [25, 10, 5];

            // Every total the small plates can make, each used at most once:
            // 0, 5, 10, 15, 25, 30, 35, 40. Note 20 is missing — it would need
            // two 10s or 10+5+5 — which is why some loads are simply not
            // offered as warmups.
            const smallSums = (() => {
                const out = new Set([0]);
                for (let mask = 1; mask < (1 << WARMUP_SMALLS.length); mask++) {
                    let sum = 0;
                    WARMUP_SMALLS.forEach((plate, i) => { if (mask & (1 << i)) sum += plate; });
                    out.add(sum);
                }
                return Array.from(out).sort((a, b) => a - b);
            })();

            // Every loadable warmup value up to a ceiling, with its plate count.
            const loadableUpTo = (ceiling) => {
                const out = [];
                const maxFortyFives = Math.max(0, Math.floor(ceiling / 45) + 1);
                for (let k = 0; k <= maxFortyFives; k++) {
                    for (const r of smallSums) {
                        let n = k, rest = r;
                        for (const plate of WARMUP_SMALLS) {
                            if (rest >= plate) { rest -= plate; n++; }
                        }
                        out.push({ value: k * 45 + r, plates: n });
                    }
                }
                return out;
            };

            // Nearest loadable value. Ties go to the load that uses FEWER
            // plates — 65 sits equally between 45+10+5 and 45+25, and the
            // two-plate answer is the better trip to the rack.
            const roundWarmupPerSide = (weight) => {
                const candidates = loadableUpTo(weight + 45);
                let best = null;
                for (const c of candidates) {
                    if (best === null) { best = c; continue; }
                    const d = Math.abs(c.value - weight);
                    const bd = Math.abs(best.value - weight);
                    // A tie has to be judged with a tolerance, not with ===.
                    // The target is a percentage of a decimal weight, so a
                    // genuine tie arrives as 109.99999999999999 rather than 110
                    // and the tie-break never runs — which quietly picked the
                    // four-plate load over the three-plate one.
                    const tied = Math.abs(d - bd) < 1e-6;
                    if ((!tied && d < bd)
                        || (tied && c.plates < best.plates)
                        || (tied && c.plates === best.plates && c.value > best.value)) {
                        best = c;
                    }
                }
                return best ? best.value : 0;
            };

            // The largest loadable value strictly below `limit`, or 0 if there
            // is none. Keeps the ramp honest at light weights, where the old
            // rule let warmup 2 catch — or even pass — the top set.
            const largestLoadableBelow = (limit) => {
                const under = loadableUpTo(limit + 45)
                    .filter((c) => c.value < limit && c.value > 0)
                    .sort((a, b) => (b.value - a.value) || (a.plates - b.plates));
                return under.length ? under[0].value : 0;
            };

            const topSetPerSide = isTwoSided ? totalWeight / 2 : totalWeight;
            let warmup2PerSide = roundWarmupPerSide(
                isTwoSided ? (totalWeight * 0.9) / 2 : totalWeight * 0.9);
            let warmup1PerSide = roundWarmupPerSide(
                isTwoSided ? (totalWeight * 0.7) / 2 : totalWeight * 0.7);

            // A ramp has to ascend. Rounding to a coarse grid can push a warmup
            // up onto — or past — the set above it. Step each one down to the
            // next loadable value instead. Zero means there is no honest warmup
            // at this weight, and the card leaves the row out.
            if (warmup2PerSide >= topSetPerSide) {
                warmup2PerSide = largestLoadableBelow(topSetPerSide);
            }
            if (warmup1PerSide >= warmup2PerSide) {
                warmup1PerSide = largestLoadableBelow(warmup2PerSide);
            }

            const set = (ps) => ({
                totalWeight: isTwoSided ? ps * 2 : ps,
                perSideWeight: ps,
                plates: gympinBreakdownPlatesFloor(ps),
            });

            return {
                isTwoSided,
                warmup1: set(warmup1PerSide),
                warmup2: set(warmup2PerSide),
                topSet: set(topSetPerSide),
            };
        }

        // Pin-stack breakdown.
        //
        // A set above `config.maxPin` shows "pin at max + plates for the excess"
        // (plates rounded DOWN to clean combinations). Nothing sets a cap since
        // Aug 2026, so `maxPin` is always null in practice and every set takes
        // the plain branch; the handling is kept because it is what a
        // reintroduced cap would hang off, and it costs one `|| null`.
        function gympinCalculatePinStackBreakdown(totalWeight, config) {
            const maxPin = (config && config.maxPin) || null;

            // The precise rounding, for the TOP set only: that one IS the
            // working weight and has to be reachable exactly.
            const roundPin = (weight) => {
                const base = Math.floor(weight / 5) * 5;
                const r = weight - base;
                if (r < 0.625)      return base;
                else if (r < 1.875) return base + 1.25;
                else if (r < 3.125) return base + 2.5;
                else if (r < 4.375) return base + 3.75;
                else                return base + 5;
            };

            // Warmups sit on a ROUND pin position: nearest 10 lb.
            //
            // The stack moves in 5 lb steps, so every multiple of 10 is a real
            // position and no micro-plate is ever needed. Rounding to the exact
            // percentage instead is what produced warmups like 71.25 lb — a
            // 1.25 plate balanced on the pin for a set you do not care about.
            const roundWarmupPin = (weight) => Math.round(weight / 10) * 10;

            // `exact` skips the pin rounding for a value already known to be a
            // legal position, so a warmup is not rounded twice.
            const buildSet = (target, exact) => {
                if (maxPin === null || target <= maxPin) {
                    const w = exact ? target : roundPin(target);
                    return { overflow: false, pinWeight: w, totalWeight: w };
                }
                const plates = gympinBreakdownPlatesFloor(target - maxPin);
                const plateTotal = Object.entries(plates)
                    .reduce((sum, [plate, count]) => sum + parseFloat(plate) * count, 0);
                return {
                    overflow: true,
                    pinWeight: maxPin,
                    plates,
                    totalWeight: parseFloat((maxPin + plateTotal).toFixed(2)),
                };
            };

            const topSet = buildSet(totalWeight, false);

            // A ramp has to ascend. Rounding to 10 can push a warmup onto — or
            // past — the set above it: at a 30 lb working weight the 90% warmup
            // rounds to exactly 30. Step down to the next position below
            // instead, and let zero mean there is no honest warmup here, which
            // the card renders by leaving the row out.
            const below = (limit) => Math.floor((limit - 0.001) / 10) * 10;
            let warmup2Weight = roundWarmupPin(totalWeight * 0.9);
            let warmup1Weight = roundWarmupPin(totalWeight * 0.7);
            if (warmup2Weight >= topSet.totalWeight) warmup2Weight = below(topSet.totalWeight);
            if (warmup1Weight >= warmup2Weight) warmup1Weight = below(warmup2Weight);
            warmup2Weight = Math.max(0, warmup2Weight);
            warmup1Weight = Math.max(0, warmup1Weight);

            const empty = { overflow: false, pinWeight: 0, totalWeight: 0 };

            return {
                warmup1: warmup1Weight > 0 ? buildSet(warmup1Weight, true) : empty,
                warmup2: warmup2Weight > 0 ? buildSet(warmup2Weight, true) : empty,
                topSet,
            };
        }

