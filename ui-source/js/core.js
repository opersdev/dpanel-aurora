/* DPanel Mobile — 核心层：状态 / API / WebSocket / UI 工具 */
(function (w) {
  'use strict';
  const DP = w.DP = w.DP || {};
  /* UI 版本：与仓库 Release tag 同步（v 去前缀），发版时三处一起改：
     core.js 此处 / android-app/app/build.gradle versionName / 设置页关于 */
  DP.VERSION = '1.3.4';
  /* Android 壳（UA 带 DPanelMobile 标记）内不提供「使用旧版界面」入口 */
  DP.isApk = /DPanelMobile/i.test(navigator.userAgent);

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
    constructor(msg, code, title, raw) { super(msg); this.code = code; this.title = title || ''; this.raw = raw || ''; }
  };
  /* 错误码翻译：后端 errorMessage 的 title 是 ".imageImport" 这类原始码。
     映射来源：dpanel-src common/types/define/message.go + 控制器内硬编码。 */
  DP.ERRMAP = {
    '.unknow': '未知错误',
    '.commonDataNotFoundOrDeleted': '数据不存在或已被删除',
    '.commonNotFoundDPanel': '未找到 DPanel 容器',
    '.commonIdAlreadyExists': '该标识已存在',
    '.commonUploadFileEmpty': '上传文件为空',
    '.commonUseWsConnect': '请通过 WebSocket 连接执行此操作',
    '.commonCancelOperator': '操作已取消',
    '.commonDeployIncorrect': '部署信息不正确',
    '.commonExportInPath': '镜像已导出至',
    '.panelProxyUnavailable': '面板代理不可用',
    '.proLicenseFileIsCorrect': '专业版授权文件无效',
    '.xkLicenseFileIsCorrect': '授权文件无效',
    '.composeDeleteFileMustDeleteTask': '删除编排文件需同时删除关联任务',
    '.composeNotFoundYaml': '未找到编排 yaml 文件',
    '.composeDisableStorageType': '编排存储类型不可用',
    '.composeDisableStore': '编排仓库不可用',
    '.composeNameInvalid': '编排名称不合法',
    '.composeEnvInvalid': '编排环境变量不合法',
    '.composeParseYamlIncorrect': '编排 yaml 解析失败',
    '.composeRelativeBindOnVolume': '编排不支持卷的相对路径挂载',
    '.containerUpgradeDPanel': '不能升级 DPanel 自身容器',
    '.containerUpgradeTaskRunning': '升级任务执行中，请稍后再试',
    '.containerExplorerInvalidFilename': '文件名不合法',
    '.containerExplorerUnzipTargetUnsupportedType': '该解压目标类型不支持',
    '.containerExplorerEditDeleteUnsafe': '该文件不允许编辑或删除',
    '.containerExplorerEditFileMaxSize': '文件超过可编辑大小限制',
    '.containerExplorerContentUnsupportedType': '该文件类型不支持预览',
    '.containerCronExpressionInCorrect': 'cron 表达式不正确',
    '.containerCronTaskEmpty': '计划任务为空',
    '.containerPortRequiresSystemStat': '需开启系统状态采集才能使用端口功能',
    '.containerBackupImportFileFailed': '备份文件导入失败',
    '.containerBackupImportFileInCorrect': '备份文件格式不正确',
    '.containerBackupRestoreImportImageFailed': '恢复时导入镜像失败',
    '.siteDomainExists': '域名已存在',
    '.siteDomainNotFoundDPanel': '域名未关联 DPanel 容器',
    '.siteDomainJoinDefaultNetworkFailed': '加入默认网络失败',
    '.siteDomainCertIssueFailed': '证书签发失败',
    '.siteDomainCertAddTxtFailed': '添加 DNS TXT 记录失败',
    '.siteDomainCertHasBindDomain': '证书已绑定该域名',
    '.siteDomainCertHasNotDNSName': '证书缺少 DNS 名称',
    '.imagePullTagNotFound': '镜像 tag 不存在',
    '.imagePullServerHttp': '镜像服务器 HTTP 错误',
    '.imagePullRegistryBad': '镜像仓库不可用',
    '.imageRemoteTagNoPermission': '无权限查询远端镜像',
    '.imageBuildTypeEmpty': '构建类型为空',
    '.imageBuildTypeConflict': '构建类型冲突',
    '.imageImport': '镜像导入完成',
    '.imageExport': '镜像导出完成',
    '.gitPullEarlyEOF': '应用商店 Git 拉取中断（网络原因）',
    '.swarmNotInit': 'Swarm 未初始化',
    '.swarmNotManager': '当前节点不是 Swarm 管理节点',
    '.systemEnvTlsInvalidCert': 'TLS 证书无效',
    '.systemEnvApiTooOld': 'Docker API 版本过低',
    '.systemEnvDockerApiFailed': 'Docker API 连接失败',
    '.systemEnvCurrentCanNotDelete': '不能删除当前使用的环境',
    '.systemEnvNameInvalid': '环境名称不合法',
    '.systemStoreNotFoundGit': '未找到应用商店 Git 仓库',
    '.systemStoreDownloadFailed': '应用商店下载失败',
    '.settingBasicEmailInvalid': '邮件服务器配置无效',
    '.usernameOrPasswordError': '用户名或密码错误',
    '.userTwoFaEmpty': '请输入两步验证码',
    '.userTwoFaNotCorrect': '两步验证码不正确',
    '.unauthorized': '登录已过期，请重新登录',
    '.userFounderExists': '创始人账号已存在',
    '.userPasswordConfirmFailed': '两次输入的密码不一致',
    '.userDisable': '账号已被禁用',
    '.userFailedLockForever': '密码错误次数过多，账号已永久锁定',
    '.userFailedLock': '密码错误次数过多，请稍后再试',
    '.userResetTokenExpire': '重置链接已过期',
    '.userNoPermission': '没有操作权限',
    '.oauthAdminRequired': '需要 OAuth 管理员权限',
    '.homeWsHostConsoleSshNotSetting': '主机终端未配置 SSH 连接',
    '.tagUrlNotFound': '标签地址不存在'
  };
  /* 翻译错误码：'.imageImport' -> '镜像导入完成'；非映射码原样返回 */
  DP.terr = function (title) {
    if (!title) return '';
    return DP.ERRMAP[String(title).trim()] || String(title);
  };
  /* 解析后端错误：error 字段可能是 messageError 序列化的 JSON（{"title":".xx","message":"[\"k\",\"v\"]"}），
     也可能是普通字符串。返回 {text, title, kv} */
  DP.parseErr = function (err) {
    if (!err) return { text: '操作失败' };
    if (typeof err === 'string') {
      try {
        const o = JSON.parse(err);
        if (o && o.title) err = o;
      } catch (e) { return { text: String(err) }; }
    }
    if (typeof err === 'object') {
      const kv = [];
      if (typeof err.message === 'string') {
        try {
          const arr = JSON.parse(err.message);
          if (Array.isArray(arr)) for (let i = 0; i + 1 < arr.length; i += 2) kv.push([String(arr[i]), String(arr[i + 1])]);
        } catch (e) { if (err.message) kv.push(['info', err.message]); }
      }
      return { text: DP.terr(err.title), title: err.title || '', kv, raw: JSON.stringify(err) };
    }
    return { text: String(err) };
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
        /* 后端错误体可能是 {"title":".xxx","message":"[...]"} 的 JSON 字符串，翻译后再提示 */
        let msg = json.error || '', title = '';
        try {
          const o = typeof msg === 'string' ? JSON.parse(msg) : null;
          if (o && o.title) { title = o.title; msg = DP.terr(o.title) + (typeof o.message === 'string' && o.message && !o.message.startsWith('[') ? '：' + o.message : ''); }
        } catch (e) {}
        const e = new DP.apiError(msg || '请求失败（' + res.status + '）', res.status, title, typeof json.error === 'string' ? json.error : '');
        throw e;
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
  DP.fail = function (e) {
    if (!e) return DP.toast('操作失败', 'err');
    /* messageError（title + kv 数组）完整提示：翻译标题 + key: value 明细 */
    if (e.title && DP.ERRMAP[e.title]) {
      const p = DP.parseErr(e.raw);
      let msg = p.text;
      if (p.kv && p.kv.length) msg += '\n' + p.kv.map(([k, v]) => k + ': ' + v).join('\n');
      return DP.toast(msg, 'err');
    }
    DP.toast(e.message || '操作失败', 'err');
  };
  /* 「使用旧版界面」链接地址：优先用指定/登录框里的服务器地址，同源部署指向后端自带的官方 UI */
  DP.legacyUrl = function (base) {
    const b = String(base || (DP.state && DP.state.baseUrl) || location.origin).trim().replace(/\/+$/, '');
    return b + '/dpanel/static/index.html';
  };

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