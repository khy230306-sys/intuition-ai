import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Product, type Dashboard } from "./api";

type Page =
  | "home"
  | "recs"
  | "detail"
  | "sales"
  | "orders"
  | "review"
  | "profit"
  | "settings"
  | "hq"
  | "watch"
  | "mission";

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return <span className={`badge ${value}`}>{value}</span>;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "확인 시각 없음";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 1) return "방금 확인";
  if (m < 60) return `확인 ${m}분 전`;
  const h = Math.round(m / 60);
  return `확인 ${h}시간 전`;
}

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [dash, setDash] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([api.dashboard(), api.products()]);
    setDash(d);
    setProducts(p.products);
  }, []);

  useEffect(() => {
    void load().catch((e: Error) => setNotice(e.message));
  }, [load]);

  const recommended = useMemo(
    () =>
      products.filter(
        (p) =>
          ["TEST_SELL", "APPROVED", "LISTING_READY"].includes(p.status) &&
          p.status !== "KOREA_SHIPPING_UNAVAILABLE" &&
          p.shippingAvailability !== "UNAVAILABLE",
      ),
    [products],
  );
  const review = useMemo(
    () => products.filter((p) => ["REVIEW_REQUIRED", "BLOCKED"].includes(p.status)),
    [products],
  );

  async function runCommand() {
    if (!command.trim()) return;
    setBusy(true);
    try {
      const result = (await api.command(command.trim())) as {
        result?: { message?: string; jobId?: string };
        source?: string;
        mission?: { id: string };
      };
      setNotice(result.result?.message ?? (result.source === "COMMANDER" ? "Commander가 Mission을 시작했습니다." : "명령을 실행했습니다."));
      if (result.source === "COMMANDER" && result.mission?.id) {
        setMissionId(result.mission.id);
        setPage("mission");
      } else if (command.includes("찾아")) setPage("recs");
      if (command.includes("주문")) setPage("orders");
      if (command.includes("수익")) setPage("profit");
      await load();
    } catch {
      setNotice("명령을 실행하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function scout() {
    setBusy(true);
    try {
      if (dash && dash.scout && !dash.scout.cjReady) {
        setNotice("공급처 연결 필요");
        setPage("settings");
        return;
      }
      const r = await api.scout();
      setNotice(`실제 상품 찾기 작업이 대기열에 들어갔습니다. (${r.jobId})`);
      setPage("recs");
      await load();
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setNotice(e.data?.message ?? "공급처 연결 필요");
      setPage("settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <b>AIZIO COMMERCE</b>
          <span>AI 판매 오퍼레이터</span>
        </div>
        <button className="btn ghost" onClick={() => setPage("settings")}>
          설정
        </button>
      </header>

      <form
        className="command"
        onSubmit={(e) => {
          e.preventDefault();
          void runCommand();
        }}
      >
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="오늘 팔만한 상품 찾아줘"
        />
        <button type="submit" disabled={busy}>
          실행
        </button>
      </form>

      {notice ? <div className="note">{notice}</div> : null}
      {dash?.note ? <div className="note">{dash.note}</div> : null}

      {page === "home" && dash ? (
        <Home dash={dash} onScout={() => void scout()} go={setPage} />
      ) : null}
      {page === "recs" ? (
        <List
          title="오늘의 추천"
          items={recommended.length ? recommended : products.filter((p) => p.status === "TEST_SELL")}
          empty="아직 추천할 실제 상품이 없습니다. 공급처를 연결하거나 AI 상품 찾기를 실행하세요."
          onOpen={(p) => {
            setSelected(p);
            setPage("detail");
          }}
        />
      ) : null}
      {page === "sales" ? (
        <List
          title="판매현황"
          items={products.filter((p) => ["LIVE", "PAUSED", "LISTING_READY", "APPROVED"].includes(p.status))}
          empty="판매 중인 실제 상품이 없습니다."
          onOpen={(p) => {
            setSelected(p);
            setPage("detail");
          }}
        />
      ) : null}
      {page === "review" ? (
        <List
          title="검토 필요"
          items={review}
          empty="지금 사람이 검토할 항목이 없습니다."
          onOpen={(p) => {
            setSelected(p);
            setPage("detail");
          }}
        />
      ) : null}
      {page === "detail" && selected ? (
        <Detail
          product={selected}
          onBack={() => setPage("recs")}
          onChanged={async () => {
            await load();
            const fresh = await api.product(selected.id);
            setSelected(fresh.product);
          }}
        />
      ) : null}
      {page === "orders" ? <Orders /> : null}
      {page === "profit" && dash ? <Profit dash={dash} /> : null}
      {page === "hq" && dash ? <Hq dash={dash} onOpen={(id) => { setMissionId(id); setPage("mission"); }} /> : null}
      {page === "watch" ? <Watch /> : null}
      {page === "mission" && missionId ? <MissionView id={missionId} onBack={() => setPage("hq")} /> : null}
      {page === "settings" ? <Integrations /> : null}

      <nav className="nav">
        <button className={page === "home" ? "on" : ""} onClick={() => setPage("home")}>
          홈
        </button>
        <button className={page === "recs" ? "on" : ""} onClick={() => setPage("recs")}>
          추천
        </button>
        <button className={page === "hq" || page === "mission" ? "on" : ""} onClick={() => setPage("hq")}>
          조직
        </button>
        <button className={page === "watch" ? "on" : ""} onClick={() => setPage("watch")}>
          감시
        </button>
        <button className={page === "profit" ? "on" : ""} onClick={() => setPage("profit")}>
          수익
        </button>
      </nav>
    </div>
  );
}

function Home({
  dash,
  onScout,
  go,
}: {
  dash: Dashboard;
  onScout: () => void;
  go: (p: Page) => void;
}) {
  const counts = dash.scout?.counts;
  const cjReady = dash.scout?.cjReady ?? dash.cjStatus === "READY";
  const cjStatus = dash.supplier?.status ?? dash.cjStatus ?? "PENDING_SETUP";
  return (
    <>
      <div className="card">
        <h3>AIZIO COMMERCE</h3>
        <div className="row"><span>SUPPLIER</span><b>CJdropshipping <Badge value={cjStatus} /></b></div>
        <div className="row"><span>Operating Mode</span><Badge value={dash.operatingMode ?? "LIVE_OBSERVE"} /></div>
        {dash.cjDegraded ? <div className="note">CJ API DEGRADED</div> : null}
      </div>
      <div className="grid">
        <Stat k="오늘 실제 분석상품" v={counts?.analyzed ?? dash.analyzedToday} />
        <Stat k="한국 배송 가능" v={counts?.koreaShippable ?? 0} />
        <Stat k="위험 제외" v={counts?.riskExcluded ?? 0} />
        <Stat k="검토 필요" v={counts?.reviewNeeded ?? dash.reviewNeeded} />
        <Stat k="추천 가능" v={counts?.recommended ?? dash.recommended} />
        <Stat k="판매 중" v={dash.live} />
        <Stat k="오늘 주문" v={dash.ordersToday} />
        <Stat k="연결 대기" v={dash.pendingSetupCount} />
      </div>
      {dash.watch ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>SYSTEM HEALTH</h3>
          <div className="row"><span>System Health</span><Badge value={dash.watch.overall} /></div>
          <div className="row"><span>API</span><b>{dash.watch.apiHealthy} / {dash.watch.apiTotal} Healthy</b></div>
          <div className="row"><span>Jobs</span><b>{dash.watch.jobsRunning} Running · {dash.watch.jobsFailed} Failed</b></div>
          <div className="row"><span>Queue</span><b>{dash.watch.queue}</b></div>
          <div className="row"><span>Data</span><b>{dash.watch.data}</b></div>
          <div className="row"><span>Incidents</span><b>{dash.watch.incidentsCritical} Critical · {dash.watch.incidentsLow} Low</b></div>
          <div className="row"><span>Safety Lock</span><Badge value={dash.safetyLock ? "ON" : "OFF"} /></div>
        </div>
      ) : null}
      {dash.hq?.currentMission ? (
        <div className="card">
          <h3>AIZIO COMMERCE HQ</h3>
          <div className="row"><span>현재 Mission</span><b>{dash.hq.currentMission.command}</b></div>
          <div className="row"><span>진행률</span><b>{dash.hq.currentMission.progress}%</b></div>
          {dash.hq.currentMission.departments.map((d) => (
            <div className="row" key={d.id}><span>{d.label}</span><Badge value={d.health} /></div>
          ))}
        </div>
      ) : null}
      {counts ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>실제 상품 탐색</h3>
          <p className="muted">숫자는 DB 레코드 기준입니다. 가짜 상품/가격은 만들지 않습니다. 모드 {dash.operatingMode ?? "LIVE_OBSERVE"}</p>
          <div className="grid">
            <Stat k="분석한 실제 상품" v={counts.analyzed} />
            <Stat k="한국 배송 가능" v={counts.koreaShippable} />
            <Stat k="위험 제외" v={counts.riskExcluded} />
            <Stat k="수익 계산 가능" v={counts.profitCalculable} />
            <Stat k="추천 후보" v={counts.recommended} />
          </div>
        </div>
      ) : null}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <span>예상 순이익</span>
          <b>{won(dash.expectedNetProfit)} <Badge value="ESTIMATE" /></b>
        </div>
        <div className="row">
          <span>실제 확정 순이익</span>
          <b>{won(dash.actualNetProfit)}</b>
        </div>
        <p className="muted">예상과 실제는 따로 집계합니다. 없는 숫자는 0이며 가상 매출이 아닙니다.</p>
        <div className="actions">
          {cjReady ? (
            <button className="btn" onClick={onScout}>
              실제 상품 찾기
            </button>
          ) : (
            <button className="btn warn" onClick={() => go("settings")}>
              공급처 연결 필요
            </button>
          )}
          <button className="btn ghost" onClick={() => go("recs")}>
            오늘의 추천
          </button>
          <button className="btn ghost" onClick={() => go("sales")}>
            판매현황
          </button>
          <button className="btn ghost" onClick={() => go("orders")}>
            주문
          </button>
          <button className="btn ghost" onClick={() => go("review")}>
            검토 필요
          </button>
          <button className="btn ghost" onClick={() => go("profit")}>
            수익
          </button>
          <button className="btn ghost" onClick={() => go("settings")}>
            설정
          </button>
        </div>
      </div>
      <VisionBox />
    </>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v.toLocaleString("ko-KR")}</div>
    </div>
  );
}

