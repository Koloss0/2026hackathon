import { Ad, Area, Schedule, ScheduledAd, PlacementEngine } from './placementEngine';
import { RevenueEngine } from './revenueEngine';

export class Scheduler {
    placementEngine: PlacementEngine;
    revenueEngine: RevenueEngine;

    constructor(placementEngine: PlacementEngine, revenueEngine: RevenueEngine) {
        this.placementEngine = placementEngine;
        this.revenueEngine = revenueEngine;
    }

    getNextAvailableStartTime(areaSchedule: ScheduledAd[]): number {
        return 0;
    }

    isValidSchedule(
        schedule: Schedule,
        areas: Area[],
        ads: Ad[]
    ): boolean {
        return false;
    }

    compareSchedules(
        ads: Ad[],
        areas: Area[],
        scheduleA: Schedule,
        scheduleB: Schedule,
        decayRate: number
    ): number {
        return 0;
    }

    buildSchedule(
        ads: Ad[],
        areas: Area[],
        decayRate: number
    ): Schedule {
        return {};
    }
}
