# Public Gym App

**🚧 Work in Progress 🚧**

A fully customizable workout tracking web application for experienced lifters. Single-file React app with local storage persistence.

## Current Status

**Phase 1: Setup Wizard & Foundation** ✅ Complete
- First-launch setup wizard with 4 steps
- Custom 1-7 day workout schedule configuration
- Exercise builder with autocomplete dropdown (70+ common exercises)
- Data migration for existing users
- Backup/restore functionality

**Phase 2: Main App Refactor** ✅ Complete
- Core app now uses custom workout schedules from wizard
- Dynamic day rendering (1-7 workout days supported)
- Full integration of customizable exercise system
- Refactored WorkoutView, WeeklyView, ProgressView, and SettingsModal for dynamic day support
- All localStorage operations use version 2 format (backward compatible)
- Dynamic category rendering based on exercise configuration
- Custom day names displayed instead of "Day 1", "Day 2"
- Sets and rep ranges (e.g., "3 sets × 8-12 reps") configurable per exercise in wizard
- Goal reminders displayed on exercise cards during workout
- Auto-selects first workout day on app load
- Help modal with examples in wizard
- Cardio exercise detection with Intensity (Level 1-15) and Time fields
- Removed all PR suggestion mechanics (now pure tracking app)

**Phase 3: Custom Exercise Types** ⏳ Planned
- Exercise Type Manager UI for creating/editing custom exercise types
- Field builder (add/remove/reorder fields, set input types)
- Display format customization
- Dynamic exercise rendering for any field configuration
- Generic chart support for custom numeric fields
- Examples: Bodyweight (reps only), Cardio (duration/distance/level), Isometric (time held)

**Phase 4: Polish & Testing** ⏳ Planned
- Comprehensive testing (migration, custom types, all schedule configurations)
- Mobile responsiveness optimization
- In-app documentation and tooltips
- "What's New" modal for migrated users
- User guide for customization features

## Features

### Current Features
- **Custom Schedules**: Define which days of the week you work out (1-7 days)
- **Flexible Programming**: Create unique workout days or repeat the same workout multiple times per week
- **Exercise Library**: Autocomplete dropdown with 70+ common exercises, or add your own
- **Dynamic Category Organization**: Exercises automatically grouped by categories (Upper, Lower, Push, Pull, etc.)
- **PR Tracking**: Automatic personal record detection and suggestions
- **Progress Charts**: Visual progress tracking for all exercises
- **Weekly History**: Complete workout history with calendar view
- **Exercise Management**: Rename exercises and reorder them per day
- **Data Persistence**: All data stored locally in your browser
- **Backup/Restore**: Export and import your workout data (includes schedule and configuration)

### Planned (Phase 3+)
- **Custom Exercise Types**: Define exercises beyond standard weight/reps (bodyweight, cardio, etc.)
- **Field Builder**: Add/remove/reorder fields for custom exercise types
- Full mobile responsiveness optimization
- In-app documentation and tooltips

## Tech Stack

- React (CDN)
- Vanilla JavaScript
- localStorage for data persistence
- Single HTML file (~3,300 lines)

## Usage

Simply open `index.html` in a web browser. No build process or dependencies required.

## Development Roadmap

1. ✅ Phase 1: Setup wizard and foundation
2. ✅ Phase 2: Core app refactoring for custom schedules
3. ⏳ Phase 3: Custom exercise types system
4. ⏳ Phase 4: Polish and mobile optimization

## Recent Changes

**Latest Updates:**
- ✅ Cardio exercise detection and custom fields (Intensity: Level 1-15, Time dropdown)
- ✅ Removed all PR suggestion mechanics (+1.25 lbs, auto-weight calculations)
- ✅ Fixed workout submission logic to allow logging next day's workout
- ✅ App is now a pure tracking tool without autoregulation

**Previous Cleanup:**
- ✅ Removed `DEFAULT_DAY_1_EXERCISES` and `DEFAULT_DAY_2_EXERCISES` hardcoded exercises
- ✅ Removed `WEEK_1_DEFAULTS` personal weight values
- ✅ Updated all code to use wizard-generated configurations
- ✅ App now requires wizard setup for all new users
- ✅ No personal workout data embedded in code

The app is now fully generic and ready for public use!

## License

MIT

---

**Note**: This is a public version of a personal gym tracking app, being refactored for broader use and customization.
