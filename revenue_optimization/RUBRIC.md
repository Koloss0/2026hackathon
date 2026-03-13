# Grading Rubric

This document explains how your submission will be evaluated for the **Bar Screen Ad Scheduling** challenge.

Your total score is calculated out of **100 core marks**, with an additional **manual code quality adjustment of up to +10 or -10 marks**.

---

## Overall Marking Breakdown

Your submission will be evaluated in four parts:

| Component | Marks |
|---|---:|
| Visible helper and unit tests | 25 |
| Hidden final `buildSchedule` tests | 35 |
| Hidden dataset performance | 40 |
| Manual code quality adjustment | +10 / -10 |

So your score is:

```text
Final Score = Unit Test Score + Hidden Final Test Score + Dataset Score + Code Quality Adjustment
```

---

## 1. Visible Helper and Unit Tests — 25 Marks

These marks come from the tests in the public `tests/` folder.

The helper/unit-test marks are awarded **by section**, not just by raw total.

### Section Breakdown

| Section | Public Tests | Marks |
|---|---:|---:|
| PlacementEngine | 55 | 10.37 |
| RevenueEngine | 45 | 8.49 |
| Scheduler | 33 | 6.14 |
| **Total** | **133** | **25.00** |

### How this is calculated

For each section, your mark is proportional to how many tests you pass in that section.

#### PlacementEngine

```text
Placement Score = (Placement tests passed / 55) × 10.37
```

#### RevenueEngine

```text
Revenue Score = (Revenue tests passed / 45) × 8.49
```

#### Scheduler

```text
Scheduler Score = (Scheduler tests passed / 33) × 6.14
```

Then:

```text
Unit Test Score = Placement Score + Revenue Score + Scheduler Score
```

### Why this matters

These tests check whether your core functions work correctly and follow the required rules.

---

## 2. Hidden Final `buildSchedule` Tests — 35 Marks

Your final scheduling function will also be tested using a hidden test suite.

These tests are focused specifically on the correctness of your final schedule-building logic.

- Number of hidden final tests: **7**
- Total marks for this part: **35**
- Each hidden final test is worth **5 marks**

### How this is calculated

```text
Hidden Final Test Score = (Hidden final tests passed / 7) × 35
```

or equivalently:

```text
Each hidden final test passed = 5 marks
```

### Why this matters

These tests check whether your final scheduler correctly handles important scheduling situations beyond the visible helper tests.

---

## 3. Hidden Dataset Performance — 40 Marks

Your implementation of `buildSchedule(ads, areas, decayRate)` will also be run on a set of hidden datasets.

These datasets are designed to test the actual quality of your scheduling strategy, not just correctness on small examples.

- Number of hidden datasets: **9**
- Total marks for this part: **40**
- Each dataset is worth **40 / 9 ≈ 4.44 marks**

### How teams are ranked on each dataset

For each dataset, teams are ranked using this order:

1. **Higher total revenue** is better
2. If total revenue is tied, **less unused time** is better
3. If revenue and unused time are tied, **greater advertiser diversity** is better

### Important note

A schedule must still be valid. Invalid schedules may receive no credit for that dataset.

### How dataset marks are assigned

Each dataset is marked out of **40 / 9 ≈ 4.44** based on your rank relative to the other teams.

If there are `N` teams, and your team finishes at rank `r` on that dataset:

- best rank = `1`
- worst rank = `N`

then the score for that dataset is:

```text
Dataset Score = ((N - r) / (N - 1)) × (40 / 9)
```

This means:

- the top team gets the full **40 / 9 ≈ 4.44 marks**
- the bottom team gets **0 marks**
- teams in between get proportionally scaled marks

If teams are tied after applying all ranking rules, they will receive the same score for that dataset.

### Total dataset score

```text
Dataset Performance Score = sum of all 9 dataset scores
```

Maximum = **40 marks**

### Why this matters

This is the most strategy-heavy part of the evaluation. It rewards teams whose scheduler performs well on harder and more realistic inputs.

---

## 4. Manual Code Quality Adjustment — +10 / -10

After automated marking, your code will also receive a manual quality adjustment.

This adjustment can add up to **10 marks** or subtract up to **10 marks**.

### What we will look for

We may consider things such as:

- readability
- naming quality
- clarity of logic
- organization and structure
- unnecessary duplication
- maintainability
- determinism and consistency
- whether the code is written carefully and professionally

### Important note

This is **not** a separate correctness score. It is an adjustment based on the quality of the implementation itself.

A correct solution with very poor code style may lose marks here, while a clean and well-structured solution may gain marks.

---

## Final Formula

Your final mark will be computed as:

```text
Final Score = Unit Test Score + Hidden Final Test Score + Dataset Performance Score + Code Quality Adjustment
```

Where:

- `Unit Test Score` is out of **25**
- `Hidden Final Test Score` is out of **35**
- `Dataset Performance Score` is out of **40**
- `Code Quality Adjustment` is between **+10 and -10**

---

## What Matters Most

This challenge is not graded only on helper functions.

The strongest weighting is placed on whether your final scheduler:

- produces valid schedules
- performs well on difficult hidden cases
- makes strong optimization decisions on full datasets

So while helper correctness matters, the most important part of the challenge is the quality of your final scheduling solution.

---

## Summary

| Part | Marks | What it rewards |
|---|---:|---|
| Visible unit tests | 25 | Correct implementation of core functions |
| Hidden final tests | 35 | Correct final scheduler behavior |
| Hidden datasets | 40 | Actual optimization quality |
| Code quality adjustment | +10 / -10 | Clean, readable, maintainable implementation |

---

## Advice

To do well in this challenge:

1. make sure your helper functions are correct
2. make sure your final schedule is always valid
3. optimize for total revenue, then unused time, then advertiser diversity
4. keep your logic deterministic
5. write clean, readable code

