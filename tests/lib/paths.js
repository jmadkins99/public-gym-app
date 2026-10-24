// Where the app lives on disk: the root of this repo, one level above tests/.
//
// These tests lived in the sibling gym-tracker repo until Oct 2026 and found
// this app as `../public-gym-app` (or `../public_gym_app`) beside it. Moving
// them here is what lets a change and its test land in one PR, and lets CI run
// with nothing else checked out. The export names are unchanged, so no case
// had to change with the move.

const fs = require('fs');
const path = require('path');

// tests/lib -> tests -> repo root
const PUBLIC_APP_ROOT = path.resolve(__dirname, '..', '..');

// The app's full source, index.html plus every module under js/, concatenated.
//
// Several cases assert against the app's SOURCE rather than its behaviour —
// the Firestore collection roots (case 39) and the current Jessi split
// revision (41, 56) are both unreachable at runtime in a test. Those cases
// used to read index.html, which worked while the app was a single 7.7k-line
// file. The Aug 2026 split moved that code into js/*.js and js/components/*.jsx
// and broke all three at once, and the failure mode was worse than a break:
// case 39's negative assertions ("must never reference the personal tree")
// pass vacuously against a file the code has left.
//
// So read the whole tree, not one file. A constant moving between modules is
// then invisible to these checks, which is the right sensitivity — they care
// that the app says something, not which file says it.
function publicAppSource() {
    const out = [fs.readFileSync(path.join(PUBLIC_APP_ROOT, 'index.html'), 'utf8')];
    const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/[.]jsx?$/.test(entry.name)) out.push(fs.readFileSync(full, 'utf8'));
        }
    };
    walk(path.join(PUBLIC_APP_ROOT, 'js'));
    return out.join('\n');
}

module.exports = { PUBLIC_APP_ROOT, publicAppSource };
