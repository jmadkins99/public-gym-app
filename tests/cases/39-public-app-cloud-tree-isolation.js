// What this test covers
// ----------------------
// Cloud data isolation from the personal app. This app's Firestore repo must
// root at `publicUsers/{uid}`, never at the personal app's `users/{uid}` — the
// same Firebase project serves both, and if they ever share a root, a coach
// signing into this app with the personal account would let the wizard
// overwrite the personal app's cloud config (this collision was caught in
// review the day the public sync shipped; this test keeps it dead).
//
// This is the public half of what was gym-tracker's case 39, which checked
// both apps from one repo. Since Oct 2026 each repo pins its own root: this
// one here, the personal app's in gym-tracker's case 39.
//
// The deeper guarantees (per-uid scoping, email allowlists) are enforced by
// Firestore security rules on Google's servers and are intentionally outside
// this suite (no Firebase creds here); the Firestore emulator is the tool if
// rules-level tests are ever wanted. This case pins the one collision class
// that lives in OUR code: the collection roots.
//
// Static source check on purpose — the Firestore paths are unreachable in
// tests (no creds), so asserting the source is the strongest check available.

const { ok } = require('../lib/assert');
const { publicAppSource } = require('../lib/paths');

const publicApp = publicAppSource();

ok(publicApp.includes(".collection('publicUsers')"),
    "the public app roots its cloud data at collection('publicUsers')");
ok(!publicApp.includes(".collection('users')"),
    "the public app must never reference the personal collection('users') tree");

console.log('PASS: the public app keeps its cloud data under publicUsers, never users.');
