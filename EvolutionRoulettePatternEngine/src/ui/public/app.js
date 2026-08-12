/* 에볼루션 룰렛 패턴 엔진 — 한국어 대시보드 */

const state = {
  user: null,
  builder: [],
  dash: null,
};

const 상태이름 = {
  IDLE: '대기',
  WAIT_PATTERN: '패턴 대기',
  SIGNAL_READY: '신호 준비',
  BETTING: '배팅 중',
  WAIT_RESULT: '결과 대기',
  WIN: '승리',
  LOSS: '패배',
  REST: '휴식',
  STOPPED: '중지됨',
  ERROR: '오류',
};

const 색이름 = { R: '빨강', B: '검정', Z: '제로' };
const 색짧게 = { R: '빨', B: '검', Z: '0' };

function 모드이름(mode) {
  return mode === 'REAL' ? '실배팅' : '연습(드라이런)';
}

function 신호이름(signal, detail) {
  if (!signal || signal === 'NO BET') return '배팅 없음';
  if (signal === 'RED' || detail?.color === 'R') return '빨강';
  if (signal === 'BLACK' || detail?.color === 'B') return '검정';
  if (signal === 'R') return '빨강';
  if (signal === 'B') return '검정';
  return signal;
}

function 통계한글(stats) {
  if (!stats) return '—';
  return [
    `총 배팅: ${stats.totalBets}`,
    `승: ${stats.wins}`,
    `패: ${stats.losses}`,
    `승률: ${(stats.winRate * 100).toFixed(1)}%`,
    `손익(유닛): ${stats.profitUnits}`,
    `최대 낙폭: ${stats.maxDrawdown}`,
    `최대 연패: ${stats.maxLossStreak}`,
    `시간당 평균 배팅: ${Number(stats.averageBetsPerHour || 0).toFixed(1)}`,
    `제로(0) 횟수: ${stats.zeroCount}`,
  ].join('\n');
}

function 규칙통계한글(rows) {
  if (!rows?.length) return '아직 기록 없음';
  return rows
    .map(
      (r) =>
        `${r.ruleName}\n  신호 ${r.signals} · 승 ${r.wins} · 패 ${r.losses} · 승률 ${(r.winRate * 100).toFixed(1)}% · 손익 ${r.netUnits} · 최대마틴 ${r.maxMartingaleStage}`,
    )
    .join('\n\n');
}