function List({
  title,
  items,
  empty,
  onOpen,
}: {
  title: string;
  items: Product[];
  empty: string;
  onOpen: (p: Product) => void;
}) {
  return (
    <>
      <h1>{title}</h1>
      {items.length === 0 ? <div className="empty">{empty}</div> : items.map((p, i) => (
        <ProductCard key={p.id} product={p} rank={i + 1} onOpen={() => onOpen(p)} />
      ))}
    </>
  );
}

function ProductCard({ product, rank, onOpen }: { product: Product; rank: number; onOpen: () => void }) {
  const evidence = (product.sourceFacts?.evidence ?? {}) as Record<
    string,
    { capturedAt?: string; status?: string; displayStatus?: string; quantity?: number | null }
  >;
  const fx = evidence.fx;
  const inv = evidence.inventory;
  const landed =
    product.supplierPriceKrw != null && product.shippingKrw != null ? product.supplierPriceKrw + product.shippingKrw : null;
  const invStatus =
    inv?.status ?? (product.stock === null ? "UNKNOWN" : product.stock <= 0 ? "OUT_OF_STOCK" : "IN_STOCK");
  const fxBadge =
    fx?.displayStatus ??
    (fx?.status === "MANUAL_RATE" ? "MANUAL_FX" : fx?.status === "LIVE" ? "LIVE_FX" : "FX_NOT_CONFIGURED");
  return (
    <article className="card">
      <div className="rank">AI 추천 {rank}위</div>
      <h3>{product.title}</h3>
      <div className="actions" style={{ marginTop: 0 }}>
        <Badge value={product.status} />
        <Badge value={product.risk?.decision} />
        <Badge value={product.profitStage} />
      </div>
      <div className="row"><span>CJ 공급가격</span><b>{product.supplierPriceUsd != null ? `$${product.supplierPriceUsd}` : "—"} {won(product.supplierPriceKrw)} <Badge value="LIVE" /></b></div>
      <div className="row"><span>재고</span><b>{product.stock ?? "UNKNOWN"} <Badge value={invStatus} /> <Badge value={product.stock === null ? "UNKNOWN" : "LIVE"} /></b></div>
      <div className="row"><span>한국 배송</span><b><Badge value={product.shippingAvailability ?? "UNKNOWN"} /></b></div>
      <div className="row"><span>배송비</span><b>{product.shippingUsd != null ? `$${product.shippingUsd}` : "—"} {won(product.shippingKrw)} {product.shippingMethod ? <span className="muted">{product.shippingMethod}</span> : null} <Badge value={product.shippingAvailability === "AVAILABLE" ? "LIVE" : product.shippingAvailability ?? "UNKNOWN"} /></b></div>
      <div className="row"><span>환율</span><b>{fx?.status === "FX_RATE_NOT_CONFIGURED" ? "데이터 없음" : fx?.status ?? "—"} <Badge value={fxBadge} /></b></div>
      <div className="row"><span>원화 공급+배송</span><b>{won(landed)}</b></div>
      <div className="row"><span>목표마진 판매가</span><b>{won(product.targetMarginPriceKrw ?? product.recommendedPriceKrw)} <Badge value="ESTIMATE" /> <Badge value="TARGET_MARGIN_PRICE" /></b></div>
      <div className="row"><span>시장 관측가격</span><b>{product.marketObservedPriceKrw != null ? won(product.marketObservedPriceKrw) : "UNKNOWN"} <Badge value="UNKNOWN" /></b></div>
      <div className="row"><span>Risk</span><b>{product.risk?.decision ?? "—"}</b></div>
      <div className="row"><span>Data Confidence</span><b>{Math.round((product.confidence ?? 0) * 100)}%</b></div>
      <div className="actions">
        <button className="btn ghost" onClick={onOpen}>원본 데이터</button>
        <button className="btn ghost" onClick={onOpen}>수익 분석</button>
        <button className="btn ghost" onClick={onOpen}>위험 분석</button>
      </div>
    </article>
  );
}

