// What this test covers
// ----------------------
// A dropdown client's reps dropdown follows each exercise's own rep range, the
// personal app's rule: one below min reps (the failed-set bottom) up to max
// reps. Settings already edits minReps/maxReps; until Oct 2026 the dropdown
// ignored them and always showed the client's fixed 5-8.
//
// Asserts:
//   1. An untouched 6-8 exercise still offers 5-8, so Jessi and Ian see no
//      change on load.
//   2. A 7-10 exercise offers 6-10, and a fresh session starts at 7.
//   3. An unusable range (blank min) falls back to the client's 5-8.
//   4. LOG stamps the bottom the set was done under as repsFloor (6 here).
//   5. isFailedSet judges a set by its stamp, and a set from before the stamp
//      by the client's dropdown bottom, so editing a range never rewrites old
//      PR badges or streaks.
//   6. A client with no repsDropdown (every wizard client) gets one too, from
//      the exercise's range: 8-12 offers 7-12. Defaulting is Jessi's: a
//      prTracking "Strength Gains" weight bump resets to min reps, otherwise
//      last session's reps carry over. A blank range keeps free typing, and an
//      unstamped set of theirs is never a failed set.
//
// To verify this is real: make getRepsDropdownRange always return
// repsDropdown — assertions 2 and 6 fail. Or drop the repsFloor branch
// from isFailedSet — assertion 5 fails.

const { start } = require('../lib/server');
const { launch, waitForApp, attachConsole } = require('../lib/browser');
const { seedPublicApp, jessiDefaultSchedule, workoutEntry } = require('../lib/state');
const { eq, ok } = require('../lib/assert');

const { PUBLIC_APP_ROOT } = require('../lib/paths');
const { ACTIVE, goToCard, revealCard } = require('../lib/deck');

const CONFIG = {
    version: 2,
    categories: ['Full Body'],
    repsDropdown: { min: 5, max: 8 },
    minimalistPrTracking: true,
    days: {
        1: [
            { id: 'rdefault', name: 'Chest Flies',  category: 'Full Body', order: 0, type: 'standard', sets: 1, minReps: 6, maxReps: 8 },
            { id: 'rwide',    name: 'Leg Press',    category: 'Full Body', order: 1, type: 'standard', sets: 1, minReps: 7, maxReps: 10 },
            { id: 'rblank',   name: 'Calf Raises',  category: 'Full Body', order: 2, type: 'standard', sets: 1, minReps: '', maxReps: 8 },
        ],
    },
};

// A wizard client: prTracking, no repsDropdown.
const OTHER_CONFIG = {
    version: 2,
    categories: ['Push'],
    prTracking: true,
    days: {
        1: [
            { id: 'obump',  name: 'Bench Press',   category: 'Push', order: 0, type: 'standard', sets: 3, minReps: 8, maxReps: 12 },
            { id: 'ocarry', name: 'Cable Fly',     category: 'Push', order: 1, type: 'standard', sets: 3, minReps: 8, maxReps: 12 },
            { id: 'oblank', name: 'Dip Machine',   category: 'Push', order: 2, type: 'standard', sets: 3, minReps: '', maxReps: '' },
        ],
    },
};

const OTHER_HISTORY = [
    workoutEntry({
        date: '2026-07-20',
        day: 1,
        exercises: [
            { id: 'obump',  name: 'Bench Press', weight: '135', reps: '12', minReps: 8, maxReps: 12 },
            { id: 'ocarry', name: 'Cable Fly',   weight: '40',  reps: '9',  minReps: 8, maxReps: 12 },
        ],
    }),
];

async function readReps(page, name) {
    await goToCard(page, name);
    await revealCard(page);
    return page.evaluate((sel) => {
        const card = document.querySelector(sel);
        const select = card?.querySelector('select[data-field="reps"]');
        if (select) return { value: select.value, options: Array.from(select.options).map(o => o.value) };
        return card?.querySelector('input[type="number"][inputmode="numeric"]') ? { freeType: true } : null;
    }, ACTIVE);
}

