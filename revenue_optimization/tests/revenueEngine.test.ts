import { RevenueEngine } from '../src/revenueEngine';
import { PlacementEngine } from '../src/placementEngine';

interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: number;
    timeout: number;
    duration: number;
    baseRevenue: number;
    bannedLocations: string[];
}

interface Area {
    areaId: string;
    location: string;
    multiplier: number;
    totalScreens: number;
    timeWindow: number;
}

interface ScheduledAd {
    adId: string;
    areaId: string;
    startTime: number;
    endTime: number;
}

type Schedule = Record<string, ScheduledAd[]>;

describe('RevenueEngine', () => {
    let revenueEngine: RevenueEngine;
    let placementEngine: PlacementEngine;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
        revenueEngine = new RevenueEngine(placementEngine);
    });

    const createTestAd = (
        adId: string,
        advertiserId: string,
        overrides: Partial<Ad> = {}
    ): Ad => ({
        adId,
        advertiserId,
        timeReceived: 0,
        timeout: 10,
        duration: 5,
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
        it('should create a new RevenueEngine instance', () => {
            expect(revenueEngine).toBeDefined();
            expect(revenueEngine.placementEngine).toBeDefined();
            expect(revenueEngine.placementEngine).toBeInstanceOf(PlacementEngine);
        });
    });

    describe('getAdvertiserScheduleCount', () => {
        it('should return 0 when advertiser has no scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(0);
        });

        it('should return 1 when advertiser has one scheduled ad', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(1);
        });

        it('should count all scheduled ads for advertiser across areas', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
                createTestAd('ad3', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(2);
        });

        it('should return 0 for empty schedule', () => {
            const ads: Ad[] = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {};

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(0);
        });

        it('should return 0 for non-existent advertiser id', () => {
            const ads: Ad[] = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('nonexistent', ads, schedule)).toBe(0);
        });

        it('should count multiple ads from same advertiser in one area', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { timeout: 20 }),
                createTestAd('ad2', 'adv1', { timeout: 20 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),
                ],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(2);
        });
    });

    describe('calculateDiminishedRevenue', () => {
        it('should return full base revenue when advertiserScheduledCount is 0', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 0.5)).toBeCloseTo(100);
        });

        it('should return reduced revenue when advertiser already has 1 scheduled ad', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 1, 0.5)).toBeCloseTo(100 * 0.5);
        });

        it('should return lower revenue as advertiserScheduledCount increases', () => {
            const first = revenueEngine.calculateDiminishedRevenue(100, 0, 0.5);
            const second = revenueEngine.calculateDiminishedRevenue(100, 1, 0.5);
            const third = revenueEngine.calculateDiminishedRevenue(100, 2, 0.5);

            expect(first).toBeGreaterThan(second);
            expect(second).toBeGreaterThan(third);

            expect(first).toBeCloseTo(100);
            expect(second).toBeCloseTo(100 * 0.5);
            expect(third).toBeCloseTo(100 * 0.5 * 0.5);
        });

        it('should return full revenue for all ads when decayRate is 1 (no decay)', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 1)).toBeCloseTo(100);
            expect(revenueEngine.calculateDiminishedRevenue(100, 5, 1)).toBeCloseTo(100);
        });

        it('should apply full decay when decayRate is 0 (only first ad earns)', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 0)).toBeCloseTo(100);
            expect(revenueEngine.calculateDiminishedRevenue(100, 1, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(100, 5, 0)).toBeCloseTo(0);
        });

        it('should handle zero baseRevenue', () => {
            expect(revenueEngine.calculateDiminishedRevenue(0, 0, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(0, 1, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(0, 5, 0)).toBeCloseTo(0);
        });

        it('should be consistent for same inputs', () => {
            const a = revenueEngine.calculateDiminishedRevenue(50, 2, 0.25);
            const b = revenueEngine.calculateDiminishedRevenue(50, 2, 0.25);
            expect(a).toBeCloseTo(b);
        });
    });

    describe('calculatePlacementRevenue', () => {
        it('should include area multiplier in revenue', () => {
            const ad = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const area = createTestArea('area1', 'main', { multiplier: 1.5 });
            const ads: Ad[] = [ad];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad, [area], ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(100 * 1.5);
        });

        it('should apply diminishing returns when advertiser has existing scheduled ads', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad2, [area1], ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(200 * 0.5 * 1.5);
        });

        it('should apply diminishing returns when advertiser has existing scheduled ad in different areas', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const areas: Area[] = [area1, area2];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 5, 10)],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(200 * 0.5 * 2.0);
        });

        it('should apply decay rate to ad with higher raw placement revenue when same advertiser is playing in parallel', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 1.5 });
            const ads: Ad[] = [ad1, ad2];
            const areas: Area[] = [area1, area2];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, areas, ads, schedule, 0.5);
            expect(revenue1).toBeCloseTo(100 * 1.5);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(200 * 0.5 * 1.5);
        });

        it('should handle decay rate of 1 (no decay) for second ad from same advertiser', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });

            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, [area], ads, schedule, 1);
            expect(revenue1).toBeCloseTo(100 * 2);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, [area], ads, schedule, 1);
            expect(revenue2).toBeCloseTo(200 * 2);
        });

        it('should handle decay rate of 0 for second ad from same advertiser', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });

            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, [area], ads, schedule, 0);
            expect(revenue1).toBeCloseTo(100 * 2);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, [area], ads, schedule, 0);
            expect(revenue2).toBeCloseTo(0);
        });

        it('should use lexicographically smaller adId first when startTime and raw placement revenue are tied', () => {
            const adA = createTestAd('adA', 'adv1', { baseRevenue: 100 });
            const adB = createTestAd('adB', 'adv1', { baseRevenue: 100 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 1.0 });
            const areas: Area[] = [area1, area2];

            const ads: Ad[] = [adA, adB];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('adA', 'area1', 0, 5)],
                area2: [createTestScheduledAd('adB', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(adA, areas, ads, schedule, 0.5);
            expect(revenue1).toBeCloseTo(100 * 1.0);

            const revenue2 = revenueEngine.calculatePlacementRevenue(adB, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(100 * 0.5 * 1.0);
        });

        it('should handle decay rate of 0 when startTime and raw placement revenue is tied', () => {
            const adA = createTestAd('adA', 'adv1', { baseRevenue: 100 });
            const adB = createTestAd('adB', 'adv1', { baseRevenue: 100 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 1.0 });
            const areas: Area[] = [area1, area2];
            const ads: Ad[] = [adA, adB];

            const schedule: Schedule = {
                area1: [createTestScheduledAd('adA', 'area1', 0, 5)],
                area2: [createTestScheduledAd('adB', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(adA, areas, ads, schedule, 0);
            expect(revenue1).toBeCloseTo(100);

            const revenue2 = revenueEngine.calculatePlacementRevenue(adB, areas, ads, schedule, 0);
            expect(revenue2).toBeCloseTo(0);
        });

        it('should consider raw placement revenue (i.e. baseRevenue * multiplier) when startTime is tied', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 5.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 2.0 });
            const areas: Area[] = [area1, area2];
            const ads: Ad[] = [ad1, ad2];

            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, areas, ads, schedule, 0.5);
            expect(revenue1).toBeCloseTo(100 * 5.0 * 0.5);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(200 * 2.0);
        });
    });

    describe('getAdvertiserDiversity', () => {
        it('should return 0 for empty schedule', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {};

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(0);
        });

        it('should return 1 when only one advertiser has scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { timeout: 20 }),
                createTestAd('ad2', 'adv1', { timeout: 20 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),
                ],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(1);
        });

        it('should return number of unique advertisers in schedule', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { timeout: 20 }),
                createTestAd('ad2', 'adv2', { timeout: 20 }),
                createTestAd('ad3', 'adv3', { timeout: 20 }),
                createTestAd('ad4', 'adv1', { timeout: 20 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),
                ],
                area2: [
                    createTestScheduledAd('ad3', 'area2', 0, 5),
                    createTestScheduledAd('ad4', 'area2', 10, 15),
                ],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(3);
        });

        it('should not count advertisers with no scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(1);
        });

        it('should return number of unique advertisers in schedule when there are multiple areas', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { timeout: 60 }),
                createTestAd('ad2', 'adv1', { timeout: 60 }),
                createTestAd('ad3', 'adv2', { timeout: 60 }),
                createTestAd('ad4', 'adv2', { timeout: 60 }),
                createTestAd('ad5', 'adv3', { timeout: 60 }),
                createTestAd('ad6', 'adv3', { timeout: 60 }),
            ];

            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad6', 'area1', 60, 65),
                ],
                area2: [
                    createTestScheduledAd('ad2', 'area2', 0, 5),
                    createTestScheduledAd('ad5', 'area2', 55, 60),
                ],
                area3: [
                    createTestScheduledAd('ad3', 'area3', 0, 5),
                    createTestScheduledAd('ad4', 'area3', 25, 30),
                ],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(3);
        });
    });

    describe('getAreaRevenue', () => {
        it('should return 0 when the target area has no scheduled ads', () => {
            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads = [createTestAd('ad1', 'adv1')];
            const fullSchedule: Schedule = {
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0.5)).toBeCloseTo(0);
        });

        it('should treat decayRate 1 as no decay for repeated advertiser ads', () => {
            const area = createTestArea('area1', 'main');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 1)).toBeCloseTo(200);
        });

        it('should return baseRevenue × multiplier for one ad in the target area', () => {
            const area = createTestArea('area1', 'main', { multiplier: 2.0 });
            const ads = [createTestAd('ad1', 'adv1', { baseRevenue: 100 })];
            const fullSchedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0.5)).toBeCloseTo(200);
        });

        it('should use lexicographically smaller adId first when same advertiser ads have same start time and same raw revenue', () => {
            const area1 = createTestArea('area1', 'main');
            const area2 = createTestArea('area2', 'bar');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
            };

            // ad1 should be ordered first globally, so ad2 in area1 is decayed
            expect(revenueEngine.getAreaRevenue(area1, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(50);
            expect(revenueEngine.getAreaRevenue(area2, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(100);
        });


        it('should apply decay to the second ad from the same advertiser in the same area', () => {
            const area1 = createTestArea('area1', 'main');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };

            expect(revenueEngine.getAreaRevenue(area1, [area1], fullSchedule, ads, 0.5)).toBeCloseTo(150);
        });

        it('should apply advertiser decay based on ads scheduled in other areas too', () => {
            const area1 = createTestArea('area1', 'main');
            const area2 = createTestArea('area2', 'bar');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 20, 30)],
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
            };

            // ad2 is second for adv1 globally, so revenue is 100 * 0.5
            expect(revenueEngine.getAreaRevenue(area1, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(50);
            expect(revenueEngine.getAreaRevenue(area2, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(100);
        });

        it('should apply decay to ad with higher raw placement revenue (baseRevenue * multiplier) when ads have same start time', () => {
            const area1 = createTestArea('area1', 'main', { multiplier: 1.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 5.0 });
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 200 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };

            expect(revenueEngine.getAreaRevenue(area1, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(200);
            expect(revenueEngine.getAreaRevenue(area2, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(250);
        });

        it('should not apply decay between different advertisers in the same area', () => {
            const area = createTestArea('area1', 'main', { multiplier: 1.5 });
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv2', { baseRevenue: 200 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0.5)).toBeCloseTo(450);
        });

        it('should return full revenue for all ads when decayRate is 1 (no decay)', () => {
            const area = createTestArea('area1', 'main');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 1)).toBeCloseTo(200);
        });

        it('should return only first ad revenue per advertiser when decayRate is 0', () => {
            const area = createTestArea('area1', 'main');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 15, 25),
                ],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0)).toBeCloseTo(100);
        });

        it('should apply exponential decay correctly when decayRate is 0.5', () => {
            const area = createTestArea('area1', 'main');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 80, timeout: 60 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 80, timeout: 60 }),
                createTestAd('ad3', 'adv1', { baseRevenue: 80, timeout: 60 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                    createTestScheduledAd('ad3', 'area1', 40, 50),
                ],
            };

            // 80 + 80*0.5 + 80*0.25 = 80 + 40 + 20 = 140
            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0.5)).toBeCloseTo(140);
        });

        it('should return 0 when the target area is not present in the full schedule', () => {
            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads = [createTestAd('ad1', 'adv1', { baseRevenue: 100 })];
            const fullSchedule: Schedule = {
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
            };

            expect(revenueEngine.getAreaRevenue(area, [area], fullSchedule, ads, 0.5)).toBeCloseTo(0);
        });

        it('should use lower raw placement revenue first when same-advertiser ads have the same start time', () => {
            const area1 = createTestArea('area1', 'main');
            const area2 = createTestArea('area2', 'bar');
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 200 }),
            ];
            const fullSchedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };

            expect(revenueEngine.getAreaRevenue(area1, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(100);
            expect(revenueEngine.getAreaRevenue(area2, [area1, area2], fullSchedule, ads, 0.5)).toBeCloseTo(100);
        });
    });

    describe('Load Testing - RevenueEngine', () => {
        const LOAD_ADS_COUNT = 50;
        const LOAD_AREAS_COUNT = 10;

        it('should getAdvertiserScheduleCount efficiently with many areas and ads', () => {
            const ads: Ad[] = [];
            for (let i = 0; i < LOAD_ADS_COUNT; i++) {
                ads.push(createTestAd(`ad${i}`, `adv${i % 5}`, { baseRevenue: 10 , timeout: 100}));
            }

            const schedule: Schedule = {};
            for (let a = 0; a < LOAD_AREAS_COUNT; a++) {
                schedule[`area${a}`] = [];
                for (let i = 0; i < 5; i++) {
                    const ad = ads[a * 5 + i];
                    if (ad) {
                        schedule[`area${a}`].push(
                            createTestScheduledAd(ad.adId, `area${a}`, i * 10, i * 10 + 5)
                        );
                    }
                }
            }

            const count = revenueEngine.getAdvertiserScheduleCount('adv0', ads, schedule);
            expect(count).toBe(10);
        });

        it('should getAdvertiserDiversity efficiently with large schedule', () => {
            const ads: Ad[] = [];
            for (let i = 0; i < LOAD_ADS_COUNT; i++) {
                ads.push(createTestAd(`ad${i}`, `adv${i % 10}`, { duration: 10, timeout: 100 }));
            }

            const schedule: Schedule = {};
            for (let a = 0; a < LOAD_AREAS_COUNT; a++) {
                schedule[`area${a}`] = [];
                for (let i = 0; i < 5; i++) {
                    const idx = a * 5 + i;
                    if (idx < ads.length) {
                        schedule[`area${a}`].push(
                            createTestScheduledAd(ads[idx].adId, `area${a}`, i * 20, i * 20 + 10)
                        );
                    }
                }
            }

            const diversity = revenueEngine.getAdvertiserDiversity(ads, schedule);
            expect(diversity).toBe(10);
        });

        it('should calculatePlacementRevenue consistently with many ads in schedule', () => {
            
            const area = createTestArea('area1', 'main', { multiplier: 2.0, timeWindow: 100 });

            const ads: Ad[] = [];
            for (let i = 0; i < 10; i++) {
                ads.push(createTestAd(`ad${i}`, `adv0`, { baseRevenue: 100, duration: 10, timeout: 100 }));
            }
            
            const schedule: Schedule = { area1: [] };
            for (let a = 0; a < 10; a++) {
                schedule['area1'].push(createTestScheduledAd(`ad${a}`, `area1`, a * 10, a * 10 + 10));
            }

            for (let i = 0; i < 10; i++) {
                const ad = ads[i];
                const revenue = revenueEngine.calculatePlacementRevenue(ad, [area], ads, schedule, 0.5);
                expect(revenue).toBeCloseTo(100 * 2.0 * (0.5 ** i));
            }
        });
    });

    it('should calculate area revenue for a large schedule with repeated advertisers across areas', () => {
        const targetArea = createTestArea('area0', 'main', { multiplier: 1 });
        const ads: Ad[] = [];
        const fullSchedule: Schedule = {};

        for (let a = 0; a < 5; a++) {
            const areaId = `area${a}`;
            fullSchedule[areaId] = [];

            for (let i = 0; i < 10; i++) {
                const adId = `ad${a * 10 + i}`;
                ads.push(
                    createTestAd(adId, `adv${i % 3}`, { baseRevenue: 100, timeout: 120 })
                );
                fullSchedule[areaId].push(
                    createTestScheduledAd(adId, areaId, i * 10, i * 10 + 10)
                );
            }
        }

        const revenue = revenueEngine.getAreaRevenue(targetArea, [targetArea], fullSchedule, ads, 0.5);
        expect(revenue).toBeGreaterThan(0);
    });
});