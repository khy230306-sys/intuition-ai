import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { UserRecord } from '../core/types.js';

const APP_VERSION = '1.0.0';

export class UserStore {
  private users: UserRecord[] = [];

  constructor(private filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) {
      this.users = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      // seed admin / demo user
      this.users = [];
      this.createUser('admin', 'admin123', { role: 'admin', expiresAt: null });
      this.createUser('demo', 'demo123', {
        role: 'user',
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      });
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2), 'utf8');
  }

  list(): Omit<UserRecord, 'passwordHash'>[] {
    return this.users.map(({ passwordHash: _, ...rest }) => rest);
  }

  findByUsername(username: string): UserRecord | undefined {
    return this.users.find((u) => u.username === username);
  }

  createUser(
    username: string,
    password: string,
    opts: { role?: 'admin' | 'user'; expiresAt?: string | null; deviceMemo?: string } = {},
  ): Omit<UserRecord, 'passwordHash'> {
    if (this.findByUsername(username)) throw new Error('Username already exists');
    const user: UserRecord = {
      id: randomUUID(),
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      active: true,
      expiresAt: opts.expiresAt === undefined ? null : opts.expiresAt,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      deviceMemo: opts.deviceMemo ?? '',
      version: APP_VERSION,
      role: opts.role ?? 'user',
    };
    this.users.push(user);
    this.save();
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  authenticate(username: string, password: string): Omit<UserRecord, 'passwordHash'> | null {
    const user = this.findByUsername(username);
    if (!user) return null;
    if (!user.active) return null;
    if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) return null;
    if (!bcrypt.compareSync(password, user.passwordHash)) return null;
    user.lastLoginAt = new Date().toISOString();
    this.save();
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  updateUser(
    id: string,
    patch: Partial<Pick<UserRecord, 'active' | 'expiresAt' | 'deviceMemo' | 'role'>>,
  ): Omit<UserRecord, 'passwordHash'> | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    this.save();
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  setPassword(id: string, password: string): boolean {
    const user = this.users.find((u) => u.id === id);
    if (!user) return false;
    user.passwordHash = bcrypt.hashSync(password, 10);
    this.save();
    return true;
  }
}