(async () => {
    const server = await start({ root: PUBLIC_APP_ROOT });
    const browser = await launch();
    try {
        const page = await browser.newPage();
        const errors = attachConsole(page);
        await page.goto(server.url + '/index.html', { waitUntil: 'networkidle0' });

        await seedPublicApp(page, {
            exerciseConfig: CONFIG,
            workoutHistory: [],
            schedule: jessiDefaultSchedule(),
        });
        await page.reload({ waitUntil: 'networkidle0' });
        await waitForApp(page);

        // 1. Untouched 6-8 matches the client dropdown exactly.
        const def = await readReps(page, 'Chest Flies');
        ok(def, 'Chest Flies has a reps <select>');
        eq(def.options, ['5', '6', '7', '8'], 'a 6-8 exercise still offers 5-8');

        // 3. Blank min falls back to the client's dropdown.
        const blank = await readReps(page, 'Calf Raises');
        eq(blank.options, ['5', '6', '7', '8'], 'an unusable range falls back to the client 5-8');

        // 2. 7-10 offers 6-10 and starts at min reps.
        const wide = await readReps(page, 'Leg Press');
        eq(wide.options, ['6', '7', '8', '9', '10'], 'a 7-10 exercise offers 6-10');
        eq(wide.value, '7', 'a first session starts at min reps');

        // 4. LOG stamps the bottom it was done under.
        await page.evaluate((sel) => {
            const card = document.querySelector(sel);
            const input = card.querySelector('input[inputmode="decimal"], input[type="number"]:not([inputmode="numeric"])');
            if (input) {
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(input, '200');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            Array.from(card.querySelectorAll('button')).find(b => b.textContent.trim() === 'LOG').click();
        }, ACTIVE);
        await new Promise(r => setTimeout(r, 600));
        const saved = await page.evaluate(() => {
            const hist = JSON.parse(localStorage.getItem('gym-local:gymWorkoutHistory') || '[]');
            for (const w of hist) {
                const ex = (w.exercises || []).find(e => e.id === 'rwide');
                if (ex) return ex;
            }
            return null;
        });
        ok(saved, 'LOG wrote a Leg Press entry');
        eq(saved.repsFloor, 6, 'the entry carries the 6 bottom it was logged under');

        // 5. Verdicts follow the stamp; unstamped sets keep the client floor.
        const verdicts = await page.evaluate(() => ({
            stampedAtFloor:   isFailedSet({ reps: '6', repsFloor: 6 }),
            stampedAbove:     isFailedSet({ reps: '7', repsFloor: 6 }),
            stampedLowFloor:  isFailedSet({ reps: '5', repsFloor: 4 }),
            legacyAtFloor:    isFailedSet({ reps: '5' }),
            legacyAbove:      isFailedSet({ reps: '6' }),
        }));
        eq(verdicts, {
            stampedAtFloor: true,
            stampedAbove: false,
            stampedLowFloor: false,
            legacyAtFloor: true,
            legacyAbove: false,
        }, 'isFailedSet reads the stamp, and the client 5 floor for unstamped sets');

        // 6. A client with no repsDropdown.
        await seedPublicApp(page, {
            exerciseConfig: OTHER_CONFIG,
            workoutHistory: OTHER_HISTORY,
            schedule: jessiDefaultSchedule(),
        });
        await page.reload({ waitUntil: 'networkidle0' });
        await waitForApp(page);

        const bump = await readReps(page, 'Bench Press');
        ok(bump && bump.options, 'a client with no repsDropdown gets a reps <select>');
        eq(bump.options, ['7', '8', '9', '10', '11', '12'], 'its 8-12 range offers 7-12');
        eq(bump.value, '8', 'prev 12 hit max -> weight bump, reps reset to min reps');

        const carry = await readReps(page, 'Cable Fly');
        eq(carry.value, '9', 'prev 9 carries over');

        const free = await readReps(page, 'Dip Machine');
        eq(free, { freeType: true }, 'a blank range keeps the free-type input');

        const otherFloor = await page.evaluate(() => isFailedSet({ reps: '7' }));
        eq(otherFloor, false, 'an unstamped set is never failed for a client with no repsDropdown');

        eq(errors, [], 'no console errors');
        console.log('PASS: every client\'s reps dropdown follows each exercise\'s rep range.');
    } finally {
        await browser.close();
        await server.stop();
    }
})().catch(err => {
    console.error('FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
