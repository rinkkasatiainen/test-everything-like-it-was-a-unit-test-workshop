# How to test anything - JavaScript

This session is about **testing**, not about writing the implementation (we are
not practising TDD here). So the production code is already written for you in
[`src/`](./src) - copy it, run it, read it, but spend your time on the **tests**.

## Setup

Run `yarn` (or `npm install`) to install the dependencies, then `yarn test` to
run the suite (mocha + chai, with sinon available for test doubles).

```bash
yarn
yarn test
```

## What is where

| File                                        | Role                          | Step | Message cell       |
|---------------------------------------------|-------------------------------|------|--------------------|
| `src/availability-scheduler.js`             | `AvailabilityScheduler`       | 1, 2 | Incoming query / command |
| `src/schedule-aware-availability-scheduler.js` | `ScheduleAwareAvailabilityScheduler` | 3 | Outgoing query     |
| `src/session-scheduling.js`                 | `SessionScheduling`           | 4    | Outgoing command   |
| `src/conference-session-managing.js`        | `ConferenceSessionManaging` (production collaborator) | 4 | (do **not** use in tests) |
| `test/availability-scheduler.test.js`       | **your** tests - start here   | all  | -                  |

The production code is complete and passing by construction. Your task is to add
the tests described in each step, using the right technique for each cell of the
Query/Command × Origin matrix.

## Finished?

[back to previous](../README.md)
