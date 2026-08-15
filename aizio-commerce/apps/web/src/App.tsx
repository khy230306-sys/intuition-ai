import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Product } from "./api";

type Page =
  | "home"
  | "recs"
  | "detail"
  | "sales"
  | "orders"
  | "review"
  | "profit"
  | "settings";

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return <span className={`badge ${value}`}>{value}</span>;
}

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [dash, setDash] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([api.dashboard(), api.products()]);
    setDash(d);
    setProducts(p.products);
  }, []);

  useEffect(() => {
    void load().catch((e: Error) => setNotice(e.message));
  }, [load]);

  const recommended = useMemo(
    () => products.filter((p) => ["TEST_SELL", "APPROVED", "LISTING_READY"].includes(p.status)),
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
      const result = (await api.command(command.trim())) as { result?: { message?: string; jobId?: string } };
      setNotice(result.result?.message ?? "명령을 실행했습니다.");
      if (command.includes("찾아")) setPage("recs");
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
      const r = await api.scout();
      setNotice(`상품 탐색 작업이 대기열에 들어갔습니다. (${r.jobId}) 공급처가 연결되어야 실제 결과가 생깁니다.`);
      setPage("recs");
      await load();
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
      {page === "settings" ? <Integrations /> : null}

      <nav className="nav">
        <button className={page === "home" ? "on" : ""} onClick={() => setPage("home")}>
          홈
        </button>
        <button className={page === "recs" ? "on" : ""} onClick={() => setPage("recs")}>
          추천
        </button>
        <button className={page === "orders" ? "on" : ""} onClick={() => setPage("orders")}>
          주문
        </button>
        <button className={page === "review" ? "on" : ""} onClick={() => setPage("review")}>
          검토
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
  dash: Awaited<ReturnType<typeof api.dashboard>>;
  onScout: () => void;
  go: (p: Page) => void;
}) {
  return (
    <>
      <div className="grid">
        <Stat k="오늘 AI가 분석한 상품" v={dash.analyzedToday} />
        <Stat k="판매 후보" v={dash.candidates} />
        <Stat k="최종 추천" v={dash.recommended} />
        <Stat k="판매 중" v={dash.live} />
        <Stat k="오늘 주문" v={dash.ordersToday} />
        <Stat k="자동 처리" v={dash.autoProcessed} />
        <Stat k="검토 필요" v={dash.reviewNeeded} />
        <Stat k="연결 대기" v={dash.pendingSetupCount} />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <span>예상 순이익</span>
          <b>{won(dash.expectedNetProfit)}</b>
        </div>
        <div className="row">
          <span>실제 확정 순이익</span>
          <b>{won(dash.actualNetProfit)}</b>
        </div>
        <p className="muted">예상과 실제는 따로 집계합니다. 없는 숫자는 0이며 가상 매출이 아닙니다.</p>
        <div className="actions">
          <button className="btn" onClick={onScout}>
            AI 상품 찾기
          </button>
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
  const profit = product.profit;
  return (
    <article className="card">
      <div className="rank">AI 추천 {rank}위</div>
      <h3>{product.title}</h3>
      <div className="actions" style={{ marginTop: 0 }}>
        <Badge value={product.status} />
        <Badge value={product.risk?.decision} />
      </div>
      <div className="row"><span>공급가</span><b>{won(product.supplierPriceKrw)} <Badge value={profit?.inputFreshness.productCost} /></b></div>
      <div className="row"><span>예상 배송비</span><b>{won(product.shippingKrw)} <Badge value={profit?.inputFreshness.internationalShipping} /></b></div>
      <div className="row"><span>권장 판매가</span><b>{won(product.recommendedPriceKrw)} <Badge value={profit?.inputFreshness.sellingPrice} /></b></div>
      <div className="row"><span>예상 총비용</span><b>{won(profit?.totalCost)}</b></div>
      <div className="row"><span>예상 순이익</span><b>{won(profit?.expectedNetProfit)}</b></div>
      <div className="row"><span>순마진</span><b>{profit ? `${(profit.netMarginRate * 100).toFixed(1)}%` : "—"}</b></div>
      <div className="row"><span>경쟁도</span><b>{product.market?.competitorCount ?? "UNKNOWN"} <Badge value={product.market?.freshness} /></b></div>
      <div className="row"><span>공급 안정성</span><b>{product.decision?.scores.supplyStability?.score ?? "—"}/100</b></div>
      <div className="row"><span>위험</span><b>{product.risk?.decision ?? "—"}</b></div>
      <div className="row"><span>데이터 신뢰도</span><b>{Math.round((product.confidence ?? 0) * 100)}%</b></div>
      <div className="actions">
        <button className="btn ghost" onClick={onOpen}>상세 분석</button>
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
        <div className="row"><span>원본 확인</span><b>{product.updatedAt}</b></div>
      </div>
      <div className="card">
        <h3>수익 분석 (코드 계산)</h3>
        <p className="muted">AI가 만든 숫자가 아닙니다. 계산 시각 {profit?.calculatedAt ?? "—"}</p>
        {profit?.missingInputs.map((m) => (
          <div key={m} className="note">{m}</div>
        ))}
        <div className="row"><span>권장 판매가</span><b>{won(profit?.sellingPrice)}</b></div>
        <div className="row"><span>공급원가</span><b>{won(profit?.productCost)}</b></div>
        <div className="row"><span>총비용</span><b>{won(profit?.totalCost)}</b></div>
        <div className="row"><span>예상 순이익</span><b>{won(profit?.expectedNetProfit)}</b></div>
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

function Integrations() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.integrations>> | null>(null);
  useEffect(() => {
    void api.integrations().then(setData);
  }, []);
  if (!data) return <p className="muted">연결 상태를 불러오는 중…</p>;
  return (
    <>
      <h1>연결 상태</h1>
      <p className="muted">API 키는 화면에 그대로 보여주지 않습니다. 키는 서버 `.env`에 넣으세요.</p>
      {data.integrations.map((i) => (
        <div className="card" key={String(i.id)}>
          <div className="row"><span>{String(i.name)}</span><Badge value={String(i.status)} /></div>
          <div className="row"><span>마지막 성공</span><b>{String(i.lastSuccessAt ?? "없음")}</b></div>
          <div className="row"><span>마지막 오류</span><b>{String(i.lastError ?? "없음")}</b></div>
          <pre className="muted">{JSON.stringify(i.capabilities, null, 2)}</pre>
          <div className="actions">
            <button className="btn ghost" onClick={() => void api.testIntegration(String(i.id)).then(() => api.integrations().then(setData))}>
              Test Connection
            </button>
          </div>
        </div>
      ))}
      <Safety />
      <Audit />
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
