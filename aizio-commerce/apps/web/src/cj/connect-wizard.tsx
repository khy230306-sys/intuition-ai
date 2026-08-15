import { useState, type FormEvent } from "react";
import { api } from "../api";
import {
  capabilityStatus,
  credentialConfiguredLabel,
  probeDisplayName,
  scoutAllowed,
  supplierConnectionLabel,
} from "./status";

export interface CjTokenView {
  hasApiKey?: boolean;
  hasAccessToken?: boolean;
  apiKey?: string;
  accessToken?: string;
  maskedApiKey?: string | null;
  maskedAccessToken?: string | null;
  legacyWarning?: string | null;
  status?: string;
}

export interface CjIntegrationRow {
  id: string;
  name: string;
  status: string;
  lastError?: string | null;
  lastSuccessAt?: string | null;
  capabilities?: Record<string, unknown>;
}

function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const cls = value.replace(/[^A-Za-z0-9]+/g, "_").replace(/_+$/g, "");
  return <span className={`badge ${cls}`}>{value}</span>;
}

function SecretField({
  id,
  label,
  hint,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <label className="secret-label" htmlFor={id}>
      {label}
      {required ? <span className="req">필수</span> : <span className="opt">선택</span>}
      <span className="hint">{hint}</span>
      <div className="secret-field">
        <input
          id={id}
          data-testid={id}
          className="credential-input"
          type={reveal ? "text" : "password"}
          autoComplete="off"
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
        />
        <button
          type="button"
          className="btn ghost"
          data-testid={`${id}-reveal`}
          onClick={() => setReveal((v) => !v)}
        >
          {reveal ? "숨기기" : "보기"}
        </button>
      </div>
    </label>
  );
}