function 진입이름(mode) {
  return { OPPOSITE: '반대 색', SAME: '같은 색', FIXED: '고정 색' }[mode] || mode;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function $(id) {
  return document.getElementById(id);
}

function renderHistory(dash) {
  $('historyNumbers').textContent = dash.latest || '—';
  const colors = (dash.latestColors || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => 색이름[c] || c)
    .join('  ');
  $('historyColors').textContent = colors || '—';
}

function renderViz(dash) {
  const colors = (dash.latestColors || '').split(/\s+/).filter(Boolean);
  const match = dash.pattern?.sequence || [];
  const matchStart = colors.length - match.length;
  const box = $('vizDots');
  box.innerHTML = '';

  if (match.length > 0 && matchStart >= 0) {
    const before = colors.slice(0, matchStart);
    const matched = colors.slice(matchStart);
    before.forEach((c) => box.appendChild(dotEl(c, false)));
    const group = document.createElement('div');
    group.className = 'group-box';
    matched.forEach((c) => group.appendChild(dotEl(c, true)));
    box.appendChild(group);
  } else {
    colors.slice(-16).forEach((c) => box.appendChild(dotEl(c, false)));
  }

  $('vizPattern').textContent = match.length
    ? match.map((c) => 색짧게[c] || c).join(' ')
    : colors.slice(-8).map((c) => 색짧게[c] || c).join(' ') || '—';
  $('vizRule').textContent = dash.pattern?.rule || '없음';
  $('vizState').textContent = 상태이름[dash.status] || dash.status;

  let next = '패턴 대기 중';
  if (dash.rest > 0) next = `휴식 중 · 남은 휴식 ${dash.rest}판`;
  else if (dash.signalDetail?.color) next = `배팅 신호 → ${색이름[dash.signalDetail.color]}`;
  $('vizNext').textContent = next;

  const conf = $('vizConflict');
  if (dash.conflicts?.length) {
    conf.classList.remove('hidden');
    conf.textContent = `규칙 충돌: ${dash.conflicts
      .map((c) => `${c.ruleName}(우선 ${c.priority})`)
      .join(' / ')} — 우선순위·신뢰도로 자동 선택됨`;
  } else {
    conf.classList.add('hidden');
  }
}

function dotEl(c, matched) {
  const d = document.createElement('div');
  d.className = `dot ${c}${matched ? ' matched' : ''}`;
  d.textContent = 색짧게[c] || c;
  d.title = 색이름[c] || c;
  return d;
}

function renderDash(dash) {
  state.dash = dash;
  $('tableName').textContent = dash.table?.tableName || '—';
  $('status').textContent = 상태이름[dash.status] || dash.status;
  $('mode').textContent = 모드이름(dash.mode);
  $('patternName').textContent = dash.pattern?.rule || '없음';
  $('signal').textContent = 신호이름(dash.signal, dash.signalDetail);
  $('martingale').textContent = `${dash.martingale.stage}단계 / ${dash.martingale.max}`;
  $('betAmount').textContent = `${dash.martingale.amount}`;
  $('rest').textContent = dash.rest > 0 ? `휴식 중 · 남은 ${dash.rest}판` : '없음';
  const s = dash.session;
  $('session').textContent = `${s >= 0 ? '+' : ''}${s}`;
  renderHistory(dash);
  renderViz(dash);
  $('statsBox').textContent = 통계한글(dash.stats);
  $('ruleStatsBox').textContent = 규칙통계한글(dash.ruleStats);
  fillConfig(dash.config);
  renderCustomList(dash.customPatterns || []);
}

function fillConfig(cfg) {
  if (!cfg) return;
  $('cfgBaseBet').value = cfg.strategy.martingale.baseBet;
  $('cfgMultiplier').value = cfg.strategy.martingale.multiplier;
  $('cfgMaxStage').value = cfg.strategy.martingale.maxStage;
  $('cfgRest').value = cfg.strategy.defaultRestRounds;
  $('cfgZero').value = cfg.strategy.zeroHandling;
  $('cfgIdleEnabled').checked = cfg.strategy.idleAction.enabled;
  $('cfgIdleTimeout').value = cfg.strategy.idleAction.timeoutMs;
  $('cfgIdleChip').value = cfg.strategy.idleAction.minimumChip;
  $('cfgIdleTarget').value = cfg.strategy.idleAction.targetNumber;
  $('cfgIdleWarn').checked = cfg.strategy.idleAction.warnOnly;

  $('scStreak').value = cfg.sameColor.minimumStreak;
  $('scOpposite').checked = cfg.sameColor.betOpposite;
  $('scPriority').value = cfg.sameColor.priority;
  $('scEnabled').checked = cfg.sameColor.enabled;

  $('sccRun').value = cfg.sameColorChange.minimumSameColorRun;
  $('sccChanges').value = cfg.sameColorChange.requiredChanges;
  $('sccOffset').value = cfg.sameColorChange.entryOffset;
  $('sccMode').value = cfg.sameColorChange.betMode;
  $('sccEnabled').checked = cfg.sameColorChange.enabled;

  $('altLen').value = cfg.alternating.minimumLength;
  $('altContinue').checked = cfg.alternating.continueUntilLoss;
  $('altEnabled').checked = cfg.alternating.enabled;

  $('rbMin').value = cfg.repeatingBlock.minBlockLength;
  $('rbMax').value = cfg.repeatingBlock.maxBlockLength;
  $('rbLook').value = cfg.repeatingBlock.lookback;
  $('rbEnabled').checked = cfg.repeatingBlock.enabled;
}

function renderCustomList(patterns) {
  const box = $('customList');
  box.innerHTML =
    patterns
      .map((p) => {
        const seq = p.sequence.map((c) => 색짧게[c] || c).join(' ');
        return `
    <div class="custom-item">
      <div><strong>${p.name}</strong> (${p.id})<br/>[${seq}] → ${진입이름(p.entryMode)} · 우선 ${p.priority} · ${p.enabled ? '사용중' : '꺼짐'}</div>
      <button data-del="${p.id}" class="ghost">삭제</button>
    </div>`;
      })
      .join('') || '<em>등록된 사용자 패턴이 없습니다</em>';
  box.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 패턴을 삭제할까요?')) return;
      await api(`/api/patterns/${btn.dataset.del}`, { method: 'DELETE' });
      await refresh();
    });
  });
}

function renderBuilder() {
  const box = $('builderSeq');
  box.innerHTML = state.builder
    .map((c) => `<span class="chip ${c}">${색이름[c] || c}</span>`)
    .join('');
}

