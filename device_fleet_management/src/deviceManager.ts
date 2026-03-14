export interface Device {
  id: string;
  name: string;
  version: string;
  user_id: string;
  status: "active" | "inactive";
  location: {
    latitude: number;
    longitude: number;
  };
}

export class DeviceManager {
  // constructor, gets called when a new instance of the class is created
  private devices: Device[] = [];

  constructor(devices: Device[] = []) {
    devices.every((device) => this.validateDevice(device));

    this.devices = devices;
  }

  private validateDevice(device: Device) {
    if (!device.id) {
      throw new Error("Device must have an id");
    }
    if (!device.user_id) {
      throw new Error("Cannot add device: User with id nonexistent not found");
    }

    if (!device.name || !device.version || !device.status || !device.location) {
      throw new Error("Device must have a name, version, status, and location");
    }
  }
  addDevice(device: Device): void {
    this.validateDevice(device);
    if (this.getDevice(device.id)) {
      throw new Error(`Device with id ${device.id} already exists`);
    }

    this.devices.push(device);
  }

  removeDevice(id: string): void {
    const device: Device | null = this.getDevice(id);
    if (!device) {
      throw new Error(`Device with id ${id} not found`);
    }
    const index = this.devices.indexOf(device);
    if (index !== -1) {
      this.devices.splice(index, 1);
    }
  }

  getDevice(id: string): Device | null {
    return this.devices.find((device) => device.id === id) || null;
  }

  getDevicesByVersion(version: string): Device[] | null {
    return this.devices.filter((device) => device.version === version) || null;
  }

  getDevicesByUserId(user_id: string): Device[] | null {
    return this.devices.filter((device) => device.user_id === user_id) || null;
  }

  getDevicesByStatus(
    status: "active" | "inactive" | "pending" | "failed",
  ): Device[] | null {
    return this.devices.filter((device) => device.status === status) || null;
  }

  getDevicesInArea(
    latitude: number,
    longitude: number,
    radius_km: number,
  ): Device[] {
    return this.devices.filter(
      (device) =>
        distanceFormula(
          latitude,
          longitude,
          device.location.latitude,
          device.location.longitude,
        ) < radius_km,
    );
  }

  getDevicesNearDevice(device_id: string, radius_km: number): Device[] | null {
    const ref = this.devices.find((d) => d.id === device_id);
    if (!ref) return null;
    return this.devices.filter(
      (d) =>
        d.id !== device_id &&
        distanceFormula(
          ref.location.latitude,
          ref.location.longitude,
          d.location.latitude,
          d.location.longitude,
        ) <= radius_km,
    );
  }

  getAllDevices(): Device[] {
    return this.devices;
  }

  getDeviceCount(): number {
    return this.devices.length;
  }
}

//haversine formula copied from internet
function distanceFormula(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