function Detail({ product, onBack, onChanged }: { product: Product; onBack: () => void; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const profit = product.profit;
  async function approve() {
    setBusy(true);
    try {
      await api.approve(product.id, { autoList: false });
      await onChanged();
    } catch (err) {
      const e = err as { data?: { reasons?: string[]; message?: string } };
      alert(e.data?.reasons?.join("\n") ?? e.data?.message ?? "승인할 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn ghost" onClick={onBack}>뒤로</button>
      <h1>{product.title}</h1>
      <div className="card">
        <div className="row"><span>상태</span><Badge value={product.status} /></div>
        <div className="row"><span>공급처</span><b>{product.supplier}</b></div>
        <div className="row"><span>식별자</span><b>{product.supplierProductId ?? "—"} / {product.supplierVariantId ?? "—"}</b></div>
        <div className="row"><span>원본 확인</span><b>{timeAgo(product.capturedAt ?? product.updatedAt)}</b></div>
      </div>
      <div className="card">
        <h3>원본 데이터</h3>
        <pre className="muted">{JSON.stringify(product.sourceFacts?.evidence ?? product.sourceFacts, null, 2)}</pre>
      </div>
      <div className="card">
        <h3>수익 분석 (코드 계산)</h3>
        <p className="muted">확정 순이익이 아닙니다. 단계 {profit?.stage ?? "—"} · {profit?.calculatedAt ?? "—"}</p>
        {profit?.missingInputs.map((m) => (
          <div key={m} className="note">{m}</div>
        ))}
        <div className="row"><span>목표마진 기준 판매가</span><b>{won(product.targetMarginPriceKrw ?? profit?.sellingPrice)} <Badge value="ESTIMATE" /></b></div>
        <div className="row"><span>시장 관측가격</span><b>{product.marketObservedPriceKrw != null ? won(product.marketObservedPriceKrw) : "데이터 없음"} <Badge value="UNKNOWN" /></b></div>
        <div className="row"><span>공급원가</span><b>{won(profit?.productCost)} <Badge value={profit?.inputFreshness.productCost} /></b></div>
        <div className="row"><span>한국 배송비</span><b>{won(profit?.internationalShipping)} <Badge value={profit?.inputFreshness.internationalShipping} /></b></div>
        <div className="row"><span>총비용</span><b>{won(profit?.totalCost)}</b></div>
        <div className="row"><span>예상 순이익</span><b>{won(profit?.expectedNetProfit)} <Badge value="ESTIMATE" /></b></div>
      </div>
      <div className="card">
        <h3>점수 근거</h3>
        <div className="score-grid">
          {Object.entries(product.decision?.scores ?? {}).map(([k, v]) => (
            <div className="score" key={k}>
              <b>{k} · {v.score}</b>
              <span className="muted">{v.reason}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>위험</h3>
        {(product.risk?.findings ?? []).map((f) => (
          <div className="row" key={f.label}><span>{f.label}</span><b>{f.evidence}</b></div>
        ))}
        {product.risk?.findings.length === 0 ? <p className="muted">자동 위험 규칙은 PASS입니다.</p> : null}
      </div>
      <div className="actions">
        <button className="btn" disabled={busy || product.risk?.decision === "BLOCK"} onClick={() => void approve()}>
          판매 승인
        </button>
        <button className="btn ghost" onClick={() => void api.pause(product.id).then(onChanged)}>일시중지</button>
      </div>
    </>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void api.orders().then((r) => setOrders(r.orders));
  }, []);
  return (
    <>
      <h1>주문</h1>
      {orders.length === 0 ? (
        <div className="empty">실제 마켓플레이스 주문이 없습니다. 가짜 주문은 만들지 않습니다.</div>
      ) : (
        orders.map((o) => (
          <div className="card" key={String(o.id)}>
            <div className="row"><span>채널</span><b>{String(o.marketplace)}</b></div>
            <div className="row"><span>상태</span><b>{String(o.orderStatus)}</b></div>
            <div className="row"><span>금액</span><b>{won(Number(o.saleAmount))}</b></div>
            <p className="muted">배송지 개인정보는 암호화되어 화면에 표시하지 않습니다.</p>
          </div>
        ))
      )}
    </>
  );
}

function Profit({ dash }: { dash: Awaited<ReturnType<typeof api.dashboard>> }) {
  return (
    <>
      <h1>수익</h1>
      <div className="card">
        <div className="row"><span>예상 순이익</span><b>{won(dash.expectedNetProfit)}</b></div>
        <div className="row"><span>실제 확정 순이익</span><b>{won(dash.actualNetProfit)}</b></div>
        <p className="muted">정산이 끝나기 전에는 실제 순이익을 추정으로 채우지 않습니다.</p>
      </div>
    </>
  );
}

function Hq({ dash, onOpen }: { dash: Dashboard; onOpen: (id: string) => void }) {
  const [missions, setMissions] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void api.missions().then((r) => setMissions(r.missions));
  }, []);
  const current = dash.hq?.currentMission;
  return (
    <>
      <h1>AIZIO COMMERCE HQ</h1>
      {current ? (
        <div className="card">
          <h3>현재 Mission</h3>
          <div className="row"><span>명령</span><b>{current.command}</b></div>
          <div className="row"><span>상태</span><Badge value={current.status} /></div>
          <div className="row"><span>진행률</span><b>{current.progress}%</b></div>
          {current.departments.map((d) => (
            <div className="row" key={d.id}><span>{d.label}</span><Badge value={d.health} /></div>
          ))}
          <div className="actions">
            <button className="btn" onClick={() => onOpen(current.id)}>상세보기</button>
          </div>
        </div>
      ) : (
        <div className="empty">진행 중인 Mission이 없습니다. OWNER 명령을 한 문장으로 입력하세요.</div>
      )}
      {dash.watch ? (
        <div className="card">
          <h3>System Health</h3>
          <div className="row"><span>Overall</span><Badge value={dash.watch.overall} /></div>
          <div className="row"><span>Safety Lock</span><Badge value={dash.safetyLock ? "ON" : "OFF"} /></div>
        </div>
      ) : null}
      {missions.map((m) => (
        <div className="card" key={String(m.id)}>
          <div className="row"><span>{String(m.ownerCommand)}</span><Badge value={String(m.status)} /></div>
          <div className="row"><span>{String(m.level)} / {String(m.executionScope)}</span><b>{String(m.progress)}%</b></div>
          <button className="btn ghost" onClick={() => onOpen(String(m.id))}>열기</button>
        </div>
      ))}
    </>
  );
}

function Watch() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.watch>> | null>(null);
  useEffect(() => {
    void api.watch().then(setData);
  }, []);
  if (!data) return <p className="muted">System Watch를 불러오는 중…</p>;
  const report = data.report as {
    overall?: string;
    apiHealthy?: number;
    apiTotal?: number;
    jobsRunning?: number;
    jobsFailed?: number;
    queue?: string;
    data?: string;
    incidentsCritical?: number;
    incidentsLow?: number;
    findings?: string[];
  };
  return (
    <>
      <h1>System Watch</h1>
      <div className="card">
        <h3>Current Health</h3>
        <div className="row"><span>Overall</span><Badge value={String(report.overall ?? "UNKNOWN")} /></div>
        <div className="row"><span>API</span><b>{report.apiHealthy ?? 0} / {report.apiTotal ?? 0} Healthy</b></div>
        <div className="row"><span>Jobs</span><b>{report.jobsRunning ?? 0} Running · {report.jobsFailed ?? 0} Failed</b></div>
        <div className="row"><span>Queue</span><b>{String(report.queue ?? "Normal")}</b></div>
        <div className="row"><span>Data</span><b>{String(report.data ?? "Fresh")}</b></div>
        <div className="row"><span>Incidents</span><b>{report.incidentsCritical ?? 0} Critical · {report.incidentsLow ?? 0} Low</b></div>
        <div className="row"><span>Safety Lock</span><Badge value={data.lock ? "ON" : "OFF"} /></div>
      </div>
      <h1>Open Incidents</h1>
      {data.incidents.length === 0 ? <div className="empty">열린 Incident가 없습니다.</div> : null}
      {data.incidents.map((inc) => (
        <div className="card" key={String(inc.id)}>
          <div className="row"><span>{String(inc.title)}</span><Badge value={String(inc.severity)} /></div>
          <div className="row"><span>상태</span><Badge value={String(inc.status)} /></div>
          <pre className="muted">{String(inc.description)}</pre>
        </div>
      ))}
      {(report.findings ?? []).length ? (
        <div className="card">
          <h3>Findings</h3>
          {(report.findings ?? []).map((f) => <p className="muted" key={f}>{f}</p>)}
        </div>
      ) : null}
    </>
  );
}

function MissionView({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.mission>> | null>(null);
  useEffect(() => {
    void api.mission(id).then(setData);
  }, [id]);
  if (!data) return <p className="muted">Mission을 불러오는 중…</p>;
  const mission = data.mission;
  const result = (mission.resultJson ?? {}) as {
    classified?: { level?: string; executionScope?: string };
    proposals?: Array<{
      title: string;
      hypothesis: string;
      expectedUpside: string[];
      risks: string[];
      validationPlan: string[];
      confidence: number;
    }>;
    audit?: { decision?: string; warnings?: string[] };
    departments?: Record<string, { summary?: string; findings?: string[] }>;
  };
  const pct = (n: number) => (n <= 1 ? Math.round(n * 100) : Math.round(n));
  return (
    <>
      <button className="btn ghost" onClick={onBack}>뒤로</button>
      <h1>MISSION</h1>
      <div className="card">
        <h3>{String(mission.ownerCommand)}</h3>
        <div className="row"><span>분류</span><b>{String(mission.level)} / {String(mission.executionScope)}</b></div>
        <div className="row"><span>상태</span><Badge value={String(mission.status)} /></div>
        <div className="row"><span>목표</span><b>{String(mission.objective)}</b></div>
      </div>
      {data.tasks.map((t) => (
        <div className="card" key={String(t.id)}>
          <div className="row"><span>{String(t.department)}</span><Badge value={String(t.status)} /></div>
          <p className="muted">{String((t.result as { summary?: string } | null)?.summary ?? t.objective)}</p>
        </div>
      ))}
      {(result.proposals ?? []).map((p, i) => (
        <div className="card" key={p.title}>
          <div className="rank">{i + 1}위</div>
          <h3>{p.title}</h3>
          <p className="muted">{p.hypothesis}</p>
          <div className="row"><span>예상 장점</span><b>{(p.expectedUpside ?? []).join(" · ") || "데이터 범위 안"}</b></div>
          <div className="row"><span>위험</span><b>{(p.risks ?? []).join(" · ") || "추가 검증 필요"}</b></div>
          <div className="row"><span>권장 검증</span><b>{(p.validationPlan ?? []).join(" · ")}</b></div>
          <div className="row"><span>Confidence</span><b>{pct(p.confidence)}%</b></div>
        </div>
      ))}
      {result.audit ? (
        <div className="card">
          <h3>내부감사</h3>
          <Badge value={result.audit.decision} />
          {(result.audit.warnings ?? []).map((w) => <p className="muted" key={w}>{w}</p>)}
        </div>
      ) : null}
    </>
  );
}

function Integrations() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.integrations>> | null>(null);
  const [lastTest, setLastTest] = useState<Record<string, unknown> | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  useEffect(() => {
    void api.integrations().then(setData);
  }, []);
  if (!data) return <p className="muted">연결 상태를 불러오는 중…</p>;
  const token = (data as { token?: { maskedApiKey?: string | null; maskedAccessToken?: string | null; legacyWarning?: string | null; status?: string } }).token;
  return (
    <>
      <h1>연결 상태</h1>
      <p className="muted">CJ_API_KEY는 공식 getAccessToken의 apiKey입니다. CJ_ACCESS_TOKEN은 헤더 CJ-Access-Token이며 같은 값이 아닙니다. 원문은 표시하지 않습니다.</p>
      {data.integrations.map((i) => (
        <div className="card" key={String(i.id)}>
          <div className="row"><span>{String(i.name)}</span><Badge value={String(i.status)} /></div>
          {i.id === "cjdropshipping" ? (
            <>
              <div className="row"><span>모드</span><b>CONNECTED / READ ONLY · LIVE_OBSERVE</b></div>
              <div className="row"><span>API Key</span><b>{token?.maskedApiKey ?? (data as { secrets?: { cjApiKey?: string } }).secrets?.cjApiKey ?? "미설정"}</b></div>
              <div className="row"><span>Access Token</span><b>{token?.maskedAccessToken ?? (data as { secrets?: { cjAccessToken?: string } }).secrets?.cjAccessToken ?? "미설정"}</b></div>
              {token?.legacyWarning ? <p className="note">{token.legacyWarning}</p> : null}
            </>
          ) : null}
          <div className="row"><span>마지막 연결</span><b>{String(i.status) === "READY" ? String(i.lastSuccessAt ?? "없음") : "성공으로 표시하지 않음"}</b></div>
          <div className="row"><span>마지막 오류</span><b>{String(i.lastError ?? "없음")}</b></div>
          {i.id === "cjdropshipping" ? (
            <CapabilityMap caps={i.capabilities as Record<string, unknown>} />
          ) : (
            <pre className="muted">{JSON.stringify(i.capabilities, null, 2)}</pre>
          )}
          {i.id === "cjdropshipping" ? (
            <div className="card" style={{ marginTop: 8 }}>
              <h3>CJ 연결하기</h3>
              <label>
                CJ API Key (공식 apiKey)
                <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="My CJ → Authorization → API Key" />
              </label>
              <label>
                CJ Access Token (선택, 헤더 토큰)
                <input type="password" autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="이미 발급된 CJ-Access-Token" />
              </label>
              <div className="actions">
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void api
                      .connectCj({ apiKey: apiKey || undefined, accessToken: accessToken || undefined })
                      .then((r) => {
                        setConnectMsg(`${String(r.connection)} · ${String(r.mode)} · ${String(r.status)}`);
                        setApiKey("");
                        setAccessToken("");
                        setLastTest(r);
                        return api.integrations().then(setData);
                      })
                      .catch((err: { data?: { error?: string } }) => {
                        setConnectMsg(err.data?.error ?? "CREDENTIAL_REQUIRED");
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  CJ 연결하기
                </button>
              </div>
              {connectMsg ? <p className="muted">{connectMsg}</p> : null}
            </div>
          ) : null}
          <div className="actions">
            <button
              className="btn ghost"
              onClick={() =>
                void api.testIntegration(String(i.id)).then((r) => {
                  setLastTest(i.id === "cjdropshipping" ? r : null);
                  return api.integrations().then(setData);
                })
              }
            >
              연결 테스트
            </button>
          </div>
          {i.id === "cjdropshipping" && lastTest ? (
            <pre className="muted">{JSON.stringify(lastTest.probes ?? lastTest, null, 2)}</pre>
          ) : null}
        </div>
      ))}
      <Safety />
      <Audit />
    </>
  );
}

function capabilityLabel(value: unknown, whenMissing = "—"): string {
  if (typeof value === "string") return value;
  if (value === true) return "CAPABILITY";
  if (value === false) return "UNAVAILABLE";
  return whenMissing;
}

function CapabilityMap({ caps }: { caps: Record<string, unknown> }) {
  const rows: Array<[string, string]> = [
    ["Product Search", capabilityLabel(caps.productSearch)],
    ["Product Detail", capabilityLabel(caps.productDetail)],
    ["Inventory", capabilityLabel(caps.inventory)],
    ["Shipping", capabilityLabel(caps.shipping)],
    ["Order API", capabilityLabel(caps.orderApi ?? caps.orders, "LOCKED")],
    ["Payments", capabilityLabel(caps.payments, "LOCKED")],
    ["Tracking", capabilityLabel(caps.tracking, "LOCKED")],
    ["Dispute", capabilityLabel(caps.dispute ?? caps.disputes, "LOCKED")],
  ];
  return (
    <>
      {rows.map(([k, v]) => (
        <div className="row" key={k}><span>{k}</span><Badge value={v} /></div>
      ))}
    </>
  );
}

function Safety() {
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    void api.safety().then(setForm);
  }, []);
  if (!form) return null;
  function num(key: string) {
    return Number(form?.[key] ?? 0);
  }
  return (
    <>
      <h1>Safety Settings</h1>
      {(
        [
          ["maxPerOrderKRW", "건당 최대 발주액"],
          ["maxDailyKRW", "하루 한도"],
          ["maxMonthlyKRW", "월 한도"],
          ["minMarginRate", "최소 순마진 (0.2 = 20%)"],
          ["minConfidence", "최소 신뢰도"],
          ["maxSupplierPriceIncreaseRate", "원가 급등 허용치"],
          ["manualApprovalThresholdKRW", "수동 승인 기준"],
        ] as Array<[string, string]>
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="number"
            step="any"
            value={num(key)}
            onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
          />
        </label>
      ))}
      <div className="actions">
        <button className="btn" onClick={() => void api.saveSafety(form)}>저장</button>
      </div>
      <h1>환율 / Scout</h1>
      <p className="muted">LIVE FX Provider가 없으면 FX_RATE_NOT_CONFIGURED입니다. 수동 환율은 MANUAL_RATE로 표시됩니다. USD를 KRW 엔진에 바로 넣지 않습니다.</p>
      <label>
        운영 모드
        <input type="text" value={String(form.operatingMode ?? "LIVE_OBSERVE")} readOnly />
      </label>
      <label>
        환율 Provider (none / manual / frankfurter)
        <input
          type="text"
          value={String((form.fx as { provider?: string } | undefined)?.provider ?? "none")}
          onChange={(e) => setForm({ ...form, fx: { ...(form.fx as object), provider: e.target.value } })}
        />
      </label>
      <label>
        수동 USD/KRW 환율
        <input
          type="number"
          step="any"
          value={Number((form.fx as { manualUsdKrw?: number | null } | undefined)?.manualUsdKrw ?? 0)}
          onChange={(e) => setForm({ ...form, fx: { ...(form.fx as object), manualUsdKrw: Number(e.target.value) || null } })}
        />
      </label>
      <label>
        Scout 최대 상품 수 (1–50)
        <input
          type="number"
          value={Number((form.scout as { limit?: number } | undefined)?.limit ?? 30)}
          onChange={(e) => setForm({ ...form, scout: { ...(form.scout as object), limit: Number(e.target.value) } })}
        />
      </label>
      <label>
        목표 마진율 (0.35 = 35%)
        <input
          type="number"
          step="any"
          value={Number(form.targetMarginRate ?? 0.35)}
          onChange={(e) => setForm({ ...form, targetMarginRate: Number(e.target.value) })}
        />
      </label>
      <div className="actions">
        <button className="btn" onClick={() => void api.saveSafety(form)}>환율/Scout 저장</button>
      </div>
    </>
  );
}

function Audit() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void api.audit().then((r) => setEntries(r.entries));
  }, []);
  return (
    <>
      <h1>Audit Log</h1>
      {entries.length === 0 ? <div className="empty">아직 기록된 판매/금액 변경이 없습니다.</div> : null}
      {entries.map((e) => (
        <div className="card audit" key={String(e.id)}>
          <time>{String(e.at)}</time>
          <div><b>{String(e.action)}</b> · {String(e.actor)}</div>
          <div>{String(e.summary)}</div>
        </div>
      ))}
    </>
  );
}

function VisionBox() {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="card">
      <h3>사진으로 상품 찾기</h3>
      <p className="muted">Gemini Vision이 연결되어야 분석됩니다. 결과는 추정이며 단정하지 않습니다.</p>
      <input
        className="file"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result ?? "");
            const base64 = result.split(",")[1] ?? "";
            void api.vision(base64, file.type).then((r) => setMsg(JSON.stringify(r, null, 2)));
          };
          reader.readAsDataURL(file);
        }}
      />
      {msg ? <pre className="muted">{msg}</pre> : null}
    </div>
  );
}
