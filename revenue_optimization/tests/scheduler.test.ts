import { Scheduler } from '../src/scheduler';
import { PlacementEngine, Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';
import { RevenueEngine } from '../src/revenueEngine';

describe('Scheduler', () => {
    let placementEngine: PlacementEngine;
    let revenueEngine: RevenueEngine;
    let scheduler: Scheduler;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
        revenueEngine = new RevenueEngine(placementEngine);
        scheduler = new Scheduler(placementEngine, revenueEngine);
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
        it('should create a new Scheduler instance', () => {
            expect(scheduler).toBeDefined();
            expect(scheduler.placementEngine).toBeDefined();
            expect(scheduler.placementEngine).toBeInstanceOf(PlacementEngine);
            expect(scheduler.revenueEngine).toBeDefined();
            expect(scheduler.revenueEngine).toBeInstanceOf(RevenueEngine);
        });
    });

    describe('getNextAvailableStartTime', () => {
        it('should return 0 for an empty schedule', () => {
            expect(scheduler.getNextAvailableStartTime([])).toBe(0);
        });

        it('should return the end time when one ad starts at 0', () => {
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 0, 10)];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });

        it('should return 0 when one ad starts later than 0', () => {
            const areaSchedule = [createTestScheduledAd('ad1', 'area1', 10, 20)];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(0);
        });

        it('should return the end of the last ad for back-to-back ads', () => {
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 10, 20),
                createTestScheduledAd('ad3', 'area1', 20, 30),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(30);
        });

        it('should return the start of the earliest gap', () => {
            const areaSchedule = [
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad2', 'area1', 20, 30),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });

        it('should find the earliest gap even when the schedule is unsorted', () => {
            const areaSchedule = [
                createTestScheduledAd('ad2', 'area1', 20, 30),
                createTestScheduledAd('ad1', 'area1', 0, 10),
                createTestScheduledAd('ad3', 'area1', 40, 50),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });
    });

    describe('isValidSchedule', () => {
        it('should return true for an empty schedule', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const schedule: Schedule = {};

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return true for a single valid scheduled ad', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return true for a valid multi-area schedule', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
            ];
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 5, 15)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return false when the same ad is scheduled in two areas', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
            ];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad1', 'area2', 10, 20)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when the schedule contains an unknown area key', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                unknown_area: [createTestScheduledAd('ad1', 'unknown_area', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when a ScheduledAd.areaId does not match its schedule key', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'different_area', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when a scheduled ad is missing from the ads list', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad is scheduled in a banned location', () => {
            const areas = [createTestArea('area1', 'bar')];
            const ads = [createTestAd('ad1', 'adv1', { bannedLocations: ['bar'] })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when scheduled duration does not match the ad duration', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 12)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad starts before timeReceived', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 9, 14)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad starts after timeReceived + timeout', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 31, 36)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when ads in the same area overlap', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 9, 19),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return true when ads in the same area touch at boundaries', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return false when an area schedule exceeds the area time window', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 15 })];
            const ads = [createTestAd('ad1', 'adv1'), createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return true for an unsorted but otherwise valid area schedule', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1', { duration: 10, timeout: 60 }),
                createTestAd('ad2', 'adv1', { duration: 10, timeout: 60 }),
                createTestAd('ad3', 'adv1', { duration: 10, timeout: 60 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad3', 'area1', 40, 50),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });
    });

    describe('compareSchedules', () => {
        const defaultAds: Ad[] = [
            createTestAd('ad1', 'adv1', { baseRevenue: 100, duration: 10, timeout: 50 }),
            createTestAd('ad2', 'adv2', { baseRevenue: 50, duration: 10, timeout: 50 }),
        ];
        const defaultAreas: Area[] = [
            createTestArea('area1', 'main', { multiplier: 1.0, timeWindow: 50 }),
            createTestArea('area2', 'bar', { multiplier: 1.5, timeWindow: 50 }),
        ];
        const decayRate = 0.5;

        it('should return positive when scheduleA has higher total revenue', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
            };

            const result = scheduler.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBeGreaterThan(0);
        });

        it('should return negative when scheduleB has higher total revenue', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };

            const result = scheduler.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBeLessThan(0);
        });

        it('should return 0 when schedules are equivalent in revenue, unused time, and diversity', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            const result = scheduler.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBe(0);
        });

        it('should prefer less unused time when revenue is tied', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100, duration: 10 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100, duration: 20 }),
            ];
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 20)],
            };

            const result = scheduler.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, decayRate);
            expect(result).toBeLessThan(0);
        });

        it('should return positive when A has same revenue and unused time but more diversity', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100, duration: 10, timeout: 50 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100, duration: 10, timeout: 50 }),
                createTestAd('ad3', 'adv2', { baseRevenue: 100, duration: 10, timeout: 50 }),
            ];

            const scheduleA: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad3', 'area1', 10, 20),
                ],
            };
            const scheduleB: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };

            const result = scheduler.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBeGreaterThan(0);
        });

        it('should return negative when B has same revenue and unused time but more diversity', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100, duration: 10, timeout: 50 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100, duration: 10, timeout: 50 }),
                createTestAd('ad3', 'adv2', { baseRevenue: 100, duration: 10, timeout: 50 }),
            ];

            const scheduleA: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };
            const scheduleB: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad3', 'area1', 10, 20),
                ],
            };

            const result = scheduler.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBeLessThan(0);
        });

        it('should treat empty schedules as equivalent when both empty', () => {
            const scheduleA: Schedule = {};
            const scheduleB: Schedule = {};

            const result = scheduler.compareSchedules(defaultAds, defaultAreas, scheduleA, scheduleB, decayRate);
            expect(result).toBe(0);
        });
    });

    describe('buildSchedule', () => {
        it('should return a valid schedule when given ads and areas', () => {
            const areas = [
                createTestArea('area1', 'main', { timeWindow: 100 }),
                createTestArea('area2', 'bar', { timeWindow: 100 }),
            ];
            const ads = [
                createTestAd('ad1', 'adv1', { duration: 5 }),
                createTestAd('ad2', 'adv2', { duration: 5 }),
            ];

            const schedule = scheduler.buildSchedule(ads, areas, 0.5);

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return an empty schedule when given no ads', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 100 })];
            const ads: Ad[] = [];

            const schedule = scheduler.buildSchedule(ads, areas, 0.5);

            expect(schedule).toEqual({});
            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });
    });

    describe('Load Testing - Scheduler', () => {
        const LOAD_SIZE = 100;

        it('should find the earliest gap in a long area schedule', () => {
            const areaSchedule: ScheduledAd[] = [];

            for (let i = 0; i < LOAD_SIZE; i++) {
                if (i === 50) continue;
                areaSchedule.push(createTestScheduledAd(`ad${i}`, 'area1', i * 10, i * 10 + 10));
            }

            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(500);
        });

        it('should validate a large multi-area schedule', () => {
            const areas: Area[] = [];
            const ads: Ad[] = [];
            const schedule: Schedule = {};

            for (let a = 0; a < 10; a++) {
                const areaId = `area${a}`;
                areas.push(createTestArea(areaId, `main${a}`, { timeWindow: 1000 }));
                schedule[areaId] = [];

                for (let i = 0; i < 10; i++) {
                    const adId = `ad${a * 10 + i}`;
                    ads.push(createTestAd(adId, 'adv1', { duration: 10, timeout: 120 }));
                    schedule[areaId].push(
                        createTestScheduledAd(adId, areaId, i * 10, i * 10 + 10)
                    );
                }
            }

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });
    });
});