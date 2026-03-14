import {
  Ad,
  Area,
  Schedule,
  ScheduledAd,
  PlacementEngine,
} from "./placementEngine";

export class RevenueEngine {
  placementEngine: PlacementEngine;

  constructor(placementEngine: PlacementEngine) {
    this.placementEngine = placementEngine;
  }

  getAdvertiserScheduleCount(
    advertiserId: string,
    ads: Ad[],
    schedule: Schedule,
  ): number {
    const advertiserAdIds = new Set(
      ads.filter((a) => a.advertiserId === advertiserId).map((a) => a.adId),
    );
    let count = 0;
    for (const areaSchedule of Object.values(schedule)) {
      for (const scheduled of areaSchedule) {
        if (advertiserAdIds.has(scheduled.adId)) count++;
      }
    }
    return count;
  }

  calculateDiminishedRevenue(
    baseRevenue: number,
    advertiserScheduledCount: number,
    decayRate: number,
  ): number {
    return baseRevenue * Math.pow(decayRate, advertiserScheduledCount);
  }

  private _getDecayOrderForAdvertiser(
    advertiserId: string,
    ads: Ad[],
    areas: Area[],
    schedule: Schedule,
  ): ScheduledAd[] {
    const advertiserAdIds = new Set(
      ads.filter((a) => a.advertiserId === advertiserId).map((a) => a.adId),
    );
    const areaMap = new Map(areas.map((a) => [a.areaId, a]));
    const adMap = new Map(ads.map((a) => [a.adId, a]));

    const scheduledAds: ScheduledAd[] = [];
    for (const areaSchedule of Object.values(schedule)) {
      for (const sa of areaSchedule) {
        if (advertiserAdIds.has(sa.adId)) scheduledAds.push(sa);
      }
    }

    scheduledAds.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime - b.startTime;
      const adA = adMap.get(a.adId)!;
      const adB = adMap.get(b.adId)!;
      const areaA = areaMap.get(a.areaId);
      const areaB = areaMap.get(b.areaId);
      const rawA = adA.baseRevenue * (areaA ? areaA.multiplier : 1);
      const rawB = adB.baseRevenue * (areaB ? areaB.multiplier : 1);
      if (rawA !== rawB) return rawA - rawB;
      return a.adId.localeCompare(b.adId);
    });

    return scheduledAds;
  }

  calculatePlacementRevenue(
    ad: Ad,
    areas: Area[],
    ads: Ad[],
    schedule: Schedule,
    decayRate: number,
  ): number {
    const ordered = this._getDecayOrderForAdvertiser(
      ad.advertiserId,
      ads,
      areas,
      schedule,
    );
    const k = ordered.findIndex((sa) => sa.adId === ad.adId);
    const area = areas.find((a) => {
      for (const areaSchedule of Object.values(schedule)) {
        for (const sa of areaSchedule) {
          if (sa.adId === ad.adId && sa.areaId === a.areaId) return true;
        }
      }
      return false;
    });
    const multiplier = area ? area.multiplier : 1;
    return ad.baseRevenue * multiplier * Math.pow(decayRate, k);
  }

  getAdvertiserDiversity(ads: Ad[], schedule: Schedule): number {
    const scheduledAdIds = new Set<string>();
    for (const areaSchedule of Object.values(schedule)) {
      for (const sa of areaSchedule) {
        scheduledAdIds.add(sa.adId);
      }
    }
    const adMap = new Map(ads.map((a) => [a.adId, a]));
    const advertisers = new Set<string>();
    for (const adId of scheduledAdIds) {
      const ad = adMap.get(adId);
      if (ad) advertisers.add(ad.advertiserId);
    }
    return advertisers.size;
  }

  getAreaRevenue(
    area: Area,
    areasArray: Area[],
    fullSchedule: Schedule,
    ads: Ad[],
    decayRate: number,
  ): number {
    const areaSchedule = fullSchedule[area.areaId];
    if (!areaSchedule || areaSchedule.length === 0) return 0;

    let total = 0;
    for (const sa of areaSchedule) {
      const ad = ads.find((a) => a.adId === sa.adId);
      if (!ad) continue;
      total += this.calculatePlacementRevenue(
        ad,
        areasArray,
        ads,
        fullSchedule,
        decayRate,
      );
    }
    return total;
  }
}
