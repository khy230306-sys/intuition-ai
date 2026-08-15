import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../env.ts";
import type { EncryptedShippingInfo } from "../shared/types.ts";

const KEY_VERSION = "v1";

function loadOrCreateKey(): Buffer {
  if (env.encryptionKey) {
    return scryptSync(env.encryptionKey, "aizio-commerce-pii", 32);
  }
  const file = resolve(env.rootDir, "data/.encryption-key");
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    return Buffer.from(readFileSync(file, "utf8").trim(), "hex");
  }
  const generated = randomBytes(32);
  writeFileSync(file, generated.toString("hex"), { mode: 0o600 });
  return generated;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadOrCreateKey();
  return cachedKey;
}

export function encryptText(plaintext: string): EncryptedShippingInfo {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptText(payload: EncryptedShippingInfo): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function encryptJson(value: unknown): EncryptedShippingInfo {
  return encryptText(JSON.stringify(value));
}

export function decryptJson<T>(payload: EncryptedShippingInfo): T {
  return JSON.parse(decryptText(payload)) as T;
}
