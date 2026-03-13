import { PlacementEngine, Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';

describe('PlacementEngine', () => {
    let placementEngine: PlacementEngine;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
    });

    const createTestAd = (
        adId: string,
        advertiserId: string,
        overrides: Partial<Ad> = {}
    ): Ad => ({
        adId,
        advertiserId,
        timeReceived: 0,
        timeout: 30,
        duration: 10,
        baseRevenue: 100,
        bannedLocations: [],
        ...overrides,
    });

    const createTestArea = (
        areaId: string,
        location: string,
        overrides: Partial<Area> = {}
    ): Area => ({
        areaId,
        location,
        multiplier: 1.0,
        totalScreens: 1,
        timeWindow: 100,
        ...overrides,
    });

    const createTestScheduledAd = (
        adId: string,
        areaId: string,
        startTime: number,
        endTime: number
    ): ScheduledAd => ({
        adId,
        areaId,
        startTime,
        endTime,
    });

    describe('constructor', () => {
        it('should create a new PlacementEngine instance', () => {
            expect(placementEngine).toBeDefined();
        });
    });

    describe('isAdCompatibleWithArea', () => {
        it('should return true when area location is not banned', () => {
            const ad = createTestAd('ad1', 'adv1', { bannedLocations: ['bar', 'patio'] });
            const area = createTestArea('area1', 'main');

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });

        it('should return false when area location is banned', () => {
            const ad = createTestAd('ad1', 'adv1', { bannedLocations: ['bar', 'patio'] });
            const area = createTestArea('area1', 'bar');

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(false);
        });

        it('should return true when bannedLocations is empty', () => {
            const ad = createTestAd('ad1', 'adv1', { bannedLocations: [] });
            const area = createTestArea('area1', 'washroom');

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });

        it('should return false when bannedLocations contains many values including the area', () => {
            const ad = createTestAd('ad1', 'adv1', {
                bannedLocations: ['main', 'bar', 'patio', 'washroom'],
            });
            const area = createTestArea('area1', 'patio');

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(false);
        });

        it('should use exact string matching for location comparison', () => {
            const ad = createTestAd('ad1', 'adv1', { bannedLocations: ['Bar'] });
            const area = createTestArea('area1', 'bar');

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });
    });

    describe('getTotalScheduledTimeForArea', () => {
        it('should return 0 for an empty schedule', () => {
            expect(placementEngine.getTotalScheduledTimeForArea([])).toBe(0);
        });

        it('should return the duration of a single scheduled ad', () => {
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 0, 10)];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(10);
        });

        it('should return the total duration of multiple scheduled ads', () => {
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 10, 25),
                createTestScheduledAd('ad3', 'area1', 30, 40),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(35);
        });

        it('should count durations correctly even when there are gaps', () => {
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 20, 30),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(20);
        });

        it('should work correctly for unsorted schedules', () => {
            const areaSchedule = [
                createTestScheduledAd('ad2', 'area1', 20, 30),
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad3', 'area1', 35, 45),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(30);
        });
    });

    describe('doesPlacementFitTimingConstraints', () => {
        it('should return true when placement fits in both ad availability and area time window', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 15)
            ).toBe(true);
        });

        it('should return true when placement starts exactly at timeReceived', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 10)
            ).toBe(true);
        });

        it('should return true when placement starts exactly at timeReceived + timeout', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 30)
            ).toBe(true);
        });

        it('should return false when placement starts before timeReceived', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 9)
            ).toBe(false);
        });

        it('should return false when placement starts after timeReceived + timeout', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 31)
            ).toBe(false);
        });

        it('should return true when ad ends exactly at the area time window boundary', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 0,
                timeout: 100,
                duration: 20,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 80)
            ).toBe(true);
        });

        it('should return false when ad starts at the area time window boundary', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 0,
                timeout: 100,
                duration: 20,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 50 });
            
            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 50)
            ).toBe(false);
        });

        it('should return false when ad exceeds the area time window by 1', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 0,
                timeout: 100,
                duration: 21,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, 80)
            ).toBe(false);
        });

        it('should return false for negative start times', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 0,
                timeout: 100,
                duration: 10,
            });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitTimingConstraints(ad, area, -1)
            ).toBe(false);
        });
    });

    describe('isAdAlreadyScheduled', () => {
        it('should return false for an empty schedule', () => {
            const schedule: Schedule = {};

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(false);
        });

        it('should return true when ad is scheduled in the first area', () => {
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(true);
        });

        it('should return true when ad is scheduled in a later area', () => {
            const schedule: Schedule = {
                area1: [],
                area2: [createTestScheduledAd('ad2', 'area2', 20, 30)],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad2', schedule)).toBe(true);
        });

        it('should return false when ad is not scheduled anywhere', () => {
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 10, 20)],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad3', schedule)).toBe(false);
        });

        it('should handle schedules with empty area arrays', () => {
            const schedule: Schedule = {
                area1: [],
                area2: [],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(false);
        });
    });

    describe('canScheduleAd', () => {
        it('should return true for a fully valid placement', () => {
            const ad = createTestAd('ad1', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 0)).toBe(true);
        });

        it('should return false when area is banned for the ad', () => {
            const ad = createTestAd('ad1', 'adv1', { bannedLocations: ['main'] });
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 0)).toBe(false);
        });

        it('should return false when ad is already scheduled in another area', () => {
            const ad = createTestAd('ad1', 'adv1', { timeout: 30 });
            const area2 = createTestArea('area2', 'bar');
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [],
            };

            expect(placementEngine.canScheduleAd(ad, area2, schedule, 10)).toBe(false);
        });

        it('should return false when placement overlaps an existing ad in the same area', () => {
            const ad = createTestAd('ad2', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 10, 20)],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 15)).toBe(false);
        });

        it('should return true when placement starts exactly when another ad ends', () => {
            const ad = createTestAd('ad2', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 10, 20)],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 20)).toBe(true);
        });

        it('should return false when placement starts before timeReceived', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 9)).toBe(false);
        });

        it('should return false when placement starts after timeout window', () => {
            const ad = createTestAd('ad1', 'adv1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 31)).toBe(false);
        });

        it('should return false when placement exceeds the area time window', () => {
            const ad = createTestAd('ad1', 'adv1', { duration: 25, timeout: 100 });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 80)).toBe(false);
        });

        it('should return true when placement fits exactly at the end boundary', () => {
            const ad = createTestAd('ad1', 'adv1', { duration: 20, timeout: 100 });
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 80)).toBe(true);
        });

        it('should work when the schedule does not yet contain the target area key', () => {
            const ad = createTestAd('ad1', 'adv1');
            const area2 = createTestArea('area2', 'main');
            const schedule: Schedule = {
                area1: [],
            };

            expect(placementEngine.canScheduleAd(ad, area2, schedule, 0)).toBe(true);
        });

        it('should return false when placement overlaps an existing ad in an unsorted area schedule', () => {
            const ad = createTestAd('ad3', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad2', 'area1', 30, 40),
                    createTestScheduledAd('ad1', 'area1', 10, 20),
                ],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 15)).toBe(false);
        });

        it('should return true when placement fits between two existing ads in the same area', () => {
            const ad = createTestAd('ad3', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad2', 'area1', 30, 40),
                    createTestScheduledAd('ad1', 'area1', 10, 20),
                ],
            };
            
            expect(placementEngine.canScheduleAd(ad, area, schedule, 20)).toBe(true);
        });

        it('should return false when placement doe not fit between two existing ads in the same area', () => {
            const ad = createTestAd('ad3', 'adv1');
            const area = createTestArea('area1', 'main');
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 10, 20),
                    createTestScheduledAd('ad2', 'area1', 28, 38),
                ],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 20)).toBe(false);
        });
    });

    describe('isAreaScheduleValid', () => {
        it('should return true for an empty area schedule', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads: Ad[] = [];

            expect(placementEngine.isAreaScheduleValid(area, [], ads)).toBe(true);
        });

        it('should return true for a single valid scheduled ad', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1')];
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 10, 20)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false if ad duration does not match the scheduled ad duration', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1', { duration: 5, timeout: 30 })];
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 10, 20)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return true for multiple non-overlapping ads with gaps', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [
                createTestAd('ad1', 'adv1', { timeout: 60 }),
                createTestAd('ad2', 'adv1', { timeout: 60 }),
                createTestAd('ad3', 'adv1', { timeout: 60 }),
            ];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 20, 30),
                createTestScheduledAd('ad3', 'area1', 40, 50),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return true when ads touch exactly at boundaries', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1'), createTestAd('ad3', 'adv1')];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 10, 20),
                createTestScheduledAd('ad3', 'area1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when two ads overlap by 1 unit', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 9, 19),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when one ad is fully contained inside another', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1', { duration: 20 }), createTestAd('ad2', 'adv1', { duration: 5 })];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 20),
                createTestScheduledAd('ad2', 'area1', 5, 10),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return true when total scheduled time exactly equals the area time window', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 30 });
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1'), createTestAd('ad3', 'adv1')];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 10, 20),
                createTestScheduledAd('ad3', 'area1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when total scheduled time exceeds the area time window', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 25 });
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1'), createTestAd('ad3', 'adv1')];
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 10, 20),
                createTestScheduledAd('ad3', 'area1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should validate correctly even when the schedule is unsorted', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [
                createTestAd('ad1', 'adv1', { timeout: 60 }),
                createTestAd('ad2', 'adv1', { timeout: 60 }),
                createTestAd('ad3', 'adv1', { timeout: 60 }),
            ];
            const areaSchedule = [
                createTestScheduledAd('ad2', 'area1', 20, 30),
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad3', 'area1', 40, 50),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when an area schedule contains overlapping ads in unsorted order', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const areaSchedule = [
                createTestScheduledAd('ad2', 'area1', 15, 25),
                createTestScheduledAd('ad1', 'area1', 10, 20),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when the area location is banned for a scheduled ad', () => {
            const area = createTestArea('area1', 'bar', { timeWindow: 100 });
            const ads = [createTestAd('ad1', 'adv1', { bannedLocations: ['bar'] })];
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 0, 10)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when a scheduled ad is missing from the ads array', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 100 });
            const ads = [createTestAd('ad2', 'adv1')];
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 0, 10)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });
    });

    describe('Load Testing - PlacementEngine', () => {
        const LOAD_SIZE = 100;

        it('should find a scheduled ad across many areas and ads', () => {
            const schedule: Schedule = {};

            for (let i = 0; i < LOAD_SIZE; i++) {
                schedule[`area${i}`] = [
                    createTestScheduledAd(`ad${i}`, `area${i}`, i * 10, i * 10 + 10),
                ];
            }

            expect(placementEngine.isAdAlreadyScheduled('ad73', schedule)).toBe(true);
            expect(placementEngine.isAdAlreadyScheduled('missing_ad', schedule)).toBe(false);
        });

        it('should calculate total scheduled time for a long unsorted area schedule', () => {
            const areaSchedule: ScheduledAd[] = [];

            for (let i = 0; i < LOAD_SIZE; i++) {
                areaSchedule.unshift(
                    createTestScheduledAd(`ad${i}`, 'area1', i * 10, i * 10 + 10)
                );
            }

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(1000);
        });

        it('should validate a large non-overlapping area schedule', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 1000 });
            const ads: Ad[] = [];
            const areaSchedule: ScheduledAd[] = [];

            for (let i = 0; i < LOAD_SIZE; i++) {
                ads.push(createTestAd(`ad${i}`, 'adv1', { duration: 10, timeout: 1000 }));
                areaSchedule.push(createTestScheduledAd(`ad${i}`, 'area1', i * 10, i * 10 + 10));
            }

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should reject a placement near the end of a crowded area schedule when it exceeds the boundary', () => {
            const area = createTestArea('area1', 'main', { timeWindow: 1000 });
            const schedule: Schedule = {
                area1: [],
            };

            for (let i = 0; i < 99; i++) {
                schedule['area1'].push(createTestScheduledAd(`ad${i}`, 'area1', i * 10, i * 10 + 10));
            }

            const ad = createTestAd('adNew', 'adv1', { duration: 20, timeout: 1000 });
            expect(placementEngine.canScheduleAd(ad, area, schedule, 990)).toBe(false);
        });
    });
});