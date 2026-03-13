export interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: number;
    timeout: number;
    duration: number;
    baseRevenue: number;
    bannedLocations: string[];
}

export interface Area {
    areaId: string;
    location: string;
    multiplier: number;
    totalScreens: number;
    timeWindow: number;
}

export interface ScheduledAd {
    adId: string;
    areaId: string;
    startTime: number;
    endTime: number;
}

export type Schedule = Record<string, ScheduledAd[]>;

export class PlacementEngine {

    constructor() {
    }

    isAdCompatibleWithArea(ad: Ad, area: Area): boolean {
        return false;
    }

    getTotalScheduledTimeForArea(areaSchedule: ScheduledAd[]): number {
        return 0;
    }

    doesPlacementFitTimingConstraints(
        ad: Ad,
        area: Area,
        startTime: number
    ): boolean {
        return false;
    }

    isAdAlreadyScheduled(adId: string, schedule: Schedule): boolean {
        return false;
    }

    canScheduleAd(
        ad: Ad,
        area: Area,
        schedule: Schedule,
        startTime: number
    ): boolean {
        return false;
    }

    isAreaScheduleValid(area: Area, areaSchedule: ScheduledAd[], ads: Ad[]): boolean {
        return false;
    }
}