# Public Gym App

A fully customizable workout tracking web application. Simple, fast, and works offline.

## Status

✅ **App is complete and ready to use!**

Future updates will include new features, templates, and refinements based on user feedback.

## Features

- **Setup Wizard**: 4-step onboarding to configure your workout schedule and exercises
- **Coached Programs**: Access pre-configured workout programs if you're working with a coach. A coach code builds the whole program on one load — days, order, goal ranges, weekday map, and how each machine is loaded — so a client never sees a half-configured app.
- **Custom Schedules**: 1-7 workout days per week with custom day names
- **Exercise Library**: 70+ common exercises with autocomplete, or create your own
- **Cardio Support**: Dedicated fields for cardio exercises (Intensity levels 1-15, Time tracking)
- **Sets & Rep Ranges**: Configure goal sets and rep ranges for each exercise
- **Quick Start Guide**: Tutorial walks new users through logging workouts
- **PR Streaks and Badges**: With PR tracking on, a gold-outlined flame pill beside the exercise name counts consecutive improvements — the session you started from is the baseline, not a notch on the streak, so one better session after a flat stretch reads 1. It appears at one. A session extends the streak if the weight went up, or the weight held and the reps went up; it breaks on an identical session, a weight drop, or fewer reps at the same weight. A weight increase otherwise always extends it — hitting the top of your rep range bumps the weight and restarts lower in the range, so treating that as backsliding would cap every streak at the width of the range. The exception is the bottom of your reps dropdown, if you have one: that is where a set died rather than a number you trained for, so it is never a PR however much weight was on the machine, and it ends a streak. It still stands as the baseline for the next session. Counts submitted sessions, so the pill moves on Submit Day rather than on LOG. Logged cards, Submit Day details, and History rows show a badge when that exercise improved against the previous session: "🔥 PR" for a lone improvement, "🔥 N" once the run is two or more, counted as of that session so an older History row keeps the number it earned. Logging a PR holds the card for a two-second gold aura, pulse, and shimmer before advancing. History does not wait for Submit Day — today's in-progress entry is in that list too, so the badge appears as soon as the set is logged, and cannot change when the day is submitted because the baseline it compares against is always an older session.
- **Weight Progression**: Hit the top of your rep range and the card suggests the next weight, highlighted green. How far it steps is the exercise's PR Increment, chosen from 1.25, 2.5, 5 or 10 lb in Settings → Manage Day N Exercises → ✏️, under How It's Loaded; untouched, it is 2.5. On a machine loaded on both sides a step that won't split onto real plates is doubled, and the form says so. Six identical sessions in a row show a gold "Plateau detected" hint.
- **Weight Breakdown**: every exercise has a button showing two warmup sets at roughly 70% and 90% of your working weight. What it shows depends on how that machine is loaded, which you set per exercise in Settings → Manage Day N Exercises → ✏️ → How It's Loaded: **Pin-loaded** gives achievable pin and micro-plate weights, **Plate-loaded on both sides** gives an exact plate breakdown split per side, and **Plate-loaded on one side** gives the plate breakdown as a single pile. The app guesses from the exercise name to start with, and the dropdown is how you correct it — no two gyms have the same machines, and a name can't tell them apart. The panel is also what starts an exercise's clock: its time runs from opening the panel to tapping LOG. If your phone reloads the tab between sets, the app comes back on the card that was open, still open and still timed from the original tap.
- **History**: View all past workouts by week, newest first. Each day can be edited from its pencil, including filling in an exercise that day never logged, and the ⏱️ beside it shows that session's timing
- **Exercise Management**: Rename and reorder exercises in settings
- **Backup/Restore**: Export and import your data
- **Offline First**: All data stored locally in your browser
- **Mobile Responsive**: Optimized layouts for phone and desktop
- **Daily Accent Color**: The app's accent color changes once a day, cycling a bank of ten

## Appearance

The accent color changes once a day, the same color for everyone using the app. It is the family the whole UI hangs off — LOG buttons, active day pills, section titles, field labels, gradients, Submit Day — and it is keyed to the calendar date, so it is stable all day and flips at local midnight. There is nothing to configure and no per-user setting.

Each palette holds the original purple's exact OKLCH lightness and chroma across all six shades and rotates hue only, so every color reads as equally dark and equally desaturated, and none is harder to read than the purple was. Backgrounds never change. Gold PRs, gold hints and the red NA button are fixed, since they carry meaning.

The order is reshuffled every cycle rather than being a fixed carousel, with two invariants: all ten appear before any repeats, and the same color never lands two days running. On localhost the UI still rotates but the favicon stays white, so a dev tab is never confused with the live one.

`js/accentColor.js` is kept byte-identical to the personal app's copy so the two banks cannot drift apart.

## How It Works

1. **First Launch**: Complete the 4-step setup wizard to configure your schedule and exercises
   - Choose "Get Started" to build a custom program from scratch
   - Choose "I Have a Coach" to load a pre-configured program from your coach
2. **Log Workouts**: Enter your weight/reps, tap LOG to save each set
3. **Submit Day**: Tap "Submit Day" when finished to lock your workout
4. **Track Progress**: Review past sessions, PR badges and timing in the History tab

## Usage

Simply open `index.html` in a web browser. No build process or dependencies required.

**Tech Stack**: React and Babel from a CDN, split into modules under `js/` and loaded by `index.html`, with no build step. Data lives in localStorage.

## Data & Privacy

- All data is stored locally in your browser (localStorage)
- Signing in with Google from Settings is optional and syncs your data across devices; without it nothing leaves the browser
- No tracking
- Use backup/restore to save your data externally or transfer between devices

## Future Updates

Planned additions include:
- Workout templates for common programs
- Additional exercise type customizations
- Community-contributed features
