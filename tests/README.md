# Tests

Integration tests for `public-gym-app`. They drive the app in a headless
Chrome browser, seed realistic state, and verify what the user actually sees.

These cases lived in the sibling `gym-tracker` repo until Oct 2026, where one
suite covered both apps. They moved here so a change and its test land in one
PR, and so this repo's CI needs nothing else checked out. The files kept their
names and numbers (`02-public-app-…`), so the gaps in the numbering are
gym-tracker's cases.

## Run the tests

```bash
cd tests
bash run.sh                # everything
bash run.sh --affected     # only the cases your changes can reach (see below)
bash run.sh 127            # just case 127
bash run.sh jessi          # every case with "jessi" in its name
TEST_JOBS=1 bash run.sh 15 # one at a time
TEST_SHARD=2/4 bash run.sh # every 4th case from the 2nd: one of CI's four slices
```

Cases run **6 at a time**. Results are reported in filename order however
they finish, and each case's output is buffered and printed whole, so a
failure's diagnostics never interleave with another case's. The argument is a
substring match on the case name; a filtered run says so in its header and
footer, so it can't be mistaken for a full one.

`--affected` reads the map in `.coverage/` (rebuilt by every run from what
each case actually reads, never by hand) and runs only the cases that read a
file changed since `.coverage/_base`. It falls back to the full suite whenever
it can't vouch for a change: a `tests/` edit, a file no case reads, or no map
yet. It is the everyday check before a commit.

First run installs the dependencies into `tests/node_modules`.

**Waiting.** Cases wait for conditions, not clocks — `waitForApp`,
`waitForStorageKey` and `waitFor` in `lib/browser.js`. When you add a case,
wait for the thing you actually need and give `waitFor` a label, because that
label is the entire error message when it times out.

### Requirements

- **Chrome or Chromium.** `puppeteer-core` never downloads a browser of its
  own. `lib/browser.js` checks the usual system paths plus Playwright's cache
  at `/opt/pw-browsers/chromium`; set `CHROME_PATH` if yours is elsewhere.
- **No network at run time.** React, ReactDOM and `@babel/standalone` come
  from `tests/node_modules` — see below.

### Why tests/node_modules holds React

The app loads React and Babel from `unpkg.com` in plain `<script>` tags.
That is fine on a phone, but it makes the suite depend on a third-party CDN, and sandboxed CI containers often
block that egress — every browser case then dies at `waitForApp` with nothing
but a selector timeout to explain it. `lib/cdn.js` intercepts those requests
and answers them from `node_modules`. `index.html` keeps its CDN tags, so
production is untouched and the suite is hermetic.

The versions in `package.json` must track what `index.html` asks for. `react`
is pinned to `^18` because React 19 dropped the UMD builds entirely;
`@babel/standalone` to `^7` because it has since moved to 8.x while
`index.html` still requests 7.

## CI

`.github/workflows/tests.yml` runs the full suite on every branch push, split
four ways with `TEST_SHARD`, and the "protect main" ruleset will not merge a
PR until that run is green on a branch that is up to date with `main`. That
is the gate; there is no pre-push hook. The merge push to `main` skips the
shards (it is exactly the tested code) and deploys Pages.

## What each test covers

Every case file opens with a `// What this test covers` header explaining its
invariant and, usually, the mutation that proves it real. Read that first —
it is what tells you whether a failure is a regression or an intentional
behaviour change. The ones you are most likely to touch:

**Jessi's program** is one table, `JESSI_PROGRAM` in `js/migrations.jessi.js`;
`125` and `126` pin her split and its migration, `33` her coach-code path, and
`119` her schedule rule.

**Coach presets.** `63-…-ian-coach-code.js` and `64-…-ian-not-clawed-back.js`
cover Ian's program. `64` was written when three Jessi one-shots identified an
install by the *shape* of its config — categories of exactly
Anterior/Posterior — which Ian's program shares. Those one-shots were retired
with Jessi's Sep 2026 Full Body switch (revision 16), and the guard now covers
**every** other client: `126` runs Lexi, Grace, Noah, Shawn, Ian and
self-serve programs through the migrations in memory, stamped and unstamped,
and pins their presets to `fixtures/public-app-other-client-presets.json`;
`127` installs each through the real coach-code wizard and requires their
saved program never changes.

**The Weight Breakdown is for everyone.** It used to be hidden behind an
`exerciseConfig.gympinMode` flag that only Jessi had; that flag, its
`?gympin=on` URL toggle and its one-shot enabler are gone, and
`09-…-breakdown-for-everyone.js` guards the opposite property, including that
a stale `gympinMode: false` in a restored backup cannot suppress it. Because
anyone can type their own exercise name, the name-based
`getWeightBreakdownConfig` survives as the **default** rather than the
authority — `62-…-load-type-changes-breakdown.js` covers both a movement the
rules recognise and one they have never seen.

**Cloud isolation.** `39-public-app-cloud-tree-isolation.js` pins this app's
Firestore root to `publicUsers`, never the personal app's `users`. It is the
public half of what was gym-tracker's case 39; the personal half stayed there.

## How to add a new test

1. Create `cases/NNN-public-app-something-meaningful.js`, using an existing
   case as a template.
2. Write the `// What this test covers` header first: the invariant, and the
   mutation that proves the test real.
3. Build the minimum state with `lib/state.js` (`seedPublicApp`,
   `workoutEntry`, the `jessi*` configs). If you need a new helper, add it
   there.
4. Assert with `lib/assert.js` (`eq`, `ok`, `contains`), each with a message
   that reads like a sentence.
5. Run it: `node cases/NNN-….js`, then **mutation-test it**: break the code it
   protects, confirm it fails, revert. A test that passes when the code is
   wrong is worse than no test.

## Directory layout

```
tests/
├── README.md          (you are here)
├── package.json       (puppeteer-core + the CDN libraries the app loads)
├── run.sh             (the runner: filters, --affected, TEST_SHARD)
├── lib/
│   ├── assert.js      (eq / ok / contains)
│   ├── browser.js     (puppeteer launch + page helpers)
│   ├── cdn.js         (serves the CDN libraries from node_modules)
│   ├── coverage.js    (records what each case reads, for --affected)
│   ├── deck.js        (swipe-deck navigation helpers)
│   ├── paths.js       (where the app is: this repo's root)
│   ├── select.js      (picks the --affected cases)
│   ├── server.js      (tiny static HTTP server)
│   └── state.js       (localStorage seed helpers + Jessi configs)
├── cases/             (each file is one test; runs independently)
└── fixtures/          (other clients' presets, for 126)
```

The helpers started as copies of gym-tracker's and have since been trimmed to
what these cases use, so a fix to a shared helper may need making in both
repos.
