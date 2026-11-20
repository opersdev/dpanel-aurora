/* DPanel Mobile — 应用入口 / 登录 / 路由 */
(function (w) {
  'use strict';
  const DP = w.DP, $ = DP.$, esc = DP.esc, icon = DP.icon;
  const TABS = ['overview', 'containers', 'images', 'files', 'more'];
  const NAV_GROUPS = [
    ['常用', [['overview', 'home', '概览'], ['containers', 'box', '容器'], ['images', 'layers', '镜像'], ['files', 'folder', '文件管理'], ['compose', 'code', 'Compose']]],
    ['容器与编排', [['swarm', 'cube', 'Swarm 集群'], ['snapshots', 'download', '容器快照'], ['domains', 'globe', '域名与证书'], ['store', 'store', '应用商店']]],
    ['系统', [['envs', 'server', 'Docker 环境'], ['cron', 'clock', '计划任务'], ['registries', 'key', '镜像仓库'], ['tags', 'filter', '标签分组'], ['syslog', 'file', '系统日志'], ['notices', 'bell', '通知中心'], ['settings', 'gear', '设置']]]
  ];
  let current = '';
  /* 内部路由状态：Android WebView 对 file:// 的 hash 导航不可靠（hash 变化可能触发
     整页重载且丢失 hash，表现为“点容器跳回首页”）。导航完全走内部状态，URL 只静默同步 */
  DP._currentRoute = null;
  DP._navStack = [];

  /* ---------------- 路由 ---------------- */
  DP.parseHash = function () {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    if (!raw) return { route: 'overview', params: {} };
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {};
    try { new URLSearchParams(query || '').forEach((v, k) => params[k] = v); } catch (e) { }
    if (parts[0] === 'container' && parts[1]) params.id = decodeURIComponent(parts[1]);
    return { route: parts[0] || 'overview', params };
  };
  /* 把内部路由静默写进 URL（replaceState 不产生历史记录、不触发页面导航） */
  DP._reflectHash = function (route, params) {
    try {
      let hash = '#/' + route;
      if (params && params.id) hash += '/' + encodeURIComponent(params.id);
      const q = {};
      Object.keys(params || {}).forEach(k => { if (k !== 'id' && params[k] != null) q[k] = params[k]; });
      if (Object.keys(q).length) hash += '?' + new URLSearchParams(q);
      if (w.history && w.history.replaceState) w.history.replaceState(null, '', location.pathname + location.search + hash);
    } catch (e) { /* 部分 WebView 不支持，忽略 */ }
  };
  DP.canGoBackInternal = function () { return DP._navStack.length > 0; };
  DP.go = function (route, params, replace) {
    if (route === 'login') {
      DP.logout();
      DP._currentRoute = { route: 'login', params: {} };
      DP._navStack = [];
      DP._reflectHash('login');
      routeChange();
      return;
    }
    const cur = DP._currentRoute;
    if (cur && cur.route !== route) {
      DP._navStack.push(cur);
      if (DP._navStack.length > 40) DP._navStack.shift();
    }
    DP._currentRoute = { route, params: Object.assign({}, params || {}) };
    DP._reflectHash(route, params);
    routeChange();
  };
  DP.back = function () {
    const prev = DP._navStack.pop();
    if (prev) {
      DP._currentRoute = prev;
      DP._reflectHash(prev.route, prev.params);
      routeChange();
    } else DP.go('overview');
  };

  async function routeChange() {
    const { route, params } = DP._currentRoute || DP.parseHash();
    DP._currentRoute = { route, params: Object.assign({}, params) };
    document.body.classList.toggle('is-login', route === 'login' || !DP.state.token);
    const loginView = $('#login-view'), mainView = $('#main-view');
    let content = $('#content');
    const clean = content.querySelector('#detail-body'); if (clean && clean._cleanup) clean._cleanup();
    if (route === 'login') {
      mainView.classList.add('hidden'); loginView.classList.remove('hidden');
      current = route; DP.renderServers(); return;
    }
    if (!DP.state.token) {
      mainView.classList.add('hidden'); loginView.classList.remove('hidden');
      current = 'login'; return;
    }
    loginView.classList.add('hidden'); mainView.classList.remove('hidden');

    const page = DP.pages[route] || DP.pages.more;
    /* 页面切换前清空 #content 上的旧委托监听器，避免跨页面误触发 */
    DP.offAll(content);
    /* 关键防竞态：把 #content 换成全新空节点。旧页面的异步渲染持有旧节点引用，
       其迟到的 innerHTML 写入落在游离节点上，不会覆盖新页面
       （否则概览页慢接口返回后会把已打开的容器详情覆盖回概览 → 表现为“点击容器跳回首页”） */
    const fresh = content.cloneNode(false);
    fresh.innerHTML = '';
    fresh.className = 'content route-' + route;
    content.parentNode.replaceChild(fresh, content);
    content = fresh;
    DP.$$('#sidebar-links [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === route));
    $('#page-title').textContent = (DP.pages[route] && DP.pages[route].title) || (route === 'container' ? '容器详情' : '更多功能');
    const isTab = TABS.includes(route);
    const menuBtn = $('#menu-btn');
    menuBtn.innerHTML = icon(isTab && !params.id ? 'menu' : 'chevron-left');
    menuBtn.onclick = () => { if (isTab && !params.id) openDrawer(); else DP.back(); };
    DP.$$('#bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === route));

    current = route;
    content.scrollTop = 0;
    try {
      await page.render(content, params);
    } catch (e) {
      console.error(e);
      content.innerHTML = `<div class="empty">${icon('alert')}<b>页面加载失败</b><span class="small">${esc(e.message || '')}</span><button class="btn primary sm mt12" onclick="DP.refresh()">重新加载</button></div>`;
    }
  }
  DP.refresh = function () { routeChange(); };
  /* 兼容兜底：外部改变 hash（历史恢复等）时同步内部路由；DP.go 用 replaceState 不触发此事件 */
  w.addEventListener('hashchange', () => {
    const p = DP.parseHash();
    const cur = DP._currentRoute;
    if (!cur || cur.route !== p.route || (cur.params.id || '') !== (p.params.id || '')) {
      DP._currentRoute = p;
      routeChange();
    }
  });

  /* ---------------- 抽屉 ---------------- */
  function navHtml(active) {
    return NAV_GROUPS.map(([title, items]) => `<div class="drawer-group">${title}</div>${items.map(([go, ic, t]) => `<button class="drawer-link ${active === go ? 'active' : ''}" data-go="${go}">${icon(ic)}<span class="grow">${t}</span></button>`).join('')}`).join('');
  }
  function buildDrawer() {
    $('#drawer-links').innerHTML = navHtml(current);
    const sb = $('#sidebar-links');
    if (sb) {
      sb.innerHTML = navHtml(current);
      DP.$$('#sidebar-links [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === current));
      DP.on(sb, 'click', '[data-go]', (e, t) => DP.go(t.dataset.go));
    }
    DP.on($('#drawer-links'), 'click', '[data-go]', (e, t) => { closeDrawer(); DP.go(t.dataset.go); });
    const user = DP.state.user || 'admin', server = DP.state.demo ? '演示模式' : (DP.state.baseUrl || '未连接');
    $('#user-name').textContent = user;
    $('#server-label').textContent = server;
    $('#user-avatar').textContent = user[0].toUpperCase();
    const su = $('#sidebar-user'); if (su) su.textContent = user;
    const ss = $('#sidebar-server'); if (ss) ss.textContent = server;
    const sa = $('#sidebar-avatar'); if (sa) sa.textContent = user[0].toUpperCase();
  }
  function openDrawer() { buildDrawer(); $('#drawer').classList.remove('hidden'); $('#drawer-scrim').classList.remove('hidden'); }
  function closeDrawer() { $('#drawer').classList.add('hidden'); $('#drawer-scrim').classList.add('hidden'); }
  $('#drawer-close').onclick = closeDrawer;
  $('#drawer-scrim').onclick = closeDrawer;
  $('#logout-btn').onclick = () => { closeDrawer(); DP.go('login'); };
  const sidebarLogout = $('#sidebar-logout'); if (sidebarLogout) sidebarLogout.onclick = () => DP.go('login');
  $('#notice-btn').onclick = () => DP.go('notices');
  $('#theme-btn').onclick = () => DP.setTheme(DP.state.theme === 'dark' ? 'light' : 'dark');

  /* ---------------- 环境切换 ---------------- */
  $('#env-picker').onclick = async () => {
    let envs = DP.state.envs;
    if (!envs.length && !DP.state.demo) {
      try { const d = await DP.api('/common/env/get-list', { enableCertContent: false }); envs = DP.state.envs = d.list || []; } catch (e) { DP.fail(e); }
    }
    if (!envs.length && DP.state.demo) envs = DP.demoData.envs;
    DP.sheet({ title: '切换 Docker 环境', sub: '当前 ' + (DP.state.env || 'local'),
      body: `<div class="card tight">${envs.map(e => `<button class="drawer-link" data-env="${esc(e.name)}">${icon('server')}<span class="grow"><b>${esc(e.name)}</b><br><small class="muted">${esc(e.address || '')}</small></span>${DP.state.env === e.name || e.default ? icon('check', 'sm') : ''}</button>`).join('')}</div>
        <button class="btn outline block mt12" data-act="manage">${icon('gear', 'sm')}管理环境</button>` });
    DP.on($('#sheet-root'), 'click', '[data-env]', async (e, t) => {
      const name = t.dataset.env; DP.closeSheet();
      if (name === DP.state.env) return;
      if (!DP.state.demo) { try { await DP.api('/common/env/switch', { name }); } catch (err) { DP.fail(err); return; } }
      DP.state.env = name; $('#env-name').textContent = name;
      // 切换环境后容器/镜像/统计都属于新环境，清掉旧缓存并强制重渲染当前页
      DP.state.envs = [];
      if (DP.state.demo) { DP.go('overview'); return; }
      DP.toast('已切换到 ' + name, 'ok');
      DP.refresh();
    });
    $('[data-act="manage"]', $('#sheet-root')).onclick = () => { DP.closeSheet(); DP.go('envs'); };
  };

  /* ---------------- 登录 ---------------- */
  let loginMode = 'server';
  DP.renderServers = function () {
    const s = DP.state.servers || [];
    const root = $('#saved-servers');
    if (!root) return;
    root.innerHTML = s.length ? `<div class="saved-title">最近连接</div>${s.slice(0, 4).map(x => `<button class="saved-item" data-url="${esc(x.baseUrl)}" data-user="${esc(x.user || 'admin')}">${icon('server', 'sm')}<span class="grow">${esc(x.baseUrl.replace(/^https?:\/\//, ''))}</span><span class="small muted">${esc(x.user || 'admin')}</span></button>`).join('')}` : '';
    DP.on(root, 'click', '.saved-item', (e, t) => {
      $('#login-url').value = t.dataset.url; $('#login-user').value = t.dataset.user; $('#login-pass').focus();
    });
  };
  DP.on($('#login-mode'), 'click', '.seg-item', (e, t) => {
    loginMode = t.dataset.mode;
    DP.$$('#login-mode .seg-item').forEach(b => b.classList.toggle('active', b === t));
    $('#server-form').classList.toggle('hidden', loginMode !== 'server');
    $('#demo-form').classList.toggle('hidden', loginMode !== 'demo');
  });
  $('#help-btn').onclick = () => DP.sheet({ title: '连接说明', full: true,
    body: `<div class="card"><div class="card-head"><h3>面板地址怎么填？</h3></div>
      <div class="small" style="line-height:1.9">
        · 本机部署通常是 <span class="mono">http://服务器IP:8807</span><br>
        · DPanel 标准版默认监听 8080 端口，映射到宿主机后的端口为准<br>
        · 若启用了 HTTPS，请填写 <span class="mono">https://域名</span><br>
        · 若启用了「安全入口」，需在网页端先访问一次入口地址<br>
        · 手机与服务器需网络互通（同一局域网或可公网访问）<br>
        · 默认账号密码通常为 <span class="mono">admin / admin</span>，首次登录后请修改
      </div></div>
      <div class="card"><div class="card-head"><h3>为什么登录失败？</h3></div><div class="small muted" style="line-height:1.8">请确认面板可访问、账号密码正确。如开启了两步验证，登录失败后会出现验证码输入框。服务重启后原有登录会失效，需要重新登录。</div></div>` });

  $('#demo-submit').onclick = () => {
    const s = DP.state;
    s.demo = true; s.token = 'demo-token'; s.user = 'admin'; s.env = 'local'; s.envs = DP.demoData.envs;
    localStorage.setItem('dpanel-theme', s.theme);
    DP.go('overview');
  };

  async function doLogin() {
    const base = $('#login-url').value.trim().replace(/\/+$/, '');
    const username = $('#login-user').value.trim(), password = $('#login-pass').value;
    const code = $('#login-code').value.trim(), auto = $('#login-auto').checked;
    if (!/^https?:\/\//.test(base)) return DP.toast('请输入完整的 http:// 或 https:// 地址', 'err');
    if (!username || !password) return DP.toast('请输入用户名和密码', 'err');
    const btn = $('#login-submit'); btn.disabled = true; btn.textContent = '连接中…';
    try {
      /* 全新面板首次使用：showRegister=true 表示尚未创建创始人账号，用当前输入的账密自动初始化（与官方首次安装流程一致） */
      const info = await fetch(base + '/dpanel/api/common/user/login-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      }).then(r => r.json()).catch(() => null);
      if (info && info.code === 200 && info.data && info.data.showRegister) {
        const cf = await fetch(base + '/dpanel/api/common/user/create-founder', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, confirmPassword: password })
        }).then(r => r.json());
        if (cf.code !== 200) throw new Error(cf.error || '初始化创始人账号失败');
        DP.toast('已初始化创始人账号 ' + username, 'ok');
      }
      const res = await fetch(base + '/dpanel/api/common/user/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, autoLogin: auto, code })
      });
      const json = await res.json();
      if (json.code !== 200 || !json.data || !json.data.accessToken) {
        const msg = json.error || '登录失败';
        if (/验证码|两步|2FA|code/i.test(msg)) { $('#code-field').classList.remove('hidden'); $('#login-code').focus(); }
        throw new Error(msg);
      }
      const s = DP.state;
      s.demo = false; s.baseUrl = base; s.token = json.data.accessToken; s.user = username; s.auto = auto;
      s.servers = s.servers || [];
      s.servers = [ { baseUrl: base, user: username }, ...s.servers.filter(x => x.baseUrl !== base) ].slice(0, 6);
      DP.save();
      try {
        const info = await DP.api('/common/user/get-user-info', {});
        s.user = (info && info.user && (info.user.username || info.user.name)) || username;
        s.feature = info.feature || [];
      } catch (e) { /* 可以忽略，稍后重试 */ }
      try {
        const envs = await DP.api('/common/env/get-list', { enableCertContent: false });
        s.envs = envs.list || [];
        const cur = s.envs.find(x => x.default);
        if (cur) s.env = cur.name;
      } catch (e) { /* ignore */ }
      DP.connectWs();
      DP.toast('登录成功', 'ok');
      DP.go('overview');
    } catch (e) {
      DP.toast(e.message || '无法连接服务器', 'err');
    } finally {
      btn.disabled = false; btn.textContent = '登录面板';
    }
  }
  $('#login-submit').onclick = doLogin;
  ['login-url', 'login-user', 'login-pass', 'login-code'].forEach(id => {
    $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  /* ---------------- 底部导航 ---------------- */
  DP.on($('#bottom-nav'), 'click', 'button', (e, t) => {
    const tab = t.dataset.tab;
    if (current === tab) { $('#content').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (tab === 'files') { DP.ui.fileMount = DP.ui.fileMount || 'local:host'; DP.ui.filePath = DP.ui.filePath || '/'; }
    DP.go(tab);
  });

  /* ---------------- 启动 ---------------- */
  DP.restore();
  DP.setTheme(DP.state.theme);
  DP.renderServers();
  buildDrawer();
  /* 内嵌前端（同源部署）时，默认连接本面板，无需手填地址 */
  if (location.protocol.startsWith('http') && !$('#login-url').value) $('#login-url').value = location.origin;
  if (DP.state.demo) {
    // 演示模式不跨会话保留，避免误连
    DP.state.demo = false; DP.state.token = '';
  }
  /* 恢复会话后必须重建 notice WS：fd 管道接口（容器日志/磁盘占用）依赖 AuthorizationFd 头，
     此前只在登录时连接，覆盖安装等场景会话恢复后 WS 缺失 → fd not found */
  if (DP.state.token && !DP.state.demo) DP.connectWs();
  if (matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('dpanel-theme')) DP.setTheme('dark');
  if (new URLSearchParams(location.search).get('demo') === '1' && !DP.state.token) {
    DP.state.demo = true; DP.state.token = 'demo-token'; DP.state.user = 'admin';
    DP.state.env = 'local'; DP.state.envs = DP.demoData.envs;
  }
  routeChange();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.pathname.startsWith('/dpanel')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})(window);
