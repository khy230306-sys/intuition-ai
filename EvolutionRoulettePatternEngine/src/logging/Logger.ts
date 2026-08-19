import fs from 'node:fs';
import path from 'node:path';
import type { RoundLogEntry } from '../core/types.js';

export class Logger {
  private entries: RoundLogEntry[] = [];
  private stream: fs.WriteStream | null = null;

  constructor(private logDir: string, private maxMemory = 5000) {
    fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, `engine-${new Date().toISOString().slice(0, 10)}.log`);
    this.stream = fs.createWriteStream(file, { flags: 'a' });
  }

  private push(level: RoundLogEntry['level'], message: string, data?: Record<string, unknown>): void {
    const time = new Date().toISOString().slice(11, 19);
    const entry: RoundLogEntry = { time, level, message, data };
    this.entries.push(entry);
    if (this.entries.length > this.maxMemory) {
      this.entries = this.entries.slice(-this.maxMemory);
    }
    const line = `${time} ${level} ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    this.stream?.write(line + '\n');
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.push('INFO', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.push('WARN', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.push('ERROR', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.push('DEBUG', message, data);
  }

  recent(limit = 200): RoundLogEntry[] {
    return this.entries.slice(-limit);
  }

  clearMemory(): void {
    this.entries = [];
  }

  close(): void {
    this.stream?.end();
  }
}
