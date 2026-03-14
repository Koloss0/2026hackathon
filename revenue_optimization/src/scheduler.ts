import {
  Ad,
  Area,
  Schedule,
  ScheduledAd,
  PlacementEngine,
} from "./placementEngine";
import { RevenueEngine } from "./revenueEngine";

export class Scheduler {
  placementEngine: PlacementEngine;
  revenueEngine: RevenueEngine;

  constructor(placementEngine: PlacementEngine, revenueEngine: RevenueEngine) {
    this.placementEngine = placementEngine;
    this.revenueEngine = revenueEngine;
  }

  getNextAvailableStartTime(areaSchedule: ScheduledAd[]): number {
    if (areaSchedule.length === 0) return 0;
    const sorted = [...areaSchedule].sort((a, b) => a.startTime - b.startTime);
    if (sorted[0].startTime > 0) return 0;
    let cursor = sorted[0].endTime;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime > cursor) return cursor;
      cursor = Math.max(cursor, sorted[i].endTime);
    }
    return cursor;
  }

  isValidSchedule(schedule: Schedule, areas: Area[], ads: Ad[]): boolean {
    const areaMap = new Map(areas.map((a) => [a.areaId, a]));

    // Check for unknown area keys
    for (const key of Object.keys(schedule)) {
      if (!areaMap.has(key)) return false;
    }

    // Check each scheduled ad's areaId matches its bucket key
    for (const [areaId, areaSchedule] of Object.entries(schedule)) {
      for (const sa of areaSchedule) {
        if (sa.areaId !== areaId) return false;
      }
    }

    // Check no ad appears more than once across the entire schedule
    const seenAdIds = new Set<string>();
    for (const areaSchedule of Object.values(schedule)) {
      for (const sa of areaSchedule) {
        if (seenAdIds.has(sa.adId)) return false;
        seenAdIds.add(sa.adId);
      }
    }

    // Validate each area schedule
    for (const [areaId, areaSchedule] of Object.entries(schedule)) {
      const area = areaMap.get(areaId)!;
      if (!this.placementEngine.isAreaScheduleValid(area, areaSchedule, ads)) {
        return false;
      }
    }

    return true;
  }

  private _getTotalRevenue(
    ads: Ad[],
    areas: Area[],
    schedule: Schedule,
    decayRate: number,
  ): number {
    let total = 0;
    for (const area of areas) {
      total += this.revenueEngine.getAreaRevenue(
        area,
        areas,
        schedule,
        ads,
        decayRate,
      );
    }
    return total;
  }

  private _getUnusedTime(areas: Area[], schedule: Schedule): number {
    let unused = 0;
    for (const area of areas) {
      const areaSchedule = schedule[area.areaId] || [];
      const scheduled =
        this.placementEngine.getTotalScheduledTimeForArea(areaSchedule);
      unused += area.timeWindow - scheduled;
    }
    return unused;
  }

  compareSchedules(
    ads: Ad[],
    areas: Area[],
    scheduleA: Schedule,
    scheduleB: Schedule,
    decayRate: number,
  ): number {
    const revenueA = this._getTotalRevenue(ads, areas, scheduleA, decayRate);
    const revenueB = this._getTotalRevenue(ads, areas, scheduleB, decayRate);
    if (revenueA !== revenueB) return revenueA - revenueB;

    const unusedA = this._getUnusedTime(areas, scheduleA);
    const unusedB = this._getUnusedTime(areas, scheduleB);
    if (unusedA !== unusedB) return unusedB - unusedA; // less unused is better

    const divA = this.revenueEngine.getAdvertiserDiversity(ads, scheduleA);
    const divB = this.revenueEngine.getAdvertiserDiversity(ads, scheduleB);
    if (divA !== divB) return divA - divB;

    return 0;
  }

  buildSchedule(ads: Ad[], areas: Area[], decayRate: number): Schedule {
    if (ads.length === 0) return {};

    const schedule: Schedule = {};
    for (const area of areas) {
      schedule[area.areaId] = [];
    }

    const areaMap = new Map(areas.map((a) => [a.areaId, a]));
    const scheduledAdIds = new Set<string>();

    // Greedy: repeatedly pick the placement with best marginal revenue
    let changed = true;
    while (changed) {
      changed = false;
      let bestRevenue = -1;
      let bestAd: Ad | null = null;
      let bestArea: Area | null = null;
      let bestStart = -1;

      for (const ad of ads) {
        if (scheduledAdIds.has(ad.adId)) continue;

        for (const area of areas) {
          if (!this.placementEngine.isAdCompatibleWithArea(ad, area)) continue;

          // Find all possible start times in this area
          const areaSchedule = schedule[area.areaId];
          const sorted = [...areaSchedule].sort(
            (a, b) => a.startTime - b.startTime,
          );

          const gaps: [number, number][] = [];
          // Gap before first ad
          const firstStart =
            sorted.length > 0 ? sorted[0].startTime : area.timeWindow;
          if (firstStart > 0) gaps.push([0, firstStart]);
          // Gaps between ads
          for (let i = 0; i < sorted.length; i++) {
            const gapStart = sorted[i].endTime;
            const gapEnd =
              i + 1 < sorted.length ? sorted[i + 1].startTime : area.timeWindow;
            if (gapEnd > gapStart) gaps.push([gapStart, gapEnd]);
          }
          if (sorted.length === 0) gaps.push([0, area.timeWindow]);

          for (const [gapStart, gapEnd] of gaps) {
            if (gapEnd - gapStart < ad.duration) continue;

            // Earliest valid start in this gap
            const earliest = Math.max(gapStart, ad.timeReceived);
            if (earliest > ad.timeReceived + ad.timeout) continue;
            if (earliest + ad.duration > gapEnd) continue;
            if (earliest + ad.duration > area.timeWindow) continue;

            // Calculate marginal revenue
            const tempScheduledAd: ScheduledAd = {
              adId: ad.adId,
              areaId: area.areaId,
              startTime: earliest,
              endTime: earliest + ad.duration,
            };

            // Temporarily add to schedule
            schedule[area.areaId].push(tempScheduledAd);
            const revenue = this.revenueEngine.calculatePlacementRevenue(
              ad,
              areas,
              ads,
              schedule,
              decayRate,
            );
            schedule[area.areaId].pop();

            if (revenue > bestRevenue) {
              bestRevenue = revenue;
              bestAd = ad;
              bestArea = area;
              bestStart = earliest;
            }
          }
        }
      }

      if (bestAd && bestArea && bestRevenue > 0) {
        schedule[bestArea.areaId].push({
          adId: bestAd.adId,
          areaId: bestArea.areaId,
          startTime: bestStart,
          endTime: bestStart + bestAd.duration,
        });
        scheduledAdIds.add(bestAd.adId);
        changed = true;
      }
    }

    // Remove empty area entries (keep only areas with ads)
    for (const areaId of Object.keys(schedule)) {
      if (schedule[areaId].length === 0) delete schedule[areaId];
    }

    return schedule;
  }
}
