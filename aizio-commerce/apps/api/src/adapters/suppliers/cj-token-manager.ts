import type { CredentialStatus } from "../../shared/types.ts";
import { maskSecret } from "../../env.ts";

export interface IssuedToken {
  accessToken: string;
  accessTokenExpiryDate: string | null;
  refreshToken: string | null;
  refreshTokenExpiryDate: string | null;
}

export interface TokenSnapshot {
  status: CredentialStatus;
  hasApiKey: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  expiresAt: string | null;
  maskedApiKey: string | null;
  maskedAccessToken: string | null;
  legacyWarning: string | null;
}

const EXPIRING_MS = 24 * 60 * 60_000;

/**
 * Official CJ v2 auth (2026 docs):
 * POST /authentication/getAccessToken body { apiKey }
 * Subsequent calls: header CJ-Access-Token
 * Refresh: POST /authentication/refreshAccessToken body { refreshToken }
 * Access token life: 15 days (docs table). Refresh token: 180 days.
 * QPS = 1. Email/password is NOT part of the official v2 token endpoint.
 * CJ_API_KEY ≠ CJ_ACCESS_TOKEN.
 */
export class CJTokenManager {
  private apiKey = "";
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpiry: string | null = null;
  private refreshExpiry: string | null = null;
  private status: CredentialStatus = "NOT_CONFIGURED";
  private legacyWarning: string | null = null;

  configure(input: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    accessExpiry?: string;
    refreshExpiry?: string;
    legacyPasswordAlias?: string;
  }): void {
    const officialKey = (input.apiKey ?? "").trim();
    const legacy = (input.legacyPasswordAlias ?? "").trim();
    this.legacyWarning = null;
    if (!officialKey && legacy) {
      this.apiKey = legacy;
      this.legacyWarning =
        "CJ_API_PASSWORD는 공식 v2 필드가 아닙니다. CJ_API_KEY(My CJ → Authorization → API → Type API Key)로 이전하세요.";
    } else {
      this.apiKey = officialKey;
    }
    this.accessToken = (input.accessToken ?? "").trim() || null;
    this.refreshToken = (input.refreshToken ?? "").trim() || null;
    this.accessExpiry = (input.accessExpiry ?? "").trim() || null;
    this.refreshExpiry = (input.refreshExpiry ?? "").trim() || null;
    this.status = this.deriveInitialStatus();
  }

  private deriveInitialStatus(): CredentialStatus {
    if (!this.apiKey && !this.accessToken) return "NOT_CONFIGURED";
    if (this.accessToken && this.isExpired()) return "TOKEN_EXPIRED";
    if (this.accessToken) return "READY";
    return "NOT_CONFIGURED";
  }

  snapshot(): TokenSnapshot {
    return {
      status: this.currentStatus(),
      hasApiKey: Boolean(this.apiKey),
      hasAccessToken: Boolean(this.accessToken),
      hasRefreshToken: Boolean(this.refreshToken),
      expiresAt: this.accessExpiry,
      maskedApiKey: maskSecret(this.apiKey),
      maskedAccessToken: maskSecret(this.accessToken),
      legacyWarning: this.legacyWarning,
    };
  }

  currentStatus(): CredentialStatus {
    if (this.status === "READY") {
      if (this.isExpired()) return "TOKEN_EXPIRED";
      if (this.isExpiring()) return "TOKEN_EXPIRING";
      return "READY";
    }
    if (this.status !== "NOT_CONFIGURED") return this.status;
    if (!this.apiKey && !this.accessToken) return "NOT_CONFIGURED";
    return this.status;
  }

  setStatus(status: CredentialStatus): void {
    this.status = status;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getAccessExpiry(): string | null {
    return this.accessExpiry;
  }

  getLegacyWarning(): string | null {
    return this.legacyWarning;
  }

  needsIssue(): boolean {
    return !this.accessToken && Boolean(this.apiKey);
  }

  isExpired(now = Date.now()): boolean {
    if (!this.accessExpiry) return false;
    const exp = Date.parse(this.accessExpiry);
    return Number.isFinite(exp) && exp <= now;
  }

  isExpiring(now = Date.now()): boolean {
    if (!this.accessExpiry) return false;
    const exp = Date.parse(this.accessExpiry);
    return Number.isFinite(exp) && exp - now < EXPIRING_MS && exp > now;
  }

  applyIssued(issued: IssuedToken): void {
    this.accessToken = issued.accessToken;
    this.accessExpiry = issued.accessTokenExpiryDate;
    if (issued.refreshToken) this.refreshToken = issued.refreshToken;
    if (issued.refreshTokenExpiryDate) this.refreshExpiry = issued.refreshTokenExpiryDate;
    this.status = "READY";
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.accessExpiry = null;
  }

  persistable(): { accessToken: string | null; refreshToken: string | null; accessExpiry: string | null } {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      accessExpiry: this.accessExpiry,
    };
  }
}

export function isOfficialCjSuccess(envelope: { code?: number; result?: boolean } | null | undefined): boolean {
  if (!envelope) return false;
  if (envelope.code !== undefined && envelope.code !== 200) return false;
  if (envelope.result === false) return false;
  return true;
}
