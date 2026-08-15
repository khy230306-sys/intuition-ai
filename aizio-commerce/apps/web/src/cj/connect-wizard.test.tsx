import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { CjConnectWizard } from "./connect-wizard";
import { scoutAllowed, supplierConnectionLabel } from "./status";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    connectCj: vi.fn(),
    testIntegration: vi.fn(),
    scout: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

const pendingIntegration = {
  id: "cjdropshipping",
  name: "CJdropshipping",
  status: "PENDING_SETUP",
  lastError: "CREDENTIAL_REQUIRED",
  lastSuccessAt: null,
  capabilities: {},
};

function renderWizard(overrides: Partial<ComponentProps<typeof CjConnectWizard>> = {}) {
  const onRefresh = vi.fn(async () => undefined);
  const onScout = vi.fn();
  render(
    <CjConnectWizard
      integration={pendingIntegration}
      token={{ hasApiKey: false, hasAccessToken: false, apiKey: "MISSING", accessToken: "MISSING" }}
      operatingMode="LIVE_OBSERVE"
      safetyLock={false}
      watchOverall="HEALTHY"
      scoutLimit={30}
      lastTest={null}
      onRefresh={onRefresh}
      onScout={onScout}
      {...overrides}
    />,
  );
  return { onRefresh, onScout };
}

describe("CJ connection wizard UI", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders API Key password input", () => {
    renderWizard();
    const input = screen.getByTestId("cj-api-key-input");
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("password");
  });

  it("renders optional Access Token password input", () => {
    renderWizard();
    const input = screen.getByTestId("cj-access-token-input");
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("password");
    expect(screen.getByText("선택")).toBeTruthy();
  });

  it("masks credentials by default and reveals only while 보기 is pressed", () => {
    renderWizard();
    const input = screen.getByTestId("cj-api-key-input");
    expect(input.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByTestId("cj-api-key-input-reveal"));
    expect(input.getAttribute("type")).toBe("text");
    fireEvent.click(screen.getByTestId("cj-api-key-input-reveal"));
    expect(input.getAttribute("type")).toBe("password");
  });

  it("requires a credential before connect", async () => {
    renderWizard();
    fireEvent.click(screen.getByTestId("cj-connect-submit"));
    expect(await screen.findByTestId("cj-connect-message")).toBeTruthy();
    expect(screen.getByTestId("cj-connect-message").textContent).toContain("CREDENTIAL_REQUIRED");
    expect(api.connectCj).not.toHaveBeenCalled();
  });

  it("connect submits apiKey in POST body and does not persist raw credential in localStorage", async () => {
    vi.mocked(api.connectCj).mockResolvedValue({
      connection: "CONNECTED",
      status: "READY",
      operatingMode: "LIVE_OBSERVE",
      credentials: { apiKey: "CONFIGURED", accessToken: "CONFIGURED" },
      probes: [
        { name: "authentication", status: "READY", error: null },
        { name: "productSearch", status: "READY", error: null },
        { name: "inventory", status: "READY", error: null },
        { name: "shipping", status: "READY", error: null },
      ],
    });
    const { onRefresh } = renderWizard();
    fireEvent.change(screen.getByTestId("cj-api-key-input"), {
      target: { value: "official-api-key-value-xxxx" },
    });
    fireEvent.click(screen.getByTestId("cj-connect-submit"));
    await waitFor(() => expect(api.connectCj).toHaveBeenCalledTimes(1));
    expect(api.connectCj).toHaveBeenCalledWith({ apiKey: "official-api-key-value-xxxx", accessToken: undefined });
    expect(localStorage.length).toBe(0);
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      expect(localStorage.getItem(key)).not.toContain("official-api-key-value-xxxx");
    }
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(screen.queryByDisplayValue("official-api-key-value-xxxx")).toBeNull();
  });

  it("does not render raw credential after a successful connect response", async () => {
    vi.mocked(api.connectCj).mockResolvedValue({
      connection: "CONNECTED",
      status: "READY",
      credentials: { apiKey: "CONFIGURED", accessToken: "CONFIGURED" },
      token: { apiKey: "CONFIGURED", accessToken: "CONFIGURED" },
    });
    renderWizard();
    fireEvent.change(screen.getByTestId("cj-api-key-input"), { target: { value: "official-api-key-value-xxxx" } });
    fireEvent.click(screen.getByTestId("cj-connect-submit"));
    await waitFor(() => expect(screen.getByTestId("cj-connect-message").textContent).toContain("CONNECTED"));
    expect(document.body.textContent).not.toContain("official-api-key-value-xxxx");
    expect(screen.getByTestId("cj-connect-message").textContent).toContain("READY");
  });

  it("successful connection shows READY and enables scout", () => {
    renderWizard({
      integration: { ...pendingIntegration, status: "READY", lastError: null },
      token: { hasApiKey: true, hasAccessToken: true, apiKey: "CONFIGURED", accessToken: "CONFIGURED" },
    });
    expect(screen.getByTestId("cj-connection-value").textContent).toBe("CONNECTED / READ ONLY");
    expect(screen.getByTestId("cj-scout-button")).toBeTruthy();
    expect(screen.getAllByText("READY").length).toBeGreaterThan(0);
  });

  it("failed auth shows AUTH_FAILED", async () => {
    vi.mocked(api.connectCj).mockRejectedValue({
      data: { connection: "FAILED", error: "AUTH_FAILED", errorCode: "AUTH_FAILED" },
    });
    renderWizard();
    fireEvent.change(screen.getByTestId("cj-api-key-input"), { target: { value: "bad-key-value-xxxx" } });
    fireEvent.click(screen.getByTestId("cj-connect-submit"));
    expect(await screen.findByTestId("cj-connect-message")).toBeTruthy();
    expect(screen.getByTestId("cj-connect-message").textContent).toContain("AUTH_FAILED");
    expect(document.body.textContent).not.toContain("bad-key-value-xxxx");
  });

  it("PENDING_SETUP does not display CONNECTED", () => {
    renderWizard();
    expect(screen.getByTestId("cj-connection-value").textContent).toBe("NOT CONNECTED");
    expect(screen.getByTestId("cj-connection-value").textContent).not.toBe("CONNECTED / READ ONLY");
    expect(supplierConnectionLabel("PENDING_SETUP")).toBe("NOT CONNECTED");
  });

  it("LIVE_OBSERVE remains enabled on the wizard", () => {
    renderWizard();
    expect(screen.getByText("LIVE_OBSERVE")).toBeTruthy();
    expect(screen.getAllByText("LOCKED").length).toBeGreaterThan(0);
  });

  it("external WRITE remains blocked in LIVE_OBSERVE scout gate", () => {
    renderWizard();
    expect(screen.getByTestId("cj-scout-blocked")).toBeTruthy();
    expect(screen.queryByTestId("cj-scout-button")).toBeNull();
    expect(
      scoutAllowed({
        cjReady: true,
        operatingMode: "LIVE_OBSERVE",
        watchOverall: "HEALTHY",
        safetyLock: false,
      }),
    ).toBe(true);
    expect(
      scoutAllowed({
        cjReady: true,
        operatingMode: "LIVE_TRADE",
        watchOverall: "HEALTHY",
        safetyLock: false,
      }),
    ).toBe(false);
  });
});
