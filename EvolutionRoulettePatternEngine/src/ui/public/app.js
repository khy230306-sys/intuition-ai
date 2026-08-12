/* Evolution Roulette Pattern Engine — dashboard client */

const state = {
  user: null,
  builder: [],
  dash: null,
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function $(id) { return document.getElementById(id); }

function renderHistory(dash) {
  $('historyNumbers').textContent = dash.latest || '—';
  $('historyColors').textContent = dash.latestColors || '—';
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

  $('vizPattern').textContent = match.length ? match.join(' ') : (colors.slice(-8).join(' ') || '—');
  $('vizRule').textContent = dash.pattern?.rule || '—';
  $('vizState').textContent = dash.status;
  const next = dash.signalDetail?.color
    ? `SIGNAL ${dash.signalDetail.color}`
    : dash.rest > 0
      ? `휴식 중 · 남은 휴식: ${dash.rest}판`
      : '패턴 대기';
  $('vizNext').textContent = next;

  const conf = $('vizConflict');
  if (dash.conflicts?.length) {
    conf.classList.remove('hidden');
    conf.textContent = `CONFLICT: ${dash.conflicts.map((c) => `${c.ruleId}(p${c.priority},c${c.confidence.toFixed(2)})`).join(' | ')}`;
  } else {
    conf.classList.add('hidden');
  }
}

function dotEl(c, matched) {
  const d = document.createElement('div');
  d.className = `dot ${c}${matched ? ' matched' : ''}`;
  d.textContent = c;
  return d;
}

function renderDash(dash) {
  state.dash = dash;
  $('tableName').textContent = dash.table?.tableName || '—';
  $('status').textContent = dash.status;
  $('mode').textContent = dash.mode;
  $('patternName').textContent = dash.pattern?.rule || '—';
  $('signal').textContent = dash.signal || 'NO BET';
  $('martingale').textContent = `Stage ${dash.martingale.stage} / ${dash.martingale.max}`;
  $('betAmount').textContent = `${dash.martingale.amount} unit`;
  $('rest').textContent = dash.rest > 0 ? `휴식 중 · 남은 휴식: ${dash.rest}판` : '0';
  const s = dash.session;
  $('session').textContent = `${s >= 0 ? '+' : ''}${s} units`;
  renderHistory(dash);
  renderViz(dash);
  $('statsBox').textContent = JSON.stringify(dash.stats, null, 2);
  $('ruleStatsBox').textContent = JSON.stringify(dash.ruleStats, null, 2);
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
  box.innerHTML = patterns.map((p) => `
    <div class="custom-item">
      <div><strong>${p.id}</strong> ${p.name}<br/>[${p.sequence.join(' ')}] → ${p.entryMode} pri=${p.priority} ${p.enabled ? 'ON' : 'OFF'}</div>
      <button data-del="${p.id}" class="ghost">Delete</button>
    </div>
  `).join('') || '<em>No custom patterns yet</em>';
  box.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/api/patterns/${btn.dataset.del}`, { method: 'DELETE' });
      await refresh();
    });
  });
}

function renderBuilder() {
  const box = $('builderSeq');
  box.innerHTML = state.builder.map((c) => `<span class="chip ${c}">${c}</span>`).join('');
}

async function refresh() {
  const data = await api('/api/dashboard');
  renderDash(data.data);
  $('logBox').textContent = (data.logs || []).map((l) => `${l.time} ${l.message}`).join('\n');
}

function bind() {
  $('btnLogin').onclick = async () => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('username').value, password: $('password').value }),
    });
    state.user = data.user;
    $('authUser').textContent = `${data.user.username} (${data.user.role})`;
    loadUsers();
  };

  $('btnStart').onclick = async () => { await api('/api/engine/start', { method: 'POST' }); refresh(); };
  $('btnStop').onclick = async () => { await api('/api/engine/stop', { method: 'POST' }); refresh(); };
  $('btnReset').onclick = async () => { await api('/api/engine/reset', { method: 'POST' }); refresh(); };
  $('btnDry').onclick = async () => { await api('/api/engine/mode', { method: 'POST', body: JSON.stringify({ mode: 'DRY_RUN' }) }); refresh(); };
  $('btnReal').onclick = async () => {
    if (!confirm('Enable REAL mode? Bets still require verified adapter + safety checks.')) return;
    await api('/api/engine/mode', { method: 'POST', body: JSON.stringify({ mode: 'REAL' }) });
    refresh();
  };

  $('btnInjectNum').onclick = async () => {
    const n = Number($('manualNumber').value);
    await api('/api/result', { method: 'POST', body: JSON.stringify({ number: n }) });
    refresh();
  };
  document.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api('/api/result', { method: 'POST', body: JSON.stringify({ color: btn.dataset.color }) });
      refresh();
    });
  });

  $('btnReplay').onclick = async () => {
    const data = await api('/api/replay', {
      method: 'POST',
      body: JSON.stringify({ sequence: $('replayInput').value }),
    });
    $('replayOut').textContent = data.lines.join('\n');
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

  $('bAddR').onclick = () => { state.builder.push('R'); renderBuilder(); };
  $('bAddB').onclick = () => { state.builder.push('B'); renderBuilder(); };
  $('bAddZ').onclick = () => { state.builder.push('Z'); renderBuilder(); };
  $('bDel').onclick = () => { state.builder.pop(); renderBuilder(); };
  $('bClear').onclick = () => { state.builder = []; renderBuilder(); };

  $('btnSavePattern').onclick = async () => {
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
    refresh();
  };

  $('btnCreateUser').onclick = async () => {
    await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: $('nuUser').value,
        password: $('nuPass').value,
        expiresAt: $('nuExp').value || null,
        deviceMemo: $('nuMemo').value,
      }),
    });
    loadUsers();
  };

  $('btnConnectEvo').onclick = async () => {
    try {
      const data = await api('/api/adapter/evolution', {
        method: 'POST',
        body: JSON.stringify({ cdpUrl: $('cdpUrl').value, tableUrl: $('tableUrl').value }),
      });
      alert(JSON.stringify(data, null, 2));
    } catch (e) {
      alert(e.message);
    }
  };
  $('btnSimAdapter').onclick = async () => { await api('/api/adapter/simulation', { method: 'POST' }); };
  $('btnStartPoll').onclick = async () => { await api('/api/adapter/poll/start', { method: 'POST' }); refresh(); };
}

async function loadUsers() {
  try {
    const data = await api('/api/admin/users');
    $('userList').innerHTML = data.users.map((u) => `
      <div class="custom-item">
        <div>${u.username} · ${u.role} · ${u.active ? 'active' : 'disabled'} · exp=${u.expiresAt || 'none'} · last=${u.lastLoginAt || '-'} · ${u.deviceMemo || ''} · v${u.version}</div>
        <button class="ghost" data-toggle="${u.id}" data-active="${u.active}">${u.active ? 'Disable' : 'Enable'}</button>
      </div>
    `).join('');
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
