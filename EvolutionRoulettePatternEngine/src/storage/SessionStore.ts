import fs from 'node:fs';
import path from 'node:path';
import type { SessionRoundRecord } from '../core/types.js';

export interface SavedSession {
  id: string;
  createdAt: string;
  label: string;
  records: SessionRoundRecord[];
  notes?: string;
}

export class SessionStore {
  constructor(private dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  save(session: SavedSession): void {
    const file = path.join(this.dir, `${session.id}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf8');
  }

  list(): Omit<SavedSession, 'records'>[] {
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const data = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')) as SavedSession;
        return {
          id: data.id,
          createdAt: data.createdAt,
          label: data.label,
          notes: data.notes,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  load(id: string): SavedSession | null {
    const file = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}
