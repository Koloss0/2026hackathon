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
  constructor() {}

  isAdCompatibleWithArea(ad: Ad, area: Area): boolean {
    return !ad.bannedLocations.includes(area.location);
  }

  getTotalScheduledTimeForArea(areaSchedule: ScheduledAd[]): number {
    return areaSchedule.reduce(
      (acc, scheduledAd) => acc + (scheduledAd.endTime - scheduledAd.startTime),
      0,
    );
  }

  doesPlacementFitTimingConstraints(
    ad: Ad,
    area: Area,
    startTime: number,
  ): boolean {
    if (startTime < 0) return false;
    if (startTime < ad.timeReceived) return false;
    if (startTime > ad.timeReceived + ad.timeout) return false;
    if (startTime + ad.duration > area.timeWindow) return false;
    return true;
  }

  isAdAlreadyScheduled(adId: string, schedule: Schedule): boolean {
    return Object.values(schedule).some((areaSchedule) =>
      areaSchedule.some((scheduledAd) => scheduledAd.adId === adId),
    );
  }

  canScheduleAd(
    ad: Ad,
    area: Area,
    schedule: Schedule,
    startTime: number,
  ): boolean {
    if (!this.isAdCompatibleWithArea(ad, area)) return false;
    if (!this.doesPlacementFitTimingConstraints(ad, area, startTime))
      return false;
    if (this.isAdAlreadyScheduled(ad.adId, schedule)) return false;

    const endTime = startTime + ad.duration;
    const areaSchedule = schedule[area.areaId] || [];
    for (const scheduled of areaSchedule) {
      if (startTime < scheduled.endTime && endTime > scheduled.startTime) {
        return false;
      }
    }
    return true;
  }

  isAreaScheduleValid(
    area: Area,
    areaSchedule: ScheduledAd[],
    ads: Ad[],
  ): boolean {
    if (areaSchedule.length === 0) return true;

    const adMap = new Map<string, Ad>();
    for (const ad of ads) adMap.set(ad.adId, ad);

    const tempSchedule: Schedule = { [area.areaId]: [] };

    for (const scheduled of areaSchedule) {
      const ad = adMap.get(scheduled.adId);
      if (!ad) return false;
      if (scheduled.endTime - scheduled.startTime !== ad.duration) return false;
      if (!this.canScheduleAd(ad, area, tempSchedule, scheduled.startTime))
        return false;
      tempSchedule[area.areaId].push(scheduled);
    }

    return true;
  }
}
