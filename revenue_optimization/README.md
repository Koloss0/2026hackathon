# Bar Screen Ad Scheduling

A simulated ad scheduling system for screens across multiple areas in a venue — such as the main hall, bar, and patio. Your task is to implement the core scheduling logic: validating ad placements, calculating revenue, comparing schedules, and ultimately building an optimized ad schedule.

This project uses **test-driven development (TDD)**. The test suite is already written and defines all required behaviour. Your job is to make every test pass.

> **DO NOT modify any test files or any function signatures.** Evaluation is based on automated test runs, and your score is proportional to the number of tests that pass relative to other teams.

---

## Table of Contents

- [Getting Started](#getting-started)
- [How the System Fits Together](#how-the-system-fits-together)
- [Data Models](#data-models)
- [What to Implement](#what-to-implement)
  - [1. PlacementEngine](#1-placementengine-srcplacementenginets)
  - [2. RevenueEngine](#2-revenueengine-srcrevenueenginets)
  - [3. Scheduler](#3-scheduler-srcschedulerts)
- [Scheduling Rules](#scheduling-rules)
  - [Time Semantics](#time-semantics)
  - [Revenue & Decay](#revenue--decay)
  - [Decay Ordering](#decay-ordering)
  - [Schedule Comparison](#schedule-comparison)
- [Assumptions & Constraints](#assumptions--constraints)
- [Test Coverage](#test-coverage)
- [Project Structure](#project-structure)
- [Tips](#tips)

---

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

Tests live in the `tests/` folder. Your goal is to make all tests pass by implementing the functionality in the `src/` folder.

---

## How the System Fits Together

There are three classes to implement, each building on the last:

```
PlacementEngine
  └── validates whether ads can be placed in areas and checks scheduling constraints

RevenueEngine (uses PlacementEngine)
  └── calculates how much revenue each scheduled ad generates, accounting for advertiser decay

Scheduler (uses both PlacementEngine and RevenueEngine)
  └── validates full schedules and builds an optimized schedule across all areas
```

Think of it as a pipeline: **placement validity → revenue calculation → schedule optimization.**

---

## Data Models

All data models are defined in `src/placementEngine.ts`. You will use these throughout all three classes.

```typescript
interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: number;   // When the ad became available
    timeout: number;        // How long the ad is available after timeReceived
    duration: number;       // How many time units the ad runs for
    baseRevenue: number;    // Revenue before multipliers/decay
    bannedLocations: string[];  // Locations where this ad cannot be shown
}

interface Area {
    areaId: string;
    location: string;
    multiplier: number;     // Revenue multiplier for this area
    totalScreens: number;
    timeWindow: number;     // Total schedulable time for this area (0 to timeWindow)
}

interface ScheduledAd {
    adId: string;
    areaId: string;
    startTime: number;      // Inclusive
    endTime: number;        // Exclusive
}

type Schedule = Record<string, ScheduledAd[]>;
// Keys are areaIds. Each ScheduledAd.areaId must match the key it appears under.
```

---

## What to Implement

### 1. PlacementEngine (`src/placementEngine.ts`)

Handles ad placement validation and time-window checks.

| Method | Description |
|--------|-------------|
| `isAdCompatibleWithArea(ad, area)` | Return `true` if the ad is allowed to be played in the area. Use exact string matching for banned locations. |
| `getTotalScheduledTimeForArea(areaSchedule)` | Return the total scheduled duration across all ads in one area. This is the sum of `endTime - startTime` for each scheduled ad — not the span from first start to last end. |
| `doesPlacementFitTimingConstraints(ad, area, startTime)` | Return `true` only if the ad can start at `startTime`, starts within its allowed availability window, and fully fits within the area's time window. |
| `isAdAlreadyScheduled(adId, schedule)` | Return `true` if the ad has already been scheduled anywhere in the full schedule. |
| `canScheduleAd(ad, area, schedule, startTime)` | Return `true` only if the ad is compatible with the area, not already scheduled elsewhere, does not overlap an existing ad in that area, and fits all timing constraints. |
| `isAreaScheduleValid(area, areaSchedule, ads)` | Return `true` if the area schedule is valid: no overlaps, all ads exist in the ads list, all ads are allowed in this location, and all ads fit within the area's time window. |

---

### 2. RevenueEngine (`src/revenueEngine.ts`)

Handles advertiser-based scoring and diminishing returns.

| Method | Description |
|--------|-------------|
| `getAdvertiserScheduleCount(advertiserId, ads, schedule)` | Return how many scheduled ads belong to the given advertiser across the full schedule. Return `0` if the advertiser has no scheduled ads. |
| `calculateDiminishedRevenue(baseRevenue, advertiserScheduledCount, decayRate)` | Return the reduced revenue after applying diminishing returns. When `advertiserScheduledCount` is `0`, treat the placement as the first (k=1), so the multiplier is `1` and the result is the full `baseRevenue`. |
| `calculatePlacementRevenue(ad, areas, ads, schedule, decayRate)` | Return the final revenue for placing one ad in one area, including the area multiplier and advertiser decay. |
| `getAdvertiserDiversity(ads, schedule)` | Return the number of unique advertisers represented in the schedule. |
| `getAreaRevenue(area, areasArray, fullSchedule, ads, decayRate)` | Return the total revenue generated by the given area using the areas array, the full schedule, ad list, and decay rate. Revenue must account for the area’s multiplier and advertiser decay based on the full schedule, not just the target area. Return `0` when the given area's `areaId` is not a key in the schedule. |

---

### 3. Scheduler (`src/scheduler.ts`)

Validates and builds schedules across all areas.

| Method | Description |
|--------|-------------|
| `getNextAvailableStartTime(areaSchedule)` | Return the earliest free start time in the given area schedule. Return `0` if the schedule is empty. If there is a gap between ads, return the start of the earliest gap. |
| `isValidSchedule(schedule, areas, ads)` | Return `true` if the full schedule is valid across all areas: no ad appears more than once, no unknown area keys, each `areaId` matches its bucket, and every area schedule satisfies all timing and placement rules. |
| `compareSchedules(ads, areas, scheduleA, scheduleB, decayRate)` | Compare two valid schedules. Return a positive number if `scheduleA` is better, negative if `scheduleB` is better, or `0` if equivalent. See [Schedule Comparison](#schedule-comparison) for tie-breaking rules. |
| `buildSchedule(ads, areas, decayRate)` | Build and return a complete, valid schedule across all areas that maximizes total revenue. |

---

## Scheduling Rules

### Time Semantics

- `startTime` is **inclusive**; `endTime` is **exclusive**.
- An ad with `startTime: 0` and `endTime: 10` runs during time units 0–9 (10 units total). It does **not** run at time unit 10.
- Duration = `endTime - startTime`.
- Two ads in the same area do not overlap if the first has `endTime: E` and the next has `startTime >= E` (touching boundaries are valid).
- An area's valid time range is `[0, area.timeWindow)`. An ad's `endTime` must be ≤ `area.timeWindow`.

### Core Constraints

- Each ad may only appear **once** in the entire schedule.
- You are **not** required to schedule every ad.
- An ad must start between `timeReceived` and `timeReceived + timeout` (inclusive on both ends).
- Each ad runs for exactly `duration` time units once scheduled.
- Only one ad may run in an area at any given time.
- Ads may run simultaneously in **different** areas.
- Ads cannot be placed in a location listed in their `bannedLocations`.
- A valid schedule must not contain unknown area keys, and each scheduled ad's `areaId` must match the bucket it appears in.

### Revenue & Decay

The base placement revenue for an ad is:

```
baseRevenue × area.multiplier
```

When multiple ads from the same advertiser are scheduled, later ads earn reduced revenue via a decay multiplier. For the k-th scheduled ad from the same advertiser:

```
revenue multiplier = decayRate^(k - 1)
```

**Examples:**

| `decayRate` | 1st ad | 2nd ad | 3rd ad |
|-------------|--------|--------|--------|
| `1.0`       | ×1     | ×1     | ×1     |
| `0.5`       | ×1     | ×0.5   | ×0.25  |
| `0.0`       | ×1     | ×0     | ×0     |

When `advertiserScheduledCount` is `0`, treat the placement as the first ad (k=1), so the multiplier is `1` and the full `baseRevenue` applies.

### Decay Ordering

When calculating decay for an advertiser's ads, sort them using this deterministic order:

1. **`startTime` ascending** — earlier start comes first (full revenue); later start is decayed.
2. **Raw placement revenue ascending** (`baseRevenue × area.multiplier`) — when start times tie, lower raw placement revenue comes first; higher raw placement revenue is decayed.
3. **`adId` lexicographically ascending** — when start time and raw revenue both tie, break by smaller `adId`.

**Examples (same advertiser, `decayRate = 0.5`):**

| Tie-breaker | Scenario | 1st (full revenue) | 2nd (×0.5) |
|-------------|----------|--------------------|------------|
| **1. startTime** | Ad A at startTime 0, Ad B at startTime 20 | A (earlier) | B |
| **2. raw revenue** | Both at startTime 0: A has baseRevenue×multiplier = 100, B has baseRevenue×multiplier = 200 | A (lower first) | B |
| **3. adId** | Both at startTime 0, both raw placement revenue is 100: adId "ad_a" and "ad_b" | "ad_a" (lex smaller) | "ad_b" |

So: if two ads from the same advertiser are scheduled at the **same time**, the one with **higher** `baseRevenue × multiplier` is ordered second and gets decayed.

### Schedule Comparison

**Unused time** for a schedule is the sum over all areas of `area.timeWindow` minus the total scheduled duration in that area.

Prefer the better schedule using this tie-breaking order:

1. **Higher total revenue** is better
2. If tied → prefer **less unused time** across all areas
3. If still tied → prefer **greater advertiser diversity**
4. If still tied → treat as equivalent (return `0`)

---

## Assumptions

- All ads are provided upfront before scheduling begins.
- All areas are provided upfront before scheduling begins.
- All IDs are unique within their own type.
- `timeReceived`, `timeout`, `duration`, `startTime`, and `endTime` are measured in the same time units.
- `duration` is positive.
- `baseRevenue` is non-negative.
- `multiplier` is positive.
- `decayRate` is expected to be between `0` and `1`, inclusive.
- Touching boundaries are allowed. For example, one ad ending at time `10` and another starting at time `10` in the same area is valid.
- Input schedules may be unsorted. Validation logic should still handle them correctly.
- Each area’s schedule must stay within the time range from `0` to `area.timeWindow`, an ad's endTime must be ≤ area.timeWindow (endTime is exclusive).
- All outputs must be deterministic.

---

## Constraints

- **Single-use ads:** An ad may only be scheduled once across the entire schedule.
- **Area compatibility:** Ads may not be placed in banned locations.
- **Area timing:** An ad must fully fit inside the target area’s time window.
- **Ad timing:** An ad must start within its own allowed availability window.
- **No overlap:** Ads in the same area may not overlap.
- **Decay across full schedule:** Advertiser repetition is determined globally across all areas, not locally per area.
- **Deterministic scoring:** Revenue calculations and schedule comparisons must always produce the same result for the same inputs.

---

## Test Coverage

The test suite includes:

- **Unit tests** for each method in all three classes
- **Validation tests** for compatibility rules, scheduling constraints, and time window checks
- **Revenue tests** for advertiser counts, diminishing returns, diversity, and area revenue
- **Scheduler tests** for free-slot detection, schedule validity, and schedule comparison
- **Load tests** with larger ad lists to ensure your implementation scales

Run `npm test` to check your progress at any time.

---

## Project Structure

```text
revenue_optimization/
├── src/
│   ├── placementEngine.ts   # Placement validation and area schedule checks
│   ├── revenueEngine.ts     # Advertiser scoring and schedule comparison
│   └── scheduler.ts         # Schedule validation and final schedule builder
├── tests/
│   ├── placementEngine.test.ts
│   ├── revenueEngine.test.ts
│   └── scheduler.test.ts
├── jest.config.js
├── tsconfig.json
└── package.json
```

> The root folder may be named `revenue_optimization` or similar.

---

## Tips

1. **Implement in order** — `PlacementEngine` first, then `RevenueEngine`, then `Scheduler`. Each class depends on the one before it.
2. **Run tests frequently** with `npm test` to catch regressions early.
3. **Read the test files** if you're unsure what a method should return — they are the source of truth.
4. **Don't modify interfaces or function signatures** — the tests expect exact signatures.
5. **Keep all logic deterministic** — tie-breaking and decay ordering are tested explicitly.
6. **Focus on `buildSchedule` quality** — it carries the most weight in scoring. A valid but suboptimal schedule scores less than a valid and revenue-maximizing one.