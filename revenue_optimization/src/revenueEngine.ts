import { Ad, Area, Schedule, ScheduledAd, PlacementEngine } from './placementEngine';

export class RevenueEngine {
    placementEngine: PlacementEngine;

    constructor(placementEngine: PlacementEngine) {
        this.placementEngine = placementEngine;
    }

    getAdvertiserScheduleCount(
        advertiserId: string,
        ads: Ad[],
        schedule: Schedule
    ): number {
        return 0;
    }

    calculateDiminishedRevenue(
        baseRevenue: number,
        advertiserScheduledCount: number,
        decayRate: number
    ): number {
        return 0;
    }

    calculatePlacementRevenue(
        ad: Ad,
        areas: Area[],
        ads: Ad[],
        schedule: Schedule,
        decayRate: number
    ): number {
        return 0;
    }

    getAdvertiserDiversity(ads: Ad[], schedule: Schedule): number {
        return 0;
    }

    getAreaRevenue(
        area: Area,
        areasArray: Area[],
        fullSchedule: Schedule,
        ads: Ad[],
        decayRate: number
    ): number {
        return 0;
    }
}