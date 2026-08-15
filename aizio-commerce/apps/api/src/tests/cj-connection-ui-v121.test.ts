import { afterEach, describe, expect, it, vi } from "vitest";
import { CjDropshippingAdapter } from "../adapters/suppliers/cjdropshipping.ts";
import {
  authErrorCode,
  connectionTestErrorCode,
  credentialConfiguredLabel,
  redactCredentialText,
  supplierConnectionLabel,
} from "../adapters/suppliers/cj-errors.ts";
import { BLOCKED_BY_LIVE_OBSERVE, detectLiveObserveWrite } from "../engines/safety/live-observe.ts";
import { openSqlite, migrate } from "../db/client.ts";
import { Repository } from "../db/repository.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";
import { createApp } from "../routes/app.ts";
import { ProviderRegistry } from "../engines/manager/provider-registry.ts";
import { ManagerAi } from "../engines/manager/manager-ai.ts";
import { VisionEngine } from "../engines/vision/vision-engine.ts";
import { OpenAiAdapter } from "../adapters/ai/openai.ts";
import { GeminiAdapter } from "../adapters/ai/gemini.ts";
import { ClaudeAdapter } from "../adapters/ai/claude.ts";
import { CoupangAdapter } from "../adapters/marketplaces/coupang.ts";
import { NaverCommerceAdapter } from "../adapters/marketplaces/naver.ts";
import type { AppServices } from "../app-context.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function routeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)),
  );
}

function repo() {
  const db = openSqlite(":memory:");
  migrate(db);
  const r = new Repository(db);
  r.saveSafetySettings({
    ...DEFAULT_SAFETY_SETTINGS,
    fx: { provider: "manual", manualUsdKrw: 1300 },
    scout: { ...DEFAULT_SAFETY_SETTINGS.scout, limit: 30, keyword: "storage organizer" },
  });
  return r;
}

function appServices(cj: CjDropshippingAdapter, r = repo()): AppServices {
  const providers = new ProviderRegistry([
    new OpenAiAdapter("", "x"),
    new GeminiAdapter("", "x"),
    new ClaudeAdapter("", "x"),
  ]);
  return {
    repo: r,
    providers,
    manager: new ManagerAi(providers),
    vision: new VisionEngine(providers),
    cj,
    coupang: new CoupangAdapter("", "", ""),
    naver: new NaverCommerceAdapter("", ""),
  };
}

function mockLiveCj() {
  routeFetch((url) => {
    if (url.includes("getAccessToken")) {
      return jsonRes(200, {
        code: 200,
        result: true,
        data: {
          accessToken: "issued-secret-token-value",
          refreshToken: "refresh-secret-value",
          accessTokenExpiryDate: "2099-01-01T00:00:00Z",
        },
      });
    }
    if (url.includes("listV2")) {
      return jsonRes(200, {
        code: 200,
        result: true,
        data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: 8, vid: "V1" }] },
      });
    }
    if (url.includes("queryByVid")) return jsonRes(200, { code: 200, result: true, data: [{ totalInventoryNum: 3 }] });
    if (url.includes("freightCalculate")) {
      return jsonRes(200, { code: 200, result: true, data: [{ logisticName: "CJ Packet", logisticPrice: 4.2 }] });
    }
    return jsonRes(200, { code: 200, result: true, data: [] });
  });
}

describe("V1.2.1 CJ connection UI contract", () => {
  it("PENDING_SETUP dashboard does not display CONNECTED", async () => {
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" })));
    const dash = (await (await app.request("/api/dashboard")).json()) as {
      cjStatus: string;
      operatingMode: string;
      supplier: { status: string; connection: string; mode: string };
    };
    expect(dash.cjStatus).toBe("PENDING_SETUP");
    expect(dash.supplier.status).toBe("PENDING_SETUP");
    expect(dash.supplier.connection).toBe("NOT CONNECTED");
    expect(dash.supplier.mode).toBe("NOT CONNECTED");
    expect(dash.operatingMode).toBe("LIVE_OBSERVE");
    expect(JSON.stringify(dash.supplier)).not.toContain("CONNECTED / READ ONLY");
  });

  it("credential required when connect body is empty", async () => {
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" })));
    const missing = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
    const body = (await missing.json()) as { error: string; mode: string };
    expect(body.error).toBe("CREDENTIAL_REQUIRED");
    expect(body.mode).toBe("NOT CONNECTED");
  });

  it("connect submits apiKey to official token endpoint and does not return raw credential", async () => {
    let posted: Record<string, unknown> | null = null;
    routeFetch((url, init) => {
      if (url.includes("getAccessToken")) {
        posted = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return jsonRes(200, {
          code: 200,
          result: true,
          data: {
            accessToken: "issued-secret-token-value",
            refreshToken: "refresh-secret-value",
            accessTokenExpiryDate: "2099-01-01T00:00:00Z",
          },
        });
      }
      if (url.includes("listV2")) {
        return jsonRes(200, {
          code: 200,
          result: true,
          data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: 8, vid: "V1" }] },
        });
      }
      if (url.includes("queryByVid")) return jsonRes(200, { code: 200, result: true, data: [{ totalInventoryNum: 3 }] });
      if (url.includes("freightCalculate")) {
        return jsonRes(200, { code: 200, result: true, data: [{ logisticName: "CJ Packet", logisticPrice: 4.2 }] });
      }
      return jsonRes(200, { code: 200, result: true, data: [] });
    });
    const r = repo();
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" }), r));
    const res = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const body = (await res.json()) as {
      connection: string;
      status: string;
      credentials: { apiKey: string; accessToken: string };
      capabilities: Record<string, string>;
      operatingMode: string;
    };
    expect(posted).toEqual({ apiKey: "official-api-key-value-xxxx" });
    expect(body.connection).toBe("CONNECTED");
    expect(body.status).toBe("READY");
    expect(body.credentials.apiKey).toBe("CONFIGURED");
    expect(body.credentials.accessToken).toBe("CONFIGURED");
    expect(body.operatingMode).toBe("LIVE_OBSERVE");
    expect(body.capabilities.orders).toBe("LOCKED");
    expect(body.capabilities.payments).toBe("LOCKED");
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("official-api-key-value-xxxx");
    expect(raw).not.toContain("issued-secret-token-value");
    expect(JSON.stringify(r.listAudit())).not.toContain("official-api-key-value-xxxx");
    expect(r.getEncryptedSecret("cj.apiKey")).toBe("official-api-key-value-xxxx");
  });

  it("failed auth returns AUTH_FAILED without echoing the key", async () => {
    routeFetch(() => jsonRes(401, { result: false, message: "User not find official-api-key-value-xxxx" }));
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" })));
    const res = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const body = (await res.json()) as { connection: string; error: string; errorCode: string };
    expect(body.connection).toBe("FAILED");
    expect(body.error).toBe("AUTH_FAILED");
    expect(body.errorCode).toBe("AUTH_FAILED");
    expect(JSON.stringify(body)).not.toContain("official-api-key-value-xxxx");
  });

  it("successful connection marks dashboard READY / CONNECTED / READ ONLY", async () => {
    mockLiveCj();
    const r = repo();
    const cj = new CjDropshippingAdapter({ apiKey: "" });
    const app = createApp(appServices(cj, r));
    await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const dash = (await (await app.request("/api/dashboard")).json()) as {
      cjStatus: string;
      operatingMode: string;
      supplier: { connection: string; mode: string; status: string };
    };
    expect(dash.cjStatus).toBe("READY");
    expect(dash.supplier.status).toBe("READY");
    expect(dash.supplier.connection).toBe("CONNECTED / READ ONLY");
    expect(dash.supplier.mode).toBe("READ ONLY");
    expect(dash.operatingMode).toBe("LIVE_OBSERVE");
  });

  it("connection test uses stored credential", async () => {
    mockLiveCj();
    const r = repo();
    r.setEncryptedSecret("cj.apiKey", "stored-official-api-key-xxxx");
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" }), r));
    const res = await app.request("/api/integrations/cjdropshipping/test", { method: "POST" });
    const body = (await res.json()) as { status: string; credentials: { apiKey: string }; probes: Array<{ name: string }> };
    expect(body.status).toBe("READY");
    expect(body.credentials.apiKey).toBe("CONFIGURED");
    expect(body.probes.map((p) => p.name)).toEqual(["authentication", "productSearch", "inventory", "shipping"]);
    expect(JSON.stringify(body)).not.toContain("stored-official-api-key-xxxx");
  });

  it("LIVE_OBSERVE remains enabled and external WRITE stays blocked", async () => {
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" })));
    const dash = (await (await app.request("/api/dashboard")).json()) as { operatingMode: string };
    expect(dash.operatingMode).toBe("LIVE_OBSERVE");
    for (const text of ["CJ에 발주해줘", "결제 실행해", "쿠팡 리스팅 등록해", "환불 처리해"]) {
      const res = await app.request("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      expect(res.status).toBe(409);
      expect(((await res.json()) as { code: string }).code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    }
    expect(detectLiveObserveWrite("CREATE_LISTING")).toBe("CREATE_LISTING");
  });

  it("redacts credentials and maps safe error codes", () => {
    expect(redactCredentialText("bad official-api-key-value-xxxx leaked", ["official-api-key-value-xxxx"])).toBe(
      "bad [REDACTED] leaked",
    );
    expect(authErrorCode({ status: "AUTH_FAILED", httpStatus: 401 })).toBe("AUTH_FAILED");
    expect(authErrorCode({ status: "AUTH_FAILED", message: "invalid apiKey" })).toBe("INVALID_API_KEY");
    expect(supplierConnectionLabel("PENDING_SETUP")).toBe("NOT CONNECTED");
    expect(supplierConnectionLabel("READY")).toBe("CONNECTED / READ ONLY");
    expect(credentialConfiguredLabel(true)).toBe("CONFIGURED");
    expect(
      connectionTestErrorCode([{ name: "productSearch", status: "UNAVAILABLE", error: null }], "UNAVAILABLE"),
    ).toBe("PRODUCT_API_FAILED");
  });
});
