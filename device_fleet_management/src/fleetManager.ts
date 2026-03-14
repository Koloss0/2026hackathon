import { DeviceManager, Device } from './deviceManager';
import { UserManager, User } from './userManager';

export class FleetManager {
    deviceManager: DeviceManager;
    userManager: UserManager;

    constructor(deviceManager: DeviceManager, userManager: UserManager) {
        this.deviceManager = deviceManager;
        this.userManager = userManager;
    }

    addUser(user: User): void {
        return this.userManager.addUser(user);
    }

    removeUser(id: string): void {
        this.userManager.removeUser(id);
        const userDevices = this.deviceManager.getDevicesByUserId(id);
        if (userDevices) {
            userDevices.forEach((device) => this.deviceManager.removeDevice(device.id));
        }

    }

    getUser(id: string): User | null {
        return this.userManager.getUser(id) ?? null;
    }

    addDevice(device: Device): void {
        const user:User|null = this.userManager.getUser(device.user_id);
        if(!user) {
            throw new Error(`Cannot add device: User with id nonexistent not found`);
        } 
        this.deviceManager.addDevice(device);
        // when we add a device, we need to make sure it has a valid user_id
    }

    removeDevice(id: string): void {
        return this.deviceManager.removeDevice(id);
    }

    getDevice(id: string): Device | null {
        return this.deviceManager.getDevice(id) ?? null;
    }

    getUserDevices(userId: string): Device[] {
        return this.deviceManager.getDevicesByUserId(userId) ?? [];
    }

    getUserCount(): number {
        return this.userManager.getUserCount();
    }

    getDeviceCount(): number {
        return this.deviceManager.getDeviceCount();
    }
}

export { DeviceManager, Device } from './deviceManager';
export { UserManager, User } from './userManager';
