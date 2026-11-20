/* DPanel Mobile — 基础页面：概览 / 容器 / 镜像 / 网络 / 存储卷 / Compose */
(function (w) {
  'use strict';
  const DP = w.DP, $ = DP.$, esc = DP.esc, icon = DP.icon;
  const pages = DP.pages = DP.pages || {};
  DP.ui = {
    containerQuery: '', containerFilter: 'all', imageQuery: '', networkQuery: '',
    volumeQuery: '', composeQuery: '', containerTab: 'info', fileMount: 'local:host', filePath: '/',
    storeQuery: '', logQuery: '', envQuery: ''
  };

  DP.skeleton = function (n) {
    return Array.from({ length: n || 3 }, () => `<div class="item-card"><div class="row"><div class="skeleton" style="width:38px;height:38px;border-radius:12px"></div><div class="grow"><div class="skeleton" style="height:13px;width:55%;margin-bottom:8px"></div><div class="skeleton" style="height:10px;width:75%"></div></div></div></div>`).join('');
  };
  DP.searchbar = function (id, placeholder, value) {
    return `<div class="searchbar">${icon('search')}<input id="${id}" placeholder="${esc(placeholder || '搜索')}" value="${esc(value || '')}"><button data-clear="${id}">${icon('x', 'sm')}</button></div>`;
  };
  DP.bindSearch = function (root, id, key, rerender) {
    const input = $('#' + id, root);
    if (!input) return;
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { DP.ui[key] = input.value.trim(); rerender(); }, 220); });
    const clear = root.querySelector(`[data-clear="${id}"]`);
    if (clear) clear.onclick = () => { input.value = ''; DP.ui[key] = ''; rerender(); };
  };
  DP.tabs = function (items, active, key) {
    return `<div class="tabs">${items.map(([id, label]) => `<button class="tab ${active === id ? 'active' : ''}" data-tabkey="${key}" data-tabval="${id}">${label}</button>`).join('')}</div>`;
  };
  DP.bindTabs = function (root, rerender) {
    DP.on(root, 'click', '[data-tabkey]', (e, t) => {
      DP.ui[t.dataset.tabkey] = t.dataset.tabval;
      rerender();
    });
  };
  DP.empty = function (text, iconName) {
    return `<div class="empty">${icon(iconName || 'box')}<b>${esc(text || '暂无数据')}</b><span class="small">下拉刷新或点击右上角重新加载</span></div>`;
  };
  DP.pageHead = function (title, sub, actions) {
    return `<div class="page-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="row">${actions || ''}</div></div>`;
  };
  DP.iconBtn = function (act, name, label) {
    return `<button class="icon-btn" data-act="${act}" aria-label="${label || ''}" title="${label || ''}">${icon(name)}</button>`;
  };

  async function safe(fn) {
    DP.loading(true);
    try { return await fn(); } catch (e) { DP.fail(e); return null; } finally { DP.loading(false); }
  }
  DP.safe = safe;

  /* ==================== 概览 ==================== */
  pages.overview = {
    title: '概览',
    async render(root) {
      root.innerHTML = DP.skeleton(3);
      const [info, usage, stat, containers, notices, networks, volumes] = await Promise.all([
        DP.api('/common/home/info').catch(() => null),
        DP.api('/common/home/usage', {}).catch(() => null),
        DP.api('/common/home/get-stat-list', {}).catch(() => null),
        DP.api('/app/container/get-list', {}).catch(() => ({ list: [] })),
        DP.api('/common/notice/get-list', { page: 1, pageSize: 4 }).catch(() => ({ list: [] })),
        DP.api('/app/network/get-list', {}).catch(() => ({ list: [] })),
        DP.api('/app/volume/get-list', {}).catch(() => ({ list: [] }))
      ]);
      if (!document.body.contains(root)) return;
      const i = (info && info.info) || {};
      const d = (info && info.dpanel) || {};
      const list = (containers && containers.list) || [];
      const running = list.filter(c => c.State === 'running').length;
      const unread = ((notices && notices.list) || []).filter(n => !n.read).length;
      DP.state.noticeUnread = unread;
      const badge = $('#notice-badge'); if (badge) badge.classList.toggle('hidden', !unread);
      const envName = (info && info.dockerEnv && info.dockerEnv.name) || DP.state.env || 'local';
      DP.state.env = envName;
      const en = $('#env-name'); if (en) en.textContent = envName;
      const ds = (stat && stat.docker) || [];
      /* 真实结构: {cpu:%, memory:{in:用量,out:上限}} */
      let cpu = ds.length ? ds.map(x => x.cpu || 0) : [12, 18, 15, 24, 19, 28, 22, 17];
      let mem = ds.length ? ds.map(x => DP.pct(x.memory && x.memory.in, x.memory && x.memory.out)) : [52, 55, 58, 56, 61, 59, 62, 60];
      if (DP.state.demo) { cpu = DP.demoData.stat.cpu; mem = DP.demoData.stat.mem; }
      DP.statCpu = cpu; DP.statMem = mem;
      const memTotalGB = Math.round((i.MemTotal || 0) / 1024 / 1024 / 1024);
      const du = (usage && usage.diskUsage) || {};
      const used = (du.system && du.system.used) || 0;
      const total = (du.system && du.system.total) || 0;
      const diskPct = DP.pct(used, total);
      const up = list.filter(c => c.State === 'running').slice(0, 3);

      root.innerHTML = `
        <div class="hero">
          <div class="label">DOCKER 主机 · ${esc(d.version || '已连接')}</div>
          <h2>${esc((i.Name || 'Docker Host').split(' - ')[0])}</h2>
          <p>${esc(i.ServerVersion ? 'Docker ' + i.ServerVersion + ' · ' + (i.OperatingSystem || '') : '正在获取主机信息…')}</p>
          <div class="hero-stats">
            <div><b>${running}<small style="font-size:11px">/${list.length}</small></b><span>运行中容器</span></div>
            <div><b>${i.Images || (info && info.images) || 10}</b><span>镜像</span></div>
            <div><b>${i.NCPU || 8} 核</b><span>CPU</span></div>
            <div><b>${memTotalGB || 16} GB</b><span>内存</span></div>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-tile" data-go="containers"><b>${list.length}</b><span class="muted">容器</span></div>
          <div class="stat-tile" data-go="images"><b>${(info && info.images) || 10}</b><span class="muted">镜像</span></div>
          <div class="stat-tile" data-go="networks"><b>${(networks && networks.list || []).length}</b><span class="muted">网络</span></div>
          <div class="stat-tile" data-go="volumes"><b>${(volumes && volumes.list || []).length}</b><span class="muted">存储卷</span></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>资源监控</h3><span class="sub">实时采样</span></div>
          <div class="metric"><div class="metric-head"><b>${icon('cpu', 'sm')} CPU 使用率</b><span>${(cpu.at(-1) || 0).toFixed(1)}%</span></div>${DP.sparkline(cpu, 'var(--primary)')}</div>
          <div class="metric"><div class="metric-head"><b>${icon('memory', 'sm')} 内存使用率</b><span>${(mem.at(-1) || 0).toFixed(0)}%</span></div>${DP.sparkline(mem, 'var(--purple)')}</div>
          <div class="row" style="margin-top:10px">
            <div>${DP.donut(diskPct, diskPct > 80 ? 'var(--red)' : 'var(--teal)', 70)}</div>
            <div class="grow"><div class="mid bold">磁盘空间</div><div class="small muted mt8">已用 ${DP.fmtBytes(used)} / 共 ${DP.fmtBytes(total)}</div><div class="small muted">可用 ${DP.fmtBytes(Math.max(0, total - used))}</div></div>
          </div>
        </div>
        <div class="page-head" style="margin-bottom:10px"><h2 style="font-size:16px">快捷入口</h2></div>
        <div class="quick-grid">
          ${[['containers', 'box', '容器', 'var(--primary)'], ['images', 'layers', '镜像', 'var(--blue)'], ['compose', 'code', 'Compose', 'var(--purple)'], ['files', 'folder', '文件', 'var(--amber)'], ['networks', 'network', '网络', 'var(--teal)'], ['volumes', 'database', '存储卷', 'var(--green)'], ['cron', 'clock', '计划任务', 'var(--red)'], ['settings', 'gear', '设置', 'var(--ink-2)']].map(([go, ic, label, color]) => `<button class="quick-item" data-go="${go}"><span class="qi" style="background:color-mix(in srgb,${color} 14%,transparent);color:${color}">${icon(ic)}</span><span>${label}</span></button>`).join('')}
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-head"><h3>运行中的容器</h3><button class="link-btn" data-go="containers">全部 ${icon('chevron-right', 'xs')}</button></div>
          ${up.length ? up.map(c => {
            const st = DP.statusOf(c);
            return `<div class="list-item" data-container="${esc(DP.cid(c))}"><div class="avatar-sm green">${icon('box')}</div><div class="grow"><div class="mid bold ellipsis">${esc(DP.name(c))}</div><div class="small muted ellipsis">${esc(c.Image)}</div></div><span class="chip green"><i class="status-dot"></i>${st.label}</span></div>`;
          }).join('') : DP.empty('暂无运行中的容器', 'box')}
        </div>
        ${(d.updateAvailable || d.latestVersion) ? `<div class="card" style="border-color:var(--primary)"><div class="row"><div class="avatar-sm">${icon('sparkles')}</div><div class="grow"><div class="mid bold">发现新版本 ${esc(d.latestVersion || '')}</div><div class="small muted">当前 ${esc(d.version || '')} · 建议及时更新</div></div><button class="btn primary sm" data-act="update-panel">更新</button></div></div>` : ''}
      `;
      this.bind(root);
      /* 磁盘占用由服务端后台协程计算（需 fd 管道），首次常为空 → 延迟重试 */
      if (!total && !DP.state.demo) {
        DP._usageRetry = (DP._usageRetry || 0) + 1;
        if (DP._usageRetry <= 4) {
          const mark = DP._currentRoute;
          setTimeout(async () => {
            if (!DP.stillHere(mark) || !document.body.contains(root)) return;
            const u2 = await DP.api('/common/home/usage', {}).catch(() => null);
            if (!DP.stillHere(mark)) return;
            const du2 = (u2 && u2.diskUsage) || {};
            if (du2.system && du2.system.total && document.body.contains(root)) { DP._usageRetry = 0; pages.overview.render(root); }
          }, 3000);
        }
      }
    },
    bind(root) {
      DP.on(root, 'click', '[data-go]', (e, t) => DP.go(t.dataset.go));
      DP.on(root, 'click', '[data-container]', (e, t) => DP.go('container', { id: t.dataset.container }));
      const upd = root.querySelector('[data-act="update-panel"]');
      if (upd) upd.onclick = () => DP.confirm({
        title: '更新面板', text: '更新过程中面板会短暂不可用，确定继续？', okText: '立即更新',
        onOk: async () => { await safe(() => DP.api('/common/panel/update', {})); DP.toast('已开始更新，请留意通知', 'ok'); }
      });
    }
  };

  /* ==================== 容器 ==================== */
  pages.containers = {
    title: '容器',
    async render(root) {
      root.innerHTML = DP.searchbar('container-search', '搜索容器名称或镜像…', DP.ui.containerQuery) +
        DP.tabs([['all', '全部'], ['running', '运行中'], ['stopped', '已停止'], ['paused', '已暂停']], DP.ui.containerFilter, 'containerFilter') + DP.skeleton(4);
      const data = await DP.api('/app/container/get-list', {}).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const q = DP.ui.containerQuery.toLowerCase();
      let list = (data.list || []).filter(c => {
        const hit = !q || DP.name(c).toLowerCase().includes(q) || (c.Image || '').toLowerCase().includes(q) || DP.cid(c).toLowerCase().includes(q);
        const f = DP.ui.containerFilter;
        return hit && (f === 'all' || (f === 'running' && c.State === 'running') || (f === 'stopped' && c.State !== 'running' && c.State !== 'paused') || (f === 'paused' && c.State === 'paused'));
      });
      list.sort((a, b) => (a.State === 'running' ? 0 : 1) - (b.State === 'running' ? 0 : 1) || DP.name(a).localeCompare(DP.name(b)));
      root.innerHTML = DP.searchbar('container-search', '搜索容器名称或镜像…', DP.ui.containerQuery) +
        DP.tabs([['all', '全部'], ['running', '运行中'], ['stopped', '已停止'], ['paused', '已暂停']], DP.ui.containerFilter, 'containerFilter') +
        `<div class="row between" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个容器 · ${data.list ? data.list.filter(c => c.State === 'running').length : 0} 个运行中</span><div class="row">${DP.iconBtn('refresh', 'refresh', '刷新')}${DP.iconBtn('new-container', 'plus', '新建容器')}</div></div>` +
        (list.length ? list.map(c => {
          const st = DP.statusOf(c);
          const ports = (c.Ports || []).filter(p => p.PublicPort).slice(0, 2).map(p => p.PublicPort + ':' + p.PrivatePort).join(' · ');
          return `<div class="item-card" data-id="${esc(DP.cid(c))}">
            <div class="row"><div class="avatar-sm ${st.cls}">${icon('box')}</div>
              <div class="grow"><div class="title">${esc(DP.name(c))}</div><div class="sub mono">${esc(c.Image)}</div></div>
              <span class="chip ${st.cls}"><i class="status-dot"></i>${st.label}</span></div>
            <div class="chips">${ports ? `<span class="chip blue">${esc(ports)}</span>` : ''}<span class="chip">${DP.short(DP.cid(c), 12)}</span>${(c.Labels && c.Labels['dpanel.self']) ? '<span class="chip purple">面板自身</span>' : ''}</div>
            <div class="action-row" data-id="${esc(DP.cid(c))}">
              <button class="action-btn" data-op="${c.State === 'running' ? 'stop' : 'start'}">${icon(c.State === 'running' ? 'stop' : 'play')}${c.State === 'running' ? '停止' : '启动'}</button>
              <button class="action-btn" data-op="restart">${icon('restart')}重启</button>
              <button class="action-btn" data-act="logs">${icon('terminal')}日志</button>
              <button class="action-btn danger" data-act="delete">${icon('trash')}删除</button>
            </div>
          </div>`;
        }).join('') : DP.empty('没有找到容器', 'box'));
      this.bind(root);
    },
    bind(root) {
      DP.bindSearch(root, 'container-search', 'containerQuery', () => pages.containers.render(root));
      DP.bindTabs(root, () => pages.containers.render(root));
      const refresh = root.querySelector('[data-act="refresh"]'); if (refresh) refresh.onclick = () => pages.containers.render(root);
      const create = root.querySelector('[data-act="new-container"]'); if (create) create.onclick = () => pages.containerCreate();
      DP.on(root, 'click', '.item-card', (e, t) => {
        if (e.target.closest('[data-op],[data-act]')) return;
        DP.go('container', { id: t.dataset.id });
      });
      DP.on(root, 'click', '[data-op]', async (e, t) => {
        e.stopPropagation();
        const id = t.closest('.action-row').dataset.id, op = t.dataset.op, mark = DP._currentRoute;
        await safe(() => DP.api('/app/container/status', { md5: id, operate: op }));
        DP.toast(({ start: '已启动', stop: '已停止', restart: '已重启', pause: '已暂停', unpause: '已恢复' })[op] || '操作成功', 'ok');
        setTimeout(() => { if (DP.stillHere(mark)) pages.containers.render(root); }, 500);
      });
      DP.on(root, 'click', '[data-act="logs"]', (e, t) => { e.stopPropagation(); DP.go('container', { id: t.closest('.action-row').dataset.id, tab: 'logs' }); });
      DP.on(root, 'click', '[data-act="delete"]', (e, t) => {
        e.stopPropagation(); const id = t.closest('.action-row').dataset.id;
        DP.confirm({ title: '删除容器', text: '容器将被移除，此操作不可撤销。', detail: '建议先确认容器内无重要数据，或提前创建快照。', danger: true, okText: '确认删除',
          onOk: async () => { await safe(() => DP.api('/app/container/delete', { md5: id, deleteImage: false, deleteVolume: false, deleteLink: false })); DP.toast('容器已删除', 'ok'); pages.containers.render(root); } });
      });
    }
  };

  pages.containerCreate = function () {
    DP.sheet({
      title: '创建容器', sub: '基础配置（镜像与端口）',
      body: `<div class="form-field"><label>容器名称</label><input id="cc-name" placeholder="my-app"></div>
        <div class="form-field"><label>镜像</label><input id="cc-image" placeholder="nginx:alpine"></div>
        <div class="form-field"><label>端口映射（宿主机:容器，逗号分隔）</label><input id="cc-ports" placeholder="8080:80, 8443:443"></div>
        <div class="switch-row"><span class="mid">后台自动启动</span><div class="switch on" id="cc-start"></div></div>
        <p class="small muted mt12">完整创建（环境变量、挂载、网络等）请前往 DPanel 网页端使用「创建容器」向导。</p>`,
      actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="create">创建</button>`
    });
    $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
    $('#cc-start').onclick = e => DP.toggle(e.currentTarget, !e.currentTarget.classList.contains('on'));
    $('[data-act="create"]', $('#sheet-root')).onclick = async () => {
      const name = $('#cc-name').value.trim(), image = $('#cc-image').value.trim();
      if (!name || !image) return DP.toast('请填写容器名称与镜像', 'err');
      DP.closeSheet();
      await safe(async () => {
        await DP.api('/app/site/create-by-command', { siteTitle: name, siteName: name, command: 'docker run -d --name ' + name + ' ' + image, enableOptimize: false });
        DP.toast('已提交创建任务', 'ok');
      });
    };
  };

  /* ==================== 容器详情 ==================== */
  pages.container = {
    title: '容器详情',
    async render(root, params) {
      const id = params.id;
      const tab = params.tab || DP.ui.containerTab || 'info';
      DP.ui.containerTab = tab;
      root.innerHTML = DP.skeleton(2);
      const d = await DP.api('/app/container/get-detail', { md5: id }).catch(e => { DP.fail(e); return null; });
      if (!document.body.contains(root)) return;
      if (!d || !d.info) return root.innerHTML = DP.empty('容器不存在或已被删除', 'box');
      const c = d.info, st = DP.statusOf(c);
      const info = c.Config || {};
      root.innerHTML = `
        <div class="card">
          <div class="row"><div class="avatar-sm ${st.cls}" style="width:48px;height:48px">${icon('box', 'lg')}</div><div class="grow"><div class="title bold" style="font-size:16px">${esc(DP.name(c))}</div><div class="sub mono">${esc(info.Image || c.Image)}</div></div><span class="chip ${st.cls}"><i class="status-dot"></i>${st.label}</span></div>
          <div class="chips mt12">${(c.Ports || []).slice(0, 4).map(p => `<span class="chip blue">${p.PublicPort ? p.IP + ':' + p.PublicPort + '→' : ''}${p.PrivatePort}/${p.Type}</span>`).join('')}</div>
          <div class="action-row">
            <button class="action-btn" data-op="${st.label === '运行中' ? 'stop' : 'start'}">${icon(st.label === '运行中' ? 'stop' : 'play')}${st.label === '运行中' ? '停止' : '启动'}</button>
            <button class="action-btn" data-op="restart">${icon('restart')}重启</button>
            <button class="action-btn" data-op="${c.State === 'paused' ? 'unpause' : 'pause'}">${icon('pause', 'sm')}${c.State === 'paused' ? '恢复' : '暂停'}</button>
            <button class="action-btn" data-act="more">${icon('more')}更多</button>
          </div>
        </div>
        ${DP.tabs([['info', '信息'], ['stats', '监控'], ['logs', '日志'], ['terminal', '终端'], ['process', '进程']], tab, 'containerTab')}
        <div id="detail-body"></div>`;
      const body = $('#detail-body', root);
      if (tab === 'info') this.renderInfo(body, c, info, id);
      if (tab === 'stats') this.renderStats(body, id);
      if (tab === 'logs') this.renderLogs(body, id);
      if (tab === 'terminal') this.renderTerminal(body, id);
      if (tab === 'process') this.renderProcess(body, id);
      this.bind(root, id);
    },
    renderInfo(body, c, info, id) {
      const rows = [
        ['容器 ID', c.Id || c.ID || id], ['状态', c.Status || (c.State && c.State.Status)], ['创建时间', DP.fmtTime(c.Created)],
        ['重启策略', (c.HostConfig && c.HostConfig.RestartPolicy && c.HostConfig.RestartPolicy.Name) || '—'],
        ['镜像 ID', (c.ImageID || '').replace('sha256:', '')],
        ['工作目录', info.WorkingDir || '/'], ['启动命令', (info.Cmd || []).join(' ') || '—'],
        ['可写层大小', DP.fmtBytes(c.SizeRw)]
      ];
      const env = info.Env || [];
      body.innerHTML = `<div class="card"><div class="card-head"><h3>基础信息</h3></div>${rows.map(([k, v]) => `<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><span class="small muted">${k}</span><span class="small mono ellipsis" style="max-width:62%;text-align:right">${esc(v)}</span></div>`).join('')}</div>
        ${(c.Mounts || []).length ? `<div class="card"><div class="card-head"><h3>挂载卷</h3></div>${c.Mounts.map(m => `<div class="list-item"><div class="avatar-sm blue">${icon('database')}</div><div class="grow"><div class="mid bold ellipsis">${esc(m.Destination)}</div><div class="small muted ellipsis">${esc(m.Source || m.Name || '')}</div></div><span class="chip">${esc(m.Type)}</span></div>`).join('')}</div>` : ''}
        ${env.length ? `<div class="card"><div class="card-head"><h3>环境变量</h3><span class="sub">${env.length} 项</span></div>${env.slice(0, 12).map(e => `<div class="small mono" style="padding:5px 0;word-break:break-all">${esc(e)}</div>`).join('')}</div>` : ''}
        <div class="card"><div class="card-head"><h3>危险操作</h3></div>
          <div class="row wrap">${[['copy', '复制容器', 'copy'], ['commit', '提交为镜像', 'layers'], ['backup', '创建快照', 'download'], ['delete', '删除容器', 'trash']].map(([a, t, ic]) => `<button class="btn outline sm" data-extra="${a}">${icon(ic, 'sm')}${t}</button>`).join('')}</div>
        </div>`;
    },
    async renderStats(body, id) {
      body.innerHTML = DP.skeleton(2);
      /* get-stat-info 是 WS 管道流式接口，HTTP 直调会挂起；改用 get-stat-list 按容器过滤 */
      const s = await DP.api('/common/home/get-stat-list', {}).catch(() => null);
      if (!document.body.contains(body)) return;
      const item = ((s && s.docker) || []).find(x => x.container === id || x.name === '/' + id);
      if (!item) return body.innerHTML = DP.empty('暂时无法获取监控数据（容器可能已停止）', 'chart');
      const memPct = DP.pct(item.memory && item.memory.in, item.memory && item.memory.out);
      const net = item.networkIO || {};
      const blk = item.blockIO || {};
      body.innerHTML = `<div class="grid c2">
          <div class="card center"><div class="muted small">CPU 使用</div><div style="margin:8px 0">${DP.donut(item.cpu || 0, 'var(--primary)', 84)}</div><div class="small muted">${(item.cpu || 0).toFixed(1)}%</div></div>
          <div class="card center"><div class="muted small">内存使用</div><div style="margin:8px 0">${DP.donut(memPct, 'var(--purple)', 84)}</div><div class="small muted">${DP.fmtBytes((item.memory && item.memory.in) || 0)} / ${DP.fmtBytes((item.memory && item.memory.out) || 0)}</div></div>
        </div>
        <div class="card"><div class="card-head"><h3>网络 I/O</h3></div><div class="grid c2"><div><div class="small muted">入站</div><div class="mid bold">${DP.fmtBytes(net.in || 0)}</div></div><div><div class="small muted">出站</div><div class="mid bold">${DP.fmtBytes(net.out || 0)}</div></div></div></div>
        <div class="card"><div class="card-head"><h3>磁盘 I/O</h3></div><div class="grid c2"><div><div class="small muted">读取</div><div class="mid bold">${DP.fmtBytes(blk.in || 0)}</div></div><div><div class="small muted">写入</div><div class="mid bold">${DP.fmtBytes(blk.out || 0)}</div></div></div></div>
        <div class="small muted center" style="padding:4px">数据来自面板实时采样，下拉刷新可更新</div>`;
    },
    renderLogs(body, id) {
      body.innerHTML = `<div class="card tight">
        <div class="log-tools">
          ${[20, 100, 500].map(n => `<button class="btn ${n === 100 ? 'primary' : 'ghost'} sm" data-lines="${n}">${n} 行</button>`).join('')}
          <button class="btn ghost sm" data-act="download-log">${icon('download', 'sm')}下载</button>
          <button class="btn ghost sm" data-act="clear-log">清屏</button>
        </div>
        <div class="terminal" id="log-view">正在连接日志流…</div>
      </div>`;
      const view = $('#log-view', body);
      let lines = 100, off = null;
      /* log/run 是 fd 管道流式接口：HTTP 只负责触发，日志内容由 notice WS 实时推送（container:log:{id}），请求本身会挂起直到管道关闭 */
      const write = s => { view.textContent = (view.textContent + s).slice(-60000); view.scrollTop = view.scrollHeight; };
      const ctrl = new AbortController();
      const load = async () => {
        view.textContent = '正在连接日志流…';
        if (off) { off(); off = null; }
        if (DP.state.demo) {
          view.textContent = '[demo] 模拟容器日志输出\n' + DP.demoData.logLines.join('\n');
          return;
        }
        off = DP.onWs('container:log:' + id, data => {
          if (view.textContent.startsWith('正在连接日志流')) view.textContent = '';
          write(typeof data === 'string' ? data : (data && data.data) || JSON.stringify(data));
        });
        /* log/run 依赖 fd 管道，先等 notice WS 的 event:fd（最多 5s），避免 fd not found */
        DP.waitFd(5000).then(() => DP.api('/app/log/run', { id, lineTotal: lines, download: false, showTime: false }, { signal: ctrl.signal })).catch(e => {
          if (e.name === 'AbortError') return;
          write('\n[日志请求失败] ' + e.message);
        });
      };
      body._cleanup = () => { ctrl.abort(); if (off) off(); };
      load();
      DP.on(body, 'click', '[data-lines]', (e, t) => {
        lines = +t.dataset.lines;
        DP.$$('[data-lines]', body).forEach(b => b.classList.toggle('primary', b === t));
        load();
      });
      const dl = $('[data-act="download-log"]', body);
      if (dl) dl.onclick = () => {
        const url = DP.state.baseUrl.replace(/\/$/, '') + '/dpanel/api/common/attach/download?' + new URLSearchParams({ id, contentType: 'text/plain' });
        if (DP.state.demo) DP.download(URL.createObjectURL(new Blob(['演示日志\n' + view.textContent], { type: 'text/plain' })), id + '.log');
        else { fetch(url, { headers: { Authorization: 'Bearer ' + DP.state.token } }).then(r => r.blob()).then(b => DP.download(URL.createObjectURL(b), id + '.log')).catch(DP.fail); }
      };
      const clr = $('[data-act="clear-log"]', body); if (clr) clr.onclick = () => view.textContent = '';
    },
    renderTerminal(body, id) {
      body.innerHTML = `<div class="card tight">
        <div class="log-tools"><span class="small muted">容器终端 · /bin/sh</span><button class="btn ghost sm" data-act="term-clear">清屏</button><button class="btn ghost sm" data-act="term-close">断开</button></div>
        <div class="terminal" id="term-view" style="height:280px">正在连接终端…</div>
        <div class="term-input"><span>$</span><input id="term-input" autocomplete="off" spellcheck="false" placeholder="输入命令并回车"></div>
      </div>`;
      const view = $('#term-view', body), input = $('#term-input', body);
      const write = s => { view.textContent += s; view.scrollTop = view.scrollHeight; };
      /* 后端契约：容器终端是独立 WS 端点 /dpanel/ws/common/console/container/:id
         （不是主 notice WS 的 topic）。上行直接发命令 JSON，下行为 {type,data} 信封 */
      const msgType = '/console/container/' + id;
      const termSend = cmd => {
        if (termWs && termWs.readyState === 1) termWs.send(JSON.stringify({ type: msgType, size: { width: 80, height: 24 }, content: { command: cmd } }));
      };
      let termWs = null;
      if (DP.state.demo) {
        view.textContent = '演示模式终端（模拟输出）\n\n/ # ';
        write('\n提示：连接真实面板后可执行容器内的 shell 命令。\n/ # ');
      } else {
        const s = DP.state;
        const scheme = s.baseUrl.startsWith('https') ? 'wss' : 'ws';
        const host = s.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const prefix = s.baseUrl.replace(/\/+$/, '').replace(/^https?:\/\/[^/]+/, '');
        const url = scheme + '://' + host + prefix + '/dpanel/ws/common/console/container/' + encodeURIComponent(id) + '?token=' + encodeURIComponent(s.token || '');
        try { termWs = new WebSocket(url); } catch (e) { view.textContent = '终端连接失败：' + e.message; }
        if (termWs) {
          termWs.onopen = () => termSend('');
          termWs.onmessage = ev => {
            let m; try { m = JSON.parse(ev.data); } catch (e) { write(ev.data); return; }
            if (m.type === msgType) {
              if (view.textContent.startsWith('正在连接终端…')) view.textContent = '';
              write(typeof m.data === 'string' ? m.data : String(m.data == null ? '' : JSON.stringify(m.data)));
            }
          };
          termWs.onerror = () => { if (view.textContent.startsWith('正在连接终端…')) view.textContent = '终端连接失败，请检查面板 WebSocket 是否可访问。'; };
          setTimeout(() => { if (view.textContent.startsWith('正在连接终端…')) view.textContent = '终端连接超时，请检查面板 WebSocket 是否可访问。'; }, 8000);
        }
      }
      body._cleanup = () => { try { if (termWs) termWs.close(); } catch (e) {} };
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const cmd = input.value; input.value = '';
        if (DP.state.demo) { write('\nsh: ' + esc(cmd) + ': not found in demo\n/ # '); return; }
        termSend(cmd + '\n');
      });
      $('[data-act="term-clear"]', body).onclick = () => view.textContent = '';
      $('[data-act="term-close"]', body).onclick = () => { if (body._cleanup) body._cleanup(); view.textContent += '\n[连接已断开]\n'; };
    },
    renderProcess(body, id) {
      body.innerHTML = DP.skeleton(2);
      DP.api('/app/container/get-process-info', { id }).then(d => {
        if (!document.body.contains(body)) return;
        /* 真实返回: {list:{Titles:[...], Processes:[[...],...]}} */
        const raw = (d && d.list) || {};
        const titles = raw.Titles || (d && d.Titles) || ['USER', 'PID', '%CPU', '%MEM', 'TIME', 'COMMAND'];
        const rows = raw.Processes || (Array.isArray(raw) ? raw : []);
        const pick = (r, names) => { for (const n of names) { const i = titles.findIndex(t => String(t).toLowerCase().includes(n)); if (i >= 0) return r[i]; } return ''; };
        body.innerHTML = rows.length ? `<div class="card"><div class="card-head"><h3>进程列表</h3><span class="sub">${rows.length} 个进程</span></div>${rows.map(p => {
          const pid = pick(p, ['pid']), cpu = pick(p, ['cpu']), mem = pick(p, ['mem']);
          const cmd = p[p.length - 1] || '';
          return `<div class="list-item"><div class="avatar-sm blue">${icon('cpu')}</div><div class="grow"><div class="mid bold">PID ${esc(pid)}</div><div class="small muted mono ellipsis">${esc(cmd)}</div></div><div class="center"><div class="small bold">${esc(cpu)}%</div><div class="small muted">${esc(mem)}</div></div></div>`;
        }).join('')}</div>` : DP.empty('暂无进程信息', 'info');
      }).catch(e => { body.innerHTML = DP.empty('获取进程失败', 'alert'); DP.fail(e); });
    },
    bind(root, id) {
      DP.bindTabs(root, () => DP.go('container', { id, tab: DP.ui.containerTab }, true));
      DP.on(root, 'click', '[data-op]', async (e, t) => {
        await safe(() => DP.api('/app/container/status', { md5: id, operate: t.dataset.op }));
        DP.toast('操作成功', 'ok');
        const mark = DP._currentRoute;
        setTimeout(() => { if (DP.stillHere(mark)) DP.go('container', { id }, true); }, 500);
      });
      const more = root.querySelector('[data-act="more"]');
      if (more) more.onclick = () => this.moreSheet(id);
      DP.on(root, 'click', '[data-extra]', (e, t) => {
        const a = t.dataset.extra;
        if (a === 'delete') return DP.confirm({ title: '删除容器', text: '此操作不可撤销，确定删除？', danger: true, okText: '确认删除', onOk: async () => { await safe(() => DP.api('/app/container/delete', { md5: id, deleteImage: false, deleteVolume: false, deleteLink: false })); DP.toast('已删除', 'ok'); DP.back(); } });
        if (a === 'copy') return DP.prompt({ title: '复制容器', label: '新容器名称', value: 'copy-' + DP.short(id, 6), onOk: async v => { await safe(() => DP.api('/app/container/copy', { md5: id, copyName: v, enableRandomPort: true, enableStart: false })); DP.toast('复制成功', 'ok'); } });
        if (a === 'commit') return DP.prompt({ title: '提交为镜像', label: '镜像名称与标签', value: 'backup:latest', onOk: async v => { await safe(() => DP.api('/app/container/commit', { md5: id, name: v, merge: false })); DP.toast('已提交', 'ok'); } });
        if (a === 'backup') return safe(async () => { await DP.api('/app/container-backup/create', { id, enableBackupImage: true, enableBackupImageContainer: true, enableBackupVolume: true, backupVolumeList: [], description: '移动端创建' }); DP.toast('快照任务已创建', 'ok'); });
      });
    },
    moreSheet(id) {
      const items = [
        ['info', '编辑名称与重启策略', 'edit'], ['ports', '端口与访问地址', 'network'],
        ['upgrade', '镜像更新检查', 'sparkles'], ['backup', '备份与快照', 'download'], ['explorer', '容器内文件', 'folder']
      ];
      DP.sheet({ title: '更多操作', body: `<div class="card tight">${items.map(([a, t, ic]) => `<button class="drawer-link" data-more="${a}">${icon(ic)}<span class="grow">${t}</span>${icon('chevron-right', 'sm')}</button>`).join('')}</div>` });
      DP.on($('#sheet-root'), 'click', '[data-more]', (e, t) => {
        const a = t.dataset.more; DP.closeSheet();
        if (a === 'info') return DP.prompt({ title: '重命名容器', label: '新名称', onOk: async v => { await safe(() => DP.api('/app/container/update', { md5: id, name: v })); DP.toast('已保存', 'ok'); } });
        if (a === 'ports') return DP.toast('端口信息已在详情页展示', 'ok');
        if (a === 'upgrade') return safe(() => this.upgradeSheet(id));
        if (a === 'backup') return DP.go('snapshots', { id });
        if (a === 'explorer') return DP.go('files', { mount: 'container:' + id });
      });
    },
    /* 镜像更新检查 + 一键升级：后端 /app/container-upgrade/check|upgrade */
    async upgradeSheet(id) {
      DP.sheet({ title: '镜像更新检查', body: '<div class="card"><div class="center small muted" style="padding:24px 0">正在对比远端镜像…</div></div>', actions: '<button class="btn ghost grow" data-act="cancel">关闭</button>' });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      const d = await DP.api('/app/container-upgrade/check', { containerId: id, force: true }).catch(e => { DP.fail(e); return null; });
      if (!d) return;
      if (d.message) { DP.sheet({ title: '镜像更新检查', body: `<div class="card"><div class="row"><div class="avatar-sm red">${icon('alert')}</div><div class="grow"><div class="mid bold">检查失败</div><div class="small muted" style="white-space:normal">${esc(d.message)}</div></div></div></div>`, actions: '<button class="btn ghost grow" data-act="cancel">关闭</button>' }); $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet; return; }
      const has = !!d.upgrade;
      const digests = (d.digestLocal || []).map(x => `<div class="small mono muted">${esc(DP.short(x, 34))}</div>`).join('');
      const stTxt = d.status === 'ignoreAlways' || d.status === 'ignoreCurrent' ? '已设置忽略更新' : has ? '发现可用更新' : '已是最新版本';
      const body = `<div class="card tight">
        <div class="row"><div class="avatar-sm ${has ? 'green' : 'blue'}">${icon(has ? 'sparkles' : 'check')}</div><div class="grow"><div class="mid bold">${stTxt}</div><div class="small muted">${d.checkedAt ? '检查时间 ' + DP.fmtTime(d.checkedAt) : has ? '远端镜像比本地新' : '本地与远端镜像一致'}</div></div></div>
        ${d.digest ? `<div class="row" style="margin-top:10px"><span class="small muted">远端摘要</span></div><div class="small mono muted" style="white-space:normal">${esc(DP.short(d.digest, 34))}</div>` : ''}
        ${digests ? `<div class="row" style="margin-top:6px"><span class="small muted">本地摘要</span></div>${digests}` : ''}
        ${has ? '<p class="small muted mt8">升级会停止并删除旧容器，使用相同配置基于新镜像重建（默认创建快照以便回滚）。</p>' : ''}
      </div>`;
      const actions = has
        ? '<button class="btn ghost grow" data-act="cancel">关闭</button><button class="btn primary grow" data-act="do-upgrade">一键升级</button>'
        : '<button class="btn ghost grow" data-act="cancel">关闭</button>';
      DP.sheet({ title: '镜像更新检查', body, actions });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      const go = $('[data-act="do-upgrade"]', $('#sheet-root'));
      if (go) go.onclick = () => {
        DP.confirm({
          title: '确认升级容器', text: '容器将短暂停止服务，升级后自动以原配置启动。是否继续？', okText: '开始升级',
          onOk: async () => {
            go.disabled = true; go.textContent = '升级中…';
            try {
              /* upgrade 是同步接口：停止→重建→启动完成后才返回；进度走 notice WS */
              const r = await DP.api('/app/container-upgrade/upgrade', { md5: id, enableBak: true, enableResetImageConfig: false }, { timeout: 0 });
              DP.closeSheet();
              DP.toast('容器已升级完成', 'ok');
              if (r && r.containerId && r.containerId !== id) DP.toast('容器 ID 已更新：' + DP.short(r.containerId, 12), 'info');
              DP.go('containers');
            } catch (e) {
              go.disabled = false; go.textContent = '一键升级';
              DP.fail(e);
            }
          }
        });
      };
    }
  };

  /* ==================== 镜像 ==================== */
  pages.images = {
    title: '镜像',
    async render(root) {
      root.innerHTML = DP.searchbar('image-search', '搜索镜像名称 / Tag…', DP.ui.imageQuery) + DP.skeleton(4);
      const d = await DP.api('/app/image/get-list', { tag: '', use: 0 }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const q = DP.ui.imageQuery.toLowerCase();
      const list = (d.list || []).filter(x => !q || (x.RepoTags || []).join(' ').toLowerCase().includes(q) || (x.Id || x.ID || '').toLowerCase().includes(q));
      root.innerHTML = DP.searchbar('image-search', '搜索镜像名称 / Tag…', DP.ui.imageQuery) +
        `<div class="row between" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个镜像 · ${DP.fmtBytes(list.reduce((s, x) => s + (x.Size || 0), 0))}</span><div class="row">${DP.iconBtn('refresh', 'refresh')}${DP.iconBtn('pull', 'download', '拉取镜像')}</div></div>` +
        (list.length ? list.map(m => {
          const tags = (m.RepoTags || []).filter(t => !t.startsWith('<none>'));
          const mid = m.Id || m.ID || '';
          const name = tags[0] || DP.short(mid.replace('sha256:', ''), 16);
          return `<div class="item-card" data-id="${esc(mid)}"><div class="row"><div class="avatar-sm blue">${icon('layers')}</div><div class="grow"><div class="title mono">${esc(name)}</div><div class="sub">${tags.length > 1 ? '+' + (tags.length - 1) + ' 个标签 · ' : ''}${DP.fmtTime(m.Created)} · ${DP.fmtBytes(m.Size)}</div></div>${m.Containers ? `<span class="chip blue">使用中</span>` : `<span class="chip">未使用</span>`}</div>
            <div class="action-row"><button class="action-btn" data-img="detail">${icon('info')}详情</button><button class="action-btn" data-img="tag">${icon('edit')}标签</button><button class="action-btn danger" data-img="delete">${icon('trash')}删除</button></div></div>`;
        }).join('') : DP.empty('没有找到镜像', 'layers'));
      this.bind(root);
    },
    bind(root) {
      DP.bindSearch(root, 'image-search', 'imageQuery', () => pages.images.render(root));
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => pages.images.render(root);
      const p = root.querySelector('[data-act="pull"]'); if (p) p.onclick = () => this.pull();
      DP.on(root, 'click', '.item-card', (e, t) => { if (e.target.closest('[data-img]')) return; const id = t.dataset.id; this.detail(id); });
      DP.on(root, 'click', '[data-img]', async (e, t) => {
        e.stopPropagation(); const id = t.closest('.item-card').dataset.id, a = t.dataset.img;
        if (a === 'detail') this.detail(id);
        if (a === 'tag') this.tagSheet(id);
        if (a === 'delete') DP.confirm({ title: '删除镜像', text: '删除后无法恢复，确定继续？', danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/app/image/delete', { md5: [id] })); DP.toast('镜像已删除', 'ok'); pages.images.render(root); } });
      });
    },
    pull() {
      DP.sheet({ title: '拉取镜像', sub: '从仓库下载新镜像',
        body: `<div class="form-field"><label>镜像名称（含标签）</label><input id="pull-image" placeholder="nginx:alpine"></div>
          <div class="form-field"><label>仓库地址（可选）</label><input id="pull-registry" placeholder="docker.io"></div>`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">开始拉取</button>` });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const image = $('#pull-image').value.trim(); if (!image) return DP.toast('请输入镜像名称', 'err');
        DP.closeSheet();
        await safe(async () => { await DP.api('/app/image/tag-sync', { tag: image, type: 'pull', platform: '' }); DP.toast('已开始拉取，请查看通知', 'ok'); });
      };
    },
    async detail(id) {
      await safe(async () => {
        const d = await DP.api('/app/image/get-detail', { md5: id, showLayer: true });
        const x = d.info || d;
        const rows = [['ID', x.Id || x.ID], ['标签', (x.RepoTags || []).join('\n')], ['创建时间', DP.fmtTime(x.Created)], ['大小', DP.fmtBytes(x.Size)], ['容器引用', x.Containers || 0]];
        const layers = d.layer || d.layers || [];
        DP.sheet({ title: '镜像详情', full: true,
          body: `<div class="card tight">${rows.map(([k, v]) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="small muted">${k}</span><span class="small mono" style="max-width:65%;text-align:right;word-break:break-all">${esc(v)}</span></div>`).join('')}</div>
            ${layers.length ? `<div class="card"><div class="card-head"><h3>镜像层</h3></div>${layers.map((l, i) => `<div class="list-item"><div class="avatar-sm">${i + 1}</div><div class="grow"><div class="small mono ellipsis">${esc(l.instruction || '')}</div><div class="small muted">${DP.fmtTime(l.created)}</div></div><span class="small muted">${DP.fmtBytes(l.size)}</span></div>`).join('')}</div>` : ''}` });
      });
    },
    tagSheet(id) {
      DP.sheet({ title: '添加镜像标签', body: `<div class="form-field"><label>新标签</label><input id="tag-new" placeholder="my-registry.com/app:v1"></div>`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">添加</button>` });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const tag = $('#tag-new').value.trim(); if (!tag) return;
        await safe(async () => { await DP.api('/app/image/tag-add', { md5: id, tag }); DP.closeSheet(); DP.toast('标签已添加', 'ok'); });
      };
    }
  };

  /* ==================== 网络 ==================== */
  pages.networks = {
    title: '网络',
    async render(root) {
      root.innerHTML = DP.searchbar('network-search', '搜索网络…', DP.ui.networkQuery) + DP.skeleton(3);
      const d = await DP.api('/app/network/get-list', { name: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const q = DP.ui.networkQuery.toLowerCase();
      const list = (d.list || []).filter(n => !q || n.Name.toLowerCase().includes(q) || n.Driver.toLowerCase().includes(q));
      root.innerHTML = DP.searchbar('network-search', '搜索网络…', DP.ui.networkQuery) +
        `<div class="row between" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个网络</span><div class="row">${DP.iconBtn('refresh', 'refresh')}${DP.iconBtn('create', 'plus')}</div></div>` +
        (list.length ? list.map(n => `<div class="item-card" data-name="${esc(n.Name)}"><div class="row"><div class="avatar-sm teal" style="background:var(--blue-soft);color:var(--blue)">${icon('network')}</div><div class="grow"><div class="title">${esc(n.Name)}</div><div class="sub">${esc(n.Driver)} · ${(n.IPAM && n.IPAM.Config && n.IPAM.Config[0] && n.IPAM.Config[0].Subnet) || '无子网'} · ${Object.keys(n.Containers || {}).length} 个容器</div></div><span class="chip blue">${esc(n.Scope)}</span></div>
          <div class="action-row"><button class="action-btn" data-net="detail">${icon('info')}详情</button><button class="action-btn danger" data-net="delete">${icon('trash')}删除</button></div></div>`).join('') : DP.empty('暂无网络', 'network'));
      this.bind(root);
    },
    bind(root) {
      DP.bindSearch(root, 'network-search', 'networkQuery', () => pages.networks.render(root));
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => pages.networks.render(root);
      const c = root.querySelector('[data-act="create"]'); if (c) c.onclick = () => this.create();
      DP.on(root, 'click', '[data-net]', async (e, t) => {
        e.stopPropagation(); const name = t.closest('.item-card').dataset.name;
        if (t.dataset.net === 'delete') return DP.confirm({ title: '删除网络', text: `确定删除网络 ${name}？`, danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/app/network/delete', { name: [name] })); DP.toast('已删除', 'ok'); pages.networks.render(root); } });
        await safe(async () => {
          const d = await DP.api('/app/network/get-detail', { name });
          const x = d.info || d;
          const cs = Object.values(x.Containers || {});
          DP.sheet({ title: name, full: true, body: `<div class="card tight"><div class="row between"><span class="small muted">驱动</span><span class="small bold">${esc(x.Driver)}</span></div><div class="row between"><span class="small muted">子网</span><span class="small mono">${esc((x.IPAM && x.IPAM.Config && x.IPAM.Config[0] && x.IPAM.Config[0].Subnet) || '—')}</span></div><div class="row between"><span class="small muted">网关</span><span class="small mono">${esc((x.IPAM && x.IPAM.Config && x.IPAM.Config[0] && x.IPAM.Config[0].Gateway) || '—')}</span></div><div class="row between"><span class="small muted">Internal</span><span class="small">${x.Internal ? '是' : '否'}</span></div></div>
            <div class="card"><div class="card-head"><h3>已连接容器</h3></div>${cs.length ? cs.map(c => `<div class="list-item"><div class="avatar-sm blue">${icon('box')}</div><div class="grow"><div class="mid bold">${esc(c.Name)}</div><div class="small muted mono">${esc(c.IPv4Address || '')}</div></div></div>`).join('') : DP.empty('暂无容器连接', 'box')}</div>` });
        });
      });
    },
    create() {
      DP.sheet({ title: '创建网络', body: `<div class="form-field"><label>网络名称</label><input id="net-name" placeholder="my-network"></div>
        <div class="form-field"><label>驱动</label><select id="net-driver"><option>bridge</option><option>overlay</option><option>macvlan</option></select></div>
        <div class="form-field"><label>子网（可选）</label><input id="net-subnet" placeholder="172.30.0.0/16"></div>
        <div class="form-field"><label>网关（可选）</label><input id="net-gw" placeholder="172.30.0.1"></div>`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">创建</button>` });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const name = $('#net-name').value.trim(); if (!name) return DP.toast('请输入名称', 'err');
        await safe(async () => { await DP.api('/app/network/create', { name, driver: $('#net-driver').value, ipSubnet: $('#net-subnet').value.trim(), ipGateway: $('#net-gw').value.trim() }); DP.closeSheet(); DP.toast('网络已创建', 'ok'); pages.networks.render(DP.$('#content')); });
      };
    }
  };

  /* ==================== 存储卷 ==================== */
  pages.volumes = {
    title: '存储卷',
    async render(root) {
      root.innerHTML = DP.searchbar('volume-search', '搜索存储卷…', DP.ui.volumeQuery) + DP.skeleton(3);
      const d = await DP.api('/app/volume/get-list', { name: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const q = DP.ui.volumeQuery.toLowerCase();
      const list = (d.list || []).filter(v => !q || v.Name.toLowerCase().includes(q));
      root.innerHTML = DP.searchbar('volume-search', '搜索存储卷…', DP.ui.volumeQuery) +
        `<div class="row between" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个卷 · ${DP.fmtBytes(list.reduce((s, v) => s + ((v.UsageData && v.UsageData.Size) || 0), 0))}</span><div class="row">${DP.iconBtn('refresh', 'refresh')}${DP.iconBtn('create', 'plus')}${DP.iconBtn('prune', 'sparkles')}</div></div>` +
        (list.length ? list.map(v => `<div class="item-card" data-name="${esc(v.Name)}"><div class="row"><div class="avatar-sm green">${icon('database')}</div><div class="grow"><div class="title">${esc(v.Name)}</div><div class="sub mono">${DP.fmtBytes((v.UsageData && v.UsageData.Size) || 0)} · ${esc(v.Driver)} · ${DP.ago(v.CreatedAt)}</div></div><span class="chip ${(v.UsageData && v.UsageData.RefCount) ? 'blue' : ''}">${(v.UsageData && v.UsageData.RefCount) || 0} 引用</span></div></div>`).join('') : DP.empty('暂无存储卷', 'database'));
      this.bind(root);
    },
    bind(root) {
      DP.bindSearch(root, 'volume-search', 'volumeQuery', () => pages.volumes.render(root));
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => pages.volumes.render(root);
      const c = root.querySelector('[data-act="create"]'); if (c) c.onclick = () => DP.prompt({ title: '创建存储卷', label: '卷名称', onOk: async v => { await safe(() => DP.api('/app/volume/create', { name: v, driver: 'local' })); DP.toast('已创建', 'ok'); pages.volumes.render(root); } });
      const p = root.querySelector('[data-act="prune"]'); if (p) p.onclick = () => DP.confirm({ title: '清理未使用卷', text: '将删除所有未被容器引用的存储卷。', danger: true, okText: '清理', onOk: async () => { await safe(() => DP.api('/app/volume/prune', { deleteAll: true })); DP.toast('清理完成', 'ok'); pages.volumes.render(root); } });
      DP.on(root, 'click', '.item-card', async (e, t) => {
        await safe(async () => {
          const d = await DP.api('/app/volume/get-detail', { name: t.dataset.name });
          const v = d.info || d;
          DP.sheet({ title: v.Name, body: `<div class="card tight"><div class="row between"><span class="small muted">挂载点</span><span class="small mono" style="max-width:68%;text-align:right;word-break:break-all">${esc(v.Mountpoint)}</span></div><div class="row between"><span class="small muted">驱动</span><span class="small bold">${esc(v.Driver)}</span></div><div class="row between"><span class="small muted">大小</span><span class="small bold">${DP.fmtBytes((v.UsageData || {}).Size)}</span></div><div class="row between"><span class="small muted">创建时间</span><span class="small">${DP.fmtTime(v.CreatedAt)}</span></div></div>`,
            actions: `<button class="btn danger grow" data-act="del">删除卷</button>` });
          $('[data-act="del"]', $('#sheet-root')).onclick = () => { DP.closeSheet(); DP.confirm({ title: '删除存储卷', text: `确定删除 ${v.Name}？`, danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/app/volume/delete', { name: [v.Name] })); DP.toast('已删除', 'ok'); pages.volumes.render(root); } }); };
        });
      });
    }
  };

  /* ==================== Compose ==================== */
  pages.compose = {
    title: 'Compose',
    async render(root) {
      root.innerHTML = DP.searchbar('compose-search', '搜索项目…', DP.ui.composeQuery) + DP.skeleton(3);
      const d = await DP.api('/app/compose/get-list', { name: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const q = DP.ui.composeQuery.toLowerCase();
      // 真实返回 entity.Compose: {id(number),name,title,setting:{status:"running(2)",type,...}}；容器列表在顶层 d.containerList 按 project 分组
      const allContainers = (d.containerList || []).filter(x => x.project);
      const list = (d.list || []).filter(x => !q || (x.name || '').toLowerCase().includes(q) || (x.title || '').toLowerCase().includes(q));
      const stOf = x => String((x.setting && x.setting.status) || x.status || '');
      const isRunning = x => stOf(x).startsWith('running');
      const typeOf = x => (x.setting && x.setting.type) || x.type || 'local';
      const cntOf = x => allContainers.filter(cc => cc.project === x.name).length;
      root.innerHTML = DP.searchbar('compose-search', '搜索项目…', DP.ui.composeQuery) +
        `<div class="row between" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个编排项目</span><div class="row">${DP.iconBtn('refresh', 'refresh')}${DP.iconBtn('create', 'plus')}</div></div>` +
        (list.length ? list.map(x => `<div class="item-card" data-id="${esc(String(x.id))}"${x.id ? '' : ' data-ext="1"'}><div class="row"><div class="avatar-sm" style="background:var(--primary-soft);color:var(--primary)">${icon('code')}</div><div class="grow"><div class="title">${esc(x.title || x.name)}</div><div class="sub">${esc(x.name)} · ${cntOf(x)} 个容器 · ${esc(typeOf(x))}</div></div><span class="chip ${isRunning(x) ? 'green' : ''}">${isRunning(x) ? '已部署' : '未运行'}</span></div>
          ${x.id ? `<div class="action-row"><button class="action-btn" data-co="detail">${icon('eye')}查看 YAML</button><button class="action-btn" data-co="deploy">${icon('play')}部署</button><button class="action-btn" data-co="destroy">${icon('stop')}销毁</button></div>` : `<div class="small muted" style="padding:4px 8px">外部编排项目 · 后端未收录，仅展示状态</div>`}</div>`).join('') : DP.empty('暂无 Compose 项目', 'code'));
      this.bind(root);
    },
    bind(root) {
      DP.bindSearch(root, 'compose-search', 'composeQuery', () => pages.compose.render(root));
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => pages.compose.render(root);
      const c = root.querySelector('[data-act="create"]'); if (c) c.onclick = () => this.create();
      DP.on(root, 'click', '[data-co]', async (e, t) => {
        e.stopPropagation(); const id = String(t.closest('.item-card').dataset.id), a = t.dataset.co;
        if (a === 'detail') {
          await safe(async () => {
            const d = await DP.api('/app/compose/get-detail', { id }); // 后端 id 为 string 类型，必须传字符串
            // 真实返回: {yaml:[主,覆盖], detail:{id,name,title,setting}, project, containerList, error}
            const detail = d.detail || d.info || d;
            const setting = detail.setting || {};
            const yamlText = Array.isArray(d.yaml) ? (d.yaml[0] || '') : (d.yaml || detail.yaml || '');
            const name = detail.name || '';
            const title = detail.title || name;
            const type = setting.type || detail.type || 'local';
            if (d.error) DP.toast(d.error, 'err');
            DP.sheet({ title: title || name, sub: name, full: true,
              body: `<div class="form-field"><label>docker-compose.yml</label><textarea id="compose-yaml" style="min-height:300px">${esc(yamlText)}</textarea></div>${Array.isArray(d.yaml) && d.yaml[1] ? `<div class="form-field"><label>覆盖配置 (override)</label><textarea id="compose-yaml-override" style="min-height:120px">${esc(d.yaml[1])}</textarea></div>` : ''}`,
              actions: `<button class="btn ghost grow" data-act="cancel">关闭</button><button class="btn primary grow" data-act="save">保存并同步</button>` });
            $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
            $('[data-act="save"]', $('#sheet-root')).onclick = async () => {
              await safe(async () => {
                const ov = $('#compose-yaml-override');
                const payload = { id, title, name, yaml: $('#compose-yaml').value, type };
                if (ov) payload.yamlOverride = ov.value;
                await DP.api('/app/compose/create', payload);
                DP.closeSheet(); DP.toast('已保存', 'ok'); pages.compose.render(root);
              });
            };
          });
        }
        if (a === 'deploy') await safe(async () => { await DP.api('/app/compose/container-deploy', { id, environment: [], createPath: true }); DP.toast('部署任务已提交', 'ok'); pages.compose.render(root); });
        if (a === 'destroy') DP.confirm({ title: '销毁项目', text: '将停止并移除该项目下的容器。', danger: true, okText: '销毁', onOk: async () => { await safe(() => DP.api('/app/compose/container-destroy', { id, deleteImage: false, deleteVolume: false, deleteData: false, deletePath: false })); DP.toast('已销毁', 'ok'); pages.compose.render(root); } });
      });
    },
    create() {
      DP.sheet({ title: '创建 Compose 项目',
        body: `<div class="form-field"><label>项目名称</label><input id="co-name" placeholder="my-project"></div>
          <div class="form-field"><label>显示标题</label><input id="co-title" placeholder="我的应用"></div>
          <div class="form-field"><label>来源</label><select id="co-type"><option value="local">本地 YAML</option><option value="uri">远程 URL</option><option value="git">Git 仓库</option></select></div>
          <div class="form-field"><label>YAML 内容 / 地址</label><textarea id="co-yaml" placeholder="services:\n  app:\n    image: nginx:alpine"></textarea></div>`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">创建</button>` });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const name = $('#co-name').value.trim(), yaml = $('#co-yaml').value.trim();
        if (!name || !yaml) return DP.toast('请填写项目名称与内容', 'err');
        await safe(async () => { await DP.api('/app/compose/create', { name, title: $('#co-title').value.trim() || name, yaml, type: $('#co-type').value }); DP.closeSheet(); DP.toast('项目已创建', 'ok'); pages.compose.render(DP.$('#content')); });
      };
    }
  };
})(window);