export function CjConnectWizard({
  integration,
  token,
  operatingMode,
  safetyLock,
  watchOverall,
  scoutLimit,
  lastTest,
  onRefresh,
  onScout,
}: {
  integration: CjIntegrationRow;
  token?: CjTokenView | null;
  operatingMode: string;
  safetyLock: boolean;
  watchOverall: string;
  scoutLimit: number;
  lastTest: Record<string, unknown> | null;
  onRefresh: () => Promise<void>;
  onScout: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(lastTest);
  const status = String(integration.status ?? "PENDING_SETUP");
  const connected = status === "READY" || status === "TOKEN_EXPIRING";
  const connection = supplierConnectionLabel(status);
  const hasApiKey = Boolean(token?.hasApiKey) || token?.apiKey === "CONFIGURED";
  const hasAccessToken = Boolean(token?.hasAccessToken) || token?.accessToken === "CONFIGURED";
  const canScout = scoutAllowed({
    cjReady: connected,
    operatingMode,
    watchOverall,
    safetyLock,
  });
  const probes = ((result?.probes ?? lastTest?.probes) as Array<{ name: string; status: string; error: string | null }> | undefined) ?? [];
  const connectOk = String(result?.connection ?? "") === "CONNECTED" || connected;
  const errorCode = connectOk
    ? ""
    : String(result?.errorCode ?? result?.error ?? integration.lastError ?? "");
  const caps = (result?.capabilities as Record<string, unknown> | undefined) ?? integration.capabilities;

  async function connect(e?: FormEvent) {
    e?.preventDefault();
    if (!apiKey.trim() && !accessToken.trim()) {
      setConnectMsg("CREDENTIAL_REQUIRED");
      return;
    }
    setBusy(true);
    try {
      const r = await api.connectCj({
        apiKey: apiKey.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
      });
      setResult(r);
      const code = String(r.errorCode ?? r.error ?? "");
      setConnectMsg(
        r.connection === "CONNECTED"
          ? `CONNECTED · READ ONLY · ${String(r.status)}`
          : String(code || "AUTH_FAILED"),
      );
      setApiKey("");
      setAccessToken("");
      await onRefresh();
    } catch (err) {
      const failed = err as { data?: Record<string, unknown> };
      const code = String(failed.data?.errorCode ?? failed.data?.error ?? "CREDENTIAL_REQUIRED");
      setConnectMsg(code);
      if (failed.data) setResult(failed.data);
    } finally {
      setBusy(false);
    }
  }

  async function testStored() {
    setBusy(true);
    try {
      const r = await api.testIntegration("cjdropshipping");
      setResult(r);
      setConnectMsg(String(r.errorCode ?? r.error ?? r.status ?? "TEST"));
      await onRefresh();
    } catch (err) {
      const failed = err as { data?: Record<string, unknown> };
      setConnectMsg(String(failed.data?.errorCode ?? failed.data?.error ?? "CJ_UNAVAILABLE"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wizard" data-testid="cj-connect-wizard">
      <div className="row">
        <span>CJdropshipping</span>
        <Badge value={status} />
      </div>
      <div className="row">
        <span>Connection</span>
        <b data-testid="cj-connection-value">{connection}</b>
      </div>
      <div className="row">
        <span>Operating Mode</span>
        <Badge value={operatingMode || "LIVE_OBSERVE"} />
      </div>
      <div className="row">
        <span>API Key</span>
        <Badge value={credentialConfiguredLabel(hasApiKey)} />
      </div>
      <div className="row">
        <span>Access Token</span>
        <Badge value={credentialConfiguredLabel(hasAccessToken)} />
      </div>
      {token?.legacyWarning ? <p className="note">{token.legacyWarning}</p> : null}

      <div className="row">
        <span>Authentication</span>
        <Badge value={capabilityStatus(status, caps, "authentication")} />
      </div>
      <div className="row">
        <span>Product Search</span>
        <Badge value={capabilityStatus(status, caps, "productSearch")} />
      </div>
      <div className="row">
        <span>Product Detail</span>
        <Badge value={capabilityStatus(status, caps, "productDetail")} />
      </div>
      <div className="row">
        <span>Inventory</span>
        <Badge value={capabilityStatus(status, caps, "inventory")} />
      </div>
      <div className="row">
        <span>Shipping</span>
        <Badge value={capabilityStatus(status, caps, "shipping")} />
      </div>
      <div className="row">
        <span>Order API</span>
        <Badge value="LOCKED" />
      </div>
      <div className="row">
        <span>Payments</span>
        <Badge value="LOCKED" />
      </div>

      <form className="connect-form" autoComplete="off" method="post" onSubmit={(e) => void connect(e)}>
        <h3>CJ 연결하기</h3>
        <p className="muted">
          My CJ → Authorization → API → Type API Key. API Key와 Access Token은 다른 값입니다. 원문은 저장·표시하지 않습니다.
        </p>
        <SecretField
          id="cj-api-key-input"
          label="CJ API Key (공식 apiKey)"
          hint="My CJ → Authorization → API"
          value={apiKey}
          onChange={setApiKey}
          required
        />
        <SecretField
          id="cj-access-token-input"
          label="CJ Access Token"
          hint="이미 발급된 CJ-Access-Token (선택)"
          value={accessToken}
          onChange={setAccessToken}
        />
        <div className="actions">
          <button className="btn" type="submit" data-testid="cj-connect-submit" disabled={busy}>
            CJ 연결하기
          </button>
          <button className="btn ghost" type="button" data-testid="cj-test-submit" disabled={busy} onClick={() => void testStored()}>
            연결 테스트
          </button>
        </div>
      </form>
      {connectMsg ? (
        <p className="muted" data-testid="cj-connect-message">
          {connectMsg}
        </p>
      ) : null}
      {errorCode && !connected ? (
        <p className="note" data-testid="cj-error-code">
          {errorCode.replace(/^CJdropshipping — /, "")}
        </p>
      ) : null}
      {probes.length ? (
        <div className="card probe-card">
          <h3>Connection Test</h3>
          {probes.map((p) => (
            <div className="row" key={p.name}>
              <span>{probeDisplayName(p.name)}</span>
              <Badge value={p.error && p.status !== "READY" ? p.error : p.status} />
            </div>
          ))}
        </div>
      ) : null}
      {canScout ? (
        <div className="actions">
          <button className="btn" type="button" data-testid="cj-scout-button" onClick={onScout}>
            실제 상품 찾기
          </button>
          <span className="muted">Scout 최대 {scoutLimit}개 · READ ONLY</span>
        </div>
      ) : (
        <p className="muted" data-testid="cj-scout-blocked">
          실제 상품 찾기는 CJ READY · LIVE_OBSERVE · Watch not CRITICAL · Safety Lock OFF 일 때만 활성화됩니다.
        </p>
      )}
    </div>
  );
}