async function refresh() {
  const data = await api('/api/dashboard');
  renderDash(data.data);
  $('logBox').textContent = (data.logs || [])
    .map((l) => `${l.time} ${l.message}`)
    .join('\n');
}

function bind() {
  $('btnLogin').onclick = async () => {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: $('username').value,
          password: $('password').value,
        }),
      });
      state.user = data.user;
      const role = data.user.role === 'admin' ? '관리자' : '사용자';
      $('authUser').textContent = `${data.user.username} (${role})`;
      loadUsers();
    } catch (e) {
      alert(`로그인 실패: ${e.message}`);
    }
  };

  $('btnStart').onclick = async () => {
    await api('/api/engine/start', { method: 'POST' });
    refresh();
  };
  $('btnStop').onclick = async () => {
    await api('/api/engine/stop', { method: 'POST' });
    refresh();
  };
  $('btnReset').onclick = async () => {
    if (!confirm('세션을 초기화할까요?')) return;
    await api('/api/engine/reset', { method: 'POST' });
    refresh();
  };
  $('btnDry').onclick = async () => {
    await api('/api/engine/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'DRY_RUN' }),
    });
    refresh();
  };
  $('btnReal').onclick = async () => {
    if (
      !confirm(
        '실배팅 모드로 전환할까요?\n실제 칩은 사이트 연결·안전장치 통과 후에만 들어갑니다.',
      )
    )
      return;
    await api('/api/engine/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'REAL' }),
    });
    refresh();
  };

  $('btnInjectNum').onclick = async () => {
    const n = Number($('manualNumber').value);
    if (Number.isNaN(n) || n < 0 || n > 36) {
      alert('0~36 번호를 입력하세요');
      return;
    }
    await api('/api/result', { method: 'POST', body: JSON.stringify({ number: n }) });
    refresh();
  };
  document.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api('/api/result', {
        method: 'POST',
        body: JSON.stringify({ color: btn.dataset.color }),
      });
      refresh();
    });
  });

  $('btnReplay').onclick = async () => {
    const seq = $('replayInput').value.trim();
    if (!seq) {
      alert('결과 수열을 입력하세요');
      return;
    }
    const data = await api('/api/replay', {
      method: 'POST',
      body: JSON.stringify({ sequence: seq }),
    });
    $('replayOut').textContent = data.lines
      .map((line) =>
        line
          .replace(/PATTERN_MATCH/g, '패턴감지')
          .replace(/SIGNAL → RED/g, '신호 → 빨강')
          .replace(/SIGNAL → BLACK/g, '신호 → 검정')
          .replace(/NO_BET RESTING/g, '배팅없음 휴식중')
          .replace(/WAIT/g, '대기')
          .replace(/WIN/g, '승')
          .replace(/LOSS/g, '패')
          .replace(/ROUND /g, '회차 '),
      )
      .join('\n');
    refresh();
  };

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      $(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  $('bAddR').onclick = () => {
    state.builder.push('R');
    renderBuilder();
  };
  $('bAddB').onclick = () => {
    state.builder.push('B');
    renderBuilder();
  };
  $('bAddZ').onclick = () => {
    state.builder.push('Z');
    renderBuilder();
  };
  $('bDel').onclick = () => {
    state.builder.pop();
    renderBuilder();
  };
  $('bClear').onclick = () => {
    state.builder = [];
    renderBuilder();
  };

  $('btnSavePattern').onclick = async () => {
    if (!state.builder.length) {
      alert('패턴 색을 하나 이상 추가하세요');
      return;
    }
    const id = $('pId').value || `pattern-${Date.now()}`;
    const body = {
      id,
      name: $('pName').value || id,
      sequence: [...state.builder],
      entryMode: $('pEntry').value,
      fixedBetColor: $('pFixed').value,
      onWin: $('pOnWin').value,
      onLoss: $('pOnLoss').value,
      restRounds: Number($('pRest').value),
      priority: Number($('pPriority').value),
      enabled: $('pEnabled').checked,
    };
    await api('/api/patterns', { method: 'POST', body: JSON.stringify(body) });
    state.builder = [];
    renderBuilder();
    alert('패턴이 저장되었습니다');
    refresh();
  };

  $('btnSaveStrategy').onclick = async () => {
    await api('/api/config', {
      method: 'PUT',
      body: JSON.stringify({
        strategy: {
          martingale: {
            baseBet: Number($('cfgBaseBet').value),
            multiplier: Number($('cfgMultiplier').value),
            maxStage: Number($('cfgMaxStage').value),
          },
          defaultRestRounds: Number($('cfgRest').value),
          zeroHandling: $('cfgZero').value,
          idleAction: {
            enabled: $('cfgIdleEnabled').checked,
            timeoutMs: Number($('cfgIdleTimeout').value),
            minimumChip: Number($('cfgIdleChip').value),
            targetNumber: Number($('cfgIdleTarget').value),
            warnOnly: $('cfgIdleWarn').checked,
          },
        },
      }),
    });
    alert('전략이 저장되었습니다');
    refresh();
  };

  $('btnSaveRules').onclick = async () => {
    await api('/api/config', {
      method: 'PUT',
      body: JSON.stringify({
        sameColor: {
          minimumStreak: Number($('scStreak').value),
          betOpposite: $('scOpposite').checked,
          priority: Number($('scPriority').value),
          enabled: $('scEnabled').checked,
        },
        sameColorChange: {
          minimumSameColorRun: Number($('sccRun').value),
          requiredChanges: Number($('sccChanges').value),
          entryOffset: Number($('sccOffset').value),
          betMode: $('sccMode').value,
          enabled: $('sccEnabled').checked,
        },
        alternating: {
          minimumLength: Number($('altLen').value),
          continueUntilLoss: $('altContinue').checked,
          enabled: $('altEnabled').checked,
          onWin: $('altContinue').checked ? 'CONTINUE' : 'WAIT_NEW_PATTERN',
        },
        repeatingBlock: {
          minBlockLength: Number($('rbMin').value),
          maxBlockLength: Number($('rbMax').value),
          lookback: Number($('rbLook').value),
          enabled: $('rbEnabled').checked,
        },
      }),
    });
    alert('규칙이 저장되었습니다');
    refresh();
  };

  $('btnCreateUser').onclick = async () => {
    try {
      let expiresAt = $('nuExp').value.trim() || null;
      if (expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
        expiresAt = new Date(expiresAt + 'T23:59:59').toISOString();
      }
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: $('nuUser').value,
          password: $('nuPass').value,
          expiresAt,
          deviceMemo: $('nuMemo').value,
        }),
      });
      alert('사용자가 생성되었습니다');
      $('nuUser').value = '';
      $('nuPass').value = '';
      loadUsers();
    } catch (e) {
      alert(`생성 실패: ${e.message}`);
    }
  };

  $('btnConnectEvo').onclick = async () => {
    try {
      const data = await api('/api/adapter/evolution', {
        method: 'POST',
        body: JSON.stringify({
          cdpUrl: $('cdpUrl').value,
          tableUrl: $('tableUrl').value,
        }),
      });
      alert(data.ok ? '연결 시도 완료' : `실패: ${data.error || ''}`);
    } catch (e) {
      alert(`연결 실패: ${e.message}`);
    }
  };
  $('btnSimAdapter').onclick = async () => {
    await api('/api/adapter/simulation', { method: 'POST' });
    alert('시뮬레이션 모드로 전환되었습니다');
  };
  $('btnStartPoll').onclick = async () => {
    await api('/api/adapter/poll/start', { method: 'POST' });
    alert('결과 자동 읽기를 시작했습니다');
    refresh();
  };
}

async function loadUsers() {
  try {
    const data = await api('/api/admin/users');
    $('userList').innerHTML = data.users
      .map((u) => {
        const role = u.role === 'admin' ? '관리자' : '사용자';
        const active = u.active ? '사용중' : '중지';
        const exp = u.expiresAt ? u.expiresAt.slice(0, 10) : '무기한';
        const last = u.lastLoginAt ? u.lastLoginAt.slice(0, 16).replace('T', ' ') : '없음';
        return `
      <div class="custom-item">
        <div>${u.username} · ${role} · ${active}<br/>만료 ${exp} · 최근접속 ${last} · ${u.deviceMemo || '-'} · v${u.version}</div>
        <button class="ghost" data-toggle="${u.id}" data-active="${u.active}">${u.active ? '중지' : '활성화'}</button>
      </div>`;
      })
      .join('');
    $('userList').querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/admin/users/${btn.dataset.toggle}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: btn.dataset.active !== 'true' }),
        });
        loadUsers();
      });
    });
  } catch {
    /* ignore */
  }
}

bind();
refresh();
setInterval(refresh, 3000);
