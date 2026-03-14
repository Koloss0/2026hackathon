/**
 * CHALLENGE 1: Single Technician — Shortest Route
 *
 * A technician starts at a known GPS location and must visit every broken
 * box exactly once. Your goal is to find the shortest possible total travel
 * distance.
 *
 * Scoring:
 *   - Correctness  — every box visited exactly once, distance is accurate.
 *   - Route quality — your total distance is compared against other teams;
 *                     shorter routes score higher on the load tests.
 *
 * Do NOT modify any interface or the pre-implemented helper methods.
 * Implement every method marked with TODO.
 */

export interface Location {
    latitude: number;   // decimal degrees
    longitude: number;  // decimal degrees
}

export interface Box {
    id: string;
    name: string;
    location: Location;
}

export interface Technician {
    id: string;
    name: string;
    startLocation: Location;
}

export interface RouteResult {
    technicianId: string;
    /** Ordered list of box IDs. Every box must appear exactly once. */
    route: string[];
    /** Total travel distance in km. Does NOT include a return leg to start. */
    totalDistanceKm: number;
}

export class RouteOptimizer {

    // ── Pre-implemented helper — do not modify ────────────────────────────────

    /**
     * Returns the great-circle distance in kilometres between two GPS
     * coordinates using the Haversine formula (Earth radius = 6 371 km).
     */
    haversineDistance(loc1: Location, loc2: Location): number {
        const R = 6371;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(loc2.latitude  - loc1.latitude);
        const dLng = toRad(loc2.longitude - loc1.longitude);
        const lat1 = toRad(loc1.latitude);
        const lat2 = toRad(loc2.latitude);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Your implementation below ─────────────────────────────────────────────

    /**
     * Takes a technician, list of boxes, and route ID's and returns the length of the route.
     * 
     * @param technician 
     * @param boxes 
     * @param routeIds 
     */
    calculateRouteDistance(
        technician: Technician,
        boxes: Box[],
        routeIds: string[]
    ): number | null {
        if (technician === undefined || boxes === undefined || routeIds === undefined) {
            return null;
        }

        if (boxes.length == 0 || routeIds.length == 0)
        {
            return 0.0;
        }

        var distance = 0.0;
        var prevLocation = technician.startLocation;
        for (const id of routeIds) {
            var nextBox = boxes.find((b, _) => b.id == id);

            if (nextBox === undefined) {
                return null;
            }

            var nextLocation = nextBox!.location;
            distance += this.haversineDistance(prevLocation, nextLocation);
            prevLocation = nextLocation;
        }
        
        return distance;
    }

    dfs(cost: number[][], vis: boolean[], last: number, cnt: number, currentPath: number[], currentCost: number): {cost: number, path: number[]} {
        const n = cost.length;

        if (cnt === n) {
            return {cost: currentCost, path: currentPath};
        }

        let minResult: {cost: number, path: number[]} = {cost: Infinity, path: []};

        for (let city = 1; city < n; city++) {
            if (!vis[city]) {
                vis[city] = true;
                let newPath = [...currentPath, city];
                let newCost = currentCost + cost[last][city];
                let result = this.dfs(cost, vis, city, cnt + 1, newPath, newCost);
                if (result.cost < minResult.cost) {
                    minResult = result;
                }
                vis[city] = false;
            }
        }

        return minResult;
    }

    tsp(cost: number[][]): {cost: number, path: number[]} {
        const n = cost.length;
        const vis = Array(n).fill(false);
        vis[0] = true;
        return this.dfs(cost, vis, 0, 1, [0], 0);
    }

    findShortestRoute(technician: Technician, boxes: Box[]): RouteResult {
        const n = boxes.length + 1;
        let cost: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

        // Populate cost matrix with distances
        cost[0][0] = 0;
        for (let i = 1; i < n; i++) {
            cost[0][i] = this.haversineDistance(technician.startLocation, boxes[i - 1].location);
            cost[i][0] = cost[0][i];
        }
        for (let i = 1; i < n; i++) {
            for (let j = 1; j < n; j++) {
                cost[i][j] = this.haversineDistance(boxes[i - 1].location, boxes[j - 1].location);
            }
        }

        let result = this.tsp(cost);
        let route = result.path.slice(1).map(i => boxes[i - 1].id);

        return {
            technicianId: technician.id,
            route: route,
            totalDistanceKm: result.cost
        };
    }
}
