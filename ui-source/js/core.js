/* DPanel Mobile — 核心层：状态 / API / WebSocket / UI 工具 */
(function (w) {
  'use strict';
  const DP = w.DP = w.DP || {};
  /* UI 版本：与仓库 Release tag 同步（v 去前缀），发版时三处一起改：
     core.js 此处 / android-app/app/build.gradle versionName / 设置页关于 */
  DP.VERSION = '1.3.2';

  /* ---------------- DOM 小工具 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  DP.$ = $; DP.$$ = $$;
  DP.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  DP.icon = (n, cls) => `<svg class="ico ${cls || ''}"><use href="#i-${n}"/></svg>`;
  DP.el = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  /* 清空 root 上所有委托监听器（页面切换时调用，防止旧页面的 .item-card 等处理器
     在新页面上误触发：把 compose id 当镜像/容器 id 查询等连锁错误） */
  DP.offAll = function (root) {
    const map = root && root._dpHandlers;
    if (!map) return;
    Object.keys(map).forEach(key => {
      const i = key.indexOf('::');
      root.removeEventListener(key.slice(0, i), map[key]);
    });
    root._dpHandlers = {};
  };
  /* 延迟回调防竞态：调度时记录 DP._currentRoute（对象标识），触发时路由已变则放弃渲染。
     否则概览页磁盘重试等 3s 后回调会把旧页面渲染进当前页面（表现为“点容器跳回首页”） */
  DP.stillHere = function (mark) { return mark != null && DP._currentRoute === mark; };
  /* 事件委托：同一 root + evt + selector 只保留一个监听器。 */
  DP.on = function (root, evt, sel, fn) {
    const map = root._dpHandlers || (root._dpHandlers = {});
    const key = evt + '::' + sel;
    if (map[key]) root.removeEventListener(evt, map[key]);
    const handler = e => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    };
    map[key] = handler;
    root.addEventListener(evt, handler);
  };

  /* ---------------- 格式化 ---------------- */
  DP.fmtBytes = function (n) {
    if (n == null || isNaN(n) || n < 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0; n = Number(n);
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (n >= 100 || i === 0 ? Math.round(n) : n.toFixed(n >= 10 ? 1 : 2)) + ' ' + u[i];
  };
  // 后端不少接口返回秒级时间戳(int64)，JS Date 需要毫秒；自动识别
  DP._date = function (v) {
    if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) {
      const n = Number(v);
      if (isFinite(n) && Math.abs(n) < 1e12) return new Date(n * 1000);
    }
    return new Date(v);
  };
  DP.fmtTime = function (v) {
    if (!v && v !== 0) return '—';
    const d = DP._date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  DP.ago = function (v) {
    if (!v && v !== 0) return '—';
    const d = DP._date(v), s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return String(v);
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    if (s < 2592000) return Math.floor(s / 86400) + ' 天前';
    return DP.fmtTime(v).slice(0, 10);
  };
  DP.short = (v, n) => { v = String(v || ''); return v.length > (n || 12) ? v.slice(0, n || 12) + '…' : v; };
  DP.cid = function (c) { return (c && (c.Id || c.ID || c.id)) || ''; }; /* Docker SDK 序列化为 Id（非 ID），兼容三种 */
  DP.name = function (c) { return (c.Names && c.Names[0] || c.names && c.names[0] || c.name || c.Name || (c && (c.Id || c.ID)) || '').replace(/^\//, ''); };
  DP.statusOf = function (c) {
    const raw = (c.State && typeof c.State === 'object') ? (c.State.Status || c.State.status || '') : (c.State || c.status || '');
    const s = String(raw || '').toLowerCase();
    if (s === 'running' || s === 'healthy') return { label: '运行中', cls: 'green', color: 'var(--green)' };
    if (s === 'paused' || s === 'restarting') return { label: s === 'paused' ? '已暂停' : '重启中', cls: 'amber', color: 'var(--amber)' };
    if (s === 'exited' || s === 'dead' || s === 'stopped') return { label: '已停止', cls: 'red', color: 'var(--red)' };
    if (s === 'created') return { label: '已创建', cls: 'blue', color: 'var(--blue)' };
    return { label: String(raw || '未知'), cls: '', color: 'var(--ink-3)' };
  };
  DP.pct = function (a, b) { return !b ? 0 : Math.min(100, Math.round(a / b * 100)); };

  /* ---------------- 持久化状态 ---------------- */
  const LS = 'dpanel-mobile-v1';
  DP.state = {
    baseUrl: '', token: '', auto: false, user: '', demo: false,
    theme: localStorage.getItem('dpanel-theme') || 'light',
    env: '', envs: [], feature: [], noticeUnread: 0,
    servers: [], wsFd: '', ws: null, wsHandlers: {}, cache: {}
  };
  DP.save = function () {
    const s = DP.state;
    localStorage.setItem(LS, JSON.stringify({ baseUrl: s.baseUrl, token: s.token, auto: s.auto, user: s.user, servers: s.servers, env: s.env }));
  };
  DP.restore = function () {
    try {
      const d = JSON.parse(localStorage.getItem(LS) || '{}');
      Object.assign(DP.state, d);
      if (d.token) {
        DP.state.servers = DP.state.servers || [];
        if (!DP.state.servers.some(x => x.baseUrl === d.baseUrl)) DP.state.servers.unshift({ baseUrl: d.baseUrl, user: d.user || 'admin' });
      }
    } catch (e) { /* ignore corrupt storage */ }
  };
  DP.setTheme = function (t) {
    DP.state.theme = t;
    document.documentElement.dataset.theme = t;
    localStorage.setItem('dpanel-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'dark' ? '#121118' : '#5B5BD6';
    const b = $('#theme-btn use'); if (b) b.setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon');
  };
  DP.logout = function () {
    const s = DP.state;
    s.token = ''; s.user = ''; s.env = ''; s.envs = [];
    if (s.ws) { try { s.ws.close(); } catch (e) {} s.ws = null; }
    DP.save();
    $('#main-view').classList.add('hidden');
    $('#login-view').classList.remove('hidden');
    DP.renderServers();
  };

  /* ---------------- API ---------------- */
  DP.apiError = class ApiError extends Error {
    constructor(msg, code) { super(msg); this.code = code; }
  };
  DP.api = async function (path, params, opt) {
    opt = opt || {};
    if (DP.state.demo) return DP.demoApi(path, params || {}, opt);
    const s = DP.state;
    if (!s.token) throw new DP.apiError('登录已过期，请重新登录', 401);
    let url = s.baseUrl.replace(/\/+$/, '') + '/dpanel/api' + path;
    if (opt.query) url += '?' + new URLSearchParams(opt.query);
    const headers = { 'Accept': 'application/json' };
    if (!opt.form) headers['Content-Type'] = 'application/json';
    headers['Authorization'] = 'Bearer ' + s.token;
    if (s.wsFd) headers['AuthorizationFd'] = s.wsFd; /* fd 管道接口（磁盘占用/统计等）依赖此头 */
    const method = opt.method || 'POST';
    let body = undefined;
    if (method === 'POST') body = opt.form ? params : JSON.stringify(params || {});
    let res, json;
    try {
      res = await fetch(url, { method, headers, body, signal: opt.signal });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new DP.apiError('无法连接到面板服务器，请检查地址与网络', 0);
    }
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try { json = await res.json(); } catch (e) { throw new DP.apiError('服务器返回了无效数据', res.status); }
      if (json.code !== 200 && res.status !== 200) {
        if (res.status === 401) { setTimeout(() => DP.logout(), 400); }
        throw new DP.apiError(json.error || '请求失败（' + res.status + '）', res.status);
      }
      return json.data;
    }
    if (!res.ok) throw new DP.apiError('请求失败（' + res.status + '）', res.status);
    return opt.blob ? await res.blob() : await res.text();
  };
  DP.download = function (url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name || '';
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* ---------------- WebSocket ---------------- */
  DP.onWs = function (type, fn) {
    (DP.state.wsHandlers[type] = DP.state.wsHandlers[type] || []).push(fn);
    return () => {
      const list = DP.state.wsHandlers[type] || [];
      const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1);
    };
  };
  DP.emitWs = function (type, data) { (DP.state.wsHandlers[type] || []).forEach(f => { try { f(data); } catch (e) { console.warn(e); } }); };
  DP.sendWs = function (obj) {
    if (DP.state.demo) { DP.demoWs(obj); return; }
    if (DP.state.ws && DP.state.ws.readyState === 1) DP.state.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
  };
  /* 等待 notice WS 下发 fd（event:fd）。fd 管道接口（容器日志 log/run 等）必须携带 */
  DP.waitFd = function (timeout) {
    return new Promise(resolve => {
      const s = DP.state;
      if (s.wsFd) return resolve(s.wsFd);
      if (s.demo || !s.token) return resolve('');
      let done = false;
      const off = DP.onWs('event:fd', () => { if (!done) { done = true; resolve(s.wsFd); } });
      setTimeout(() => { if (!done) { done = true; off(); resolve(s.wsFd || ''); } }, timeout || 5000);
      if (!s.ws || s.ws.readyState > 1) DP.connectWs();
    });
  };
  DP.connectWs = function () {
    if (DP.state.demo || !DP.state.token) return;
    if (DP.state.ws && [0, 1].includes(DP.state.ws.readyState)) return;
    const s = DP.state;
    const scheme = s.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = s.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    // 兼容带路径前缀的部署地址
    const base = s.baseUrl.replace(/\/+$/, '');
    const prefix = base.replace(/^https?:\/\/[^/]+/, '');
    const url = scheme + '://' + host + prefix + '/dpanel/ws/common/notice?token=' + encodeURIComponent(s.token);
    let ws;
    try { ws = new WebSocket(url); } catch (e) { return; }
    s.ws = ws;
    ws.onmessage = function (ev) {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'event:fd') { s.wsFd = m.data; DP.emitWs('event:fd', m.data); }
      DP.emitWs(m.type, m.data);
    };
    ws.onclose = function () {
      s.wsFd = '';
      if (s.token && !s.demo) setTimeout(() => { if (s.token) DP.connectWs(); }, 4000);
    };
  };

  /* ---------------- Toast / Loading ---------------- */
  let toastTimer = [];
  const toastSeen = new Map();
  DP.toast = function (msg, type) {
    const root = $('#toast-root'); if (!root) return;
    const key = (type || '') + '|' + msg;
    const now = Date.now();
    // 同一条消息 1.2 秒内只提示一次，避免批量失败时刷屏
    if (toastSeen.has(key) && now - toastSeen.get(key) < 1200) return;
    toastSeen.set(key, now);
    // 同时最多 3 条，移除最旧的
    while (root.children.length >= 3) root.removeChild(root.firstChild);
    const el = DP.el(`<div class="toast ${type || ''}">${DP.icon(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info', 'sm')}<span>${DP.esc(msg)}</span></div>`);
    root.appendChild(el);
    const t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 250); }, 2600);
    toastTimer.push(t);
  };
  DP.loading = function (on) { const el = $('#loading'); if (el) el.classList.toggle('hidden', !on); };
  DP.fail = function (e) { DP.toast(e && e.message || '操作失败', 'err'); };

  /* ---------------- 底部弹层 ---------------- */
  DP.sheet = function (opt) {
    DP.closeSheet();
    const root = $('#sheet-root');
    const scrim = DP.el('<div class="scrim"></div>');
    const sheet = DP.el(`<div class="sheet ${opt.full ? 'sheet-full' : ''}">
      <div class="sheet-head"><h3>${DP.esc(opt.title || '')}</h3>${opt.sub ? `<p>${DP.esc(opt.sub)}</p>` : ''}</div>
      <div class="sheet-body">${opt.body || ''}${opt.actions ? `<div class="sheet-actions">${opt.actions}</div>` : ''}</div>
    </div>`);
    root.appendChild(scrim); root.appendChild(sheet);
    scrim.addEventListener('click', DP.closeSheet);
    if (opt.onOpen) opt.onOpen(sheet);
    return sheet;
  };
  DP.closeSheet = function () {
    const root = $('#sheet-root');
    if (root) root.innerHTML = '';
  };
  DP.confirm = function (opt) {
    DP.sheet({
      title: opt.title || '确认操作',
      sub: opt.text || '',
      body: `<div class="card tight"><div class="row"><div class="avatar-sm ${opt.danger ? 'red' : ''}">${DP.icon(opt.danger ? 'alert' : 'info')}</div><div class="grow mid">${DP.esc(opt.detail || opt.text || '此操作不可撤销，请确认继续。')}</div></div></div>`,
      actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn ${opt.danger ? 'danger' : 'primary'} grow" data-act="ok">${DP.esc(opt.okText || '确认')}</button>`
    });
    $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
    $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
      DP.closeSheet();
      try { await opt.onOk(); } catch (e) { DP.fail(e); }
    };
  };
  DP.prompt = function (opt) {
    DP.sheet({
      title: opt.title || '输入',
      sub: opt.sub || '',
      body: `<div class="form-field"><label>${DP.esc(opt.label || '')}</label><input id="prompt-input" value="${DP.esc(opt.value || '')}" placeholder="${DP.esc(opt.placeholder || '')}"></div>
        ${opt.hint ? `<p class="small muted">${DP.esc(opt.hint)}</p>` : ''}`,
      actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">确定</button>`
    });
    const input = $('#prompt-input');
    setTimeout(() => input && input.focus(), 120);
    $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
    $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
      const v = input.value.trim();
      if (!v && opt.required !== false) return DP.toast('请输入内容', 'err');
      DP.closeSheet();
      try { await opt.onOk(v); } catch (e) { DP.fail(e); }
    };
  };
  DP.toggle = function (el, on) { el.classList.toggle('on', !!on); };

  /* ---------------- 简易 SVG 图表 ---------------- */
  DP.sparkline = function (values, color, fill) {
    values = (values && values.length ? values : [0, 0]).slice(-30).map(v => Number(v) || 0);
    const max = Math.max(1, ...values), min = Math.min(...values, 0);
    const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1) * 100).toFixed(1)},${(50 - (v - min) / (max - min || 1) * 44).toFixed(1)}`).join(' ');
    const c = color || 'var(--primary)';
    return `<svg class="spark" viewBox="0 0 100 52" preserveAspectRatio="none">
      ${fill !== false ? `<polygon points="0,52 ${pts} 100,52" fill="${c}" opacity=".13"/>` : ''}
      <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  };
  DP.donut = function (value, color, size) {
    size = size || 76; const r = 30, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, Math.max(0, value)) / 100);
    return `<svg width="${size}" height="${size}" viewBox="0 0 76 76"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="8"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color || 'var(--primary)'}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor">${Math.round(value)}%</text></svg>`;
  };
})(window);
