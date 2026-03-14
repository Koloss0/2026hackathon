export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
}

export class UserManager {

      private users: User[] = [];

    constructor(users: User[] = [])  {
      users.every((user) => this.validateUser(user));
      this.users = users;
    }
    addUser(user: User): void {
      this.validateUser(user);
        if(this.getUser(user.id)) {
          throw new Error(`User with id ${user.id} already exists`);
        }
      this.users.push(user);
    }

    removeUser(id: string): void {
      const user: User | null = this.getUser(id);
      if (!user) {
        throw new Error(`User with id ${id} not found`);
      }
      const index = this.users.indexOf(user);
      if (index !== -1) {
        this.users.splice(index, 1);
      }
    }

    getUser(id: string): User | null {
      return this.users.find((user) => user.id === id) || null;
    }

    getUsersByEmail(email: string): User[] | null {
      return this.users.filter((user) => user.email === email) || null;
    }

    getUsersByPhone(phone: string): User[] | null {
      return this.users.filter((user) => user.phone === phone) || null;
    }

    getAllUsers(): User[] {
        return this.users;
    }

    getUserCount(): number {
        return this.users.length;
    }

    private validateUser(user: User){
       if(!user.id) {
        throw new Error('User must have an id');
       }
       if(!user.name || !user.email || !user.phone || !user.address) {
        throw new Error('User must have a name, email, phone, and address');
       }
      
    }
}
