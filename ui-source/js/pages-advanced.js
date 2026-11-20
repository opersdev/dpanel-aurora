/* DPanel Mobile — 进阶页面：文件 / 商店 / 计划任务 / Swarm / 通知 / 设置 等 */
(function (w) {
  'use strict';
  const DP = w.DP, $ = DP.$, esc = DP.esc, icon = DP.icon;
  const pages = DP.pages = DP.pages || {};
  const safe = DP.safe;

  /* ==================== 文件管理 ==================== */
  pages.files = {
    title: '文件管理',
    async render(root, params) {
      const ui = DP.ui;
      if (params && params.mount) ui.fileMount = params.mount;
      root.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn ghost sm" data-act="mount">${icon('server', 'sm')}<span class="ellipsis" style="max-width:130px">${esc(ui.fileMount)}</span>${icon('chevron-down', 'xs')}</button><div class="grow"></div>${DP.iconBtn('refresh', 'refresh')}${DP.iconBtn('mkdir', 'plus')}${DP.iconBtn('upload', 'upload')}</div><div id="file-body">${DP.skeleton(5)}</div>`;
      await this.load(root);
      this.bind(root);
    },
    async load(root) {
      const body = $('#file-body', root);
      const d = await DP.api('/common/explorer/get-path-list', { mountPoint: DP.ui.fileMount, path: DP.ui.filePath }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(body)) return;
      const list = (d.list || []).slice().sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1) || String(a.name).localeCompare(String(b.name)));
      const parts = DP.ui.filePath.split('/').filter(Boolean);
      body.innerHTML = `<div class="pathbar"><button data-path="/">${icon('folder', 'sm')} 根目录</button>${parts.map((p, i) => `<span>/</span><button data-path="/${parts.slice(0, i + 1).join('/')}">${esc(p)}</button>`).join('')}</div>
        ${list.length ? `<div class="card tight">${list.map(f => {
          const dir = f.type === 'dir' || f.isDir || f.fileType === 'dir';
          return `<div class="file-item" data-name="${esc(f.name)}" data-type="${dir ? 'dir' : 'file'}">
            <div class="avatar-sm ${dir ? 'amber' : 'blue'}">${icon(dir ? 'folder' : 'file')}</div>
            <div class="grow"><div class="fname">${esc(f.name)}</div><div class="fmeta">${dir ? '文件夹' : DP.fmtBytes(f.size)} · ${esc(f.modTime ? DP.ago(f.modTime) : '')} · ${esc(f.mode || '')}</div></div>
            <button class="icon-btn" data-fop="${dir ? 'open' : 'view'}">${icon(dir ? 'chevron-right' : 'eye', 'sm')}</button>
          </div>`;
        }).join('')}</div>` : DP.empty('此目录为空', 'folder')}
        <div class="small muted center mt12">当前目录：${esc(DP.ui.filePath)} · ${list.length} 项</div>`;
    },
    bind(root) {
      DP.on(root, 'click', '[data-path]', (e, t) => { DP.ui.filePath = t.dataset.path; this.load(root); });
      DP.on(root, 'click', '[data-fop]', async (e, t) => {
        e.stopPropagation(); const item = t.closest('.file-item'), name = item.dataset.name;
        if (item.dataset.type === 'dir') { DP.ui.filePath = (DP.ui.filePath === '/' ? '' : DP.ui.filePath) + '/' + name; this.load(root); }
        else await this.view(root, DP.ui.filePath === '/' ? '/' + name : DP.ui.filePath + '/' + name);
      });
      DP.on(root, 'click', '.file-item', async (e, t) => {
        const name = t.dataset.name; if (!name) return;
        if (t.dataset.type === 'dir') { DP.ui.filePath = (DP.ui.filePath === '/' ? '' : DP.ui.filePath) + '/' + name; this.load(root); }
        else await this.view(root, DP.ui.filePath === '/' ? '/' + name : DP.ui.filePath + '/' + name);
      });
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => this.load(root);
      const mk = root.querySelector('[data-act="mkdir"]'); if (mk) mk.onclick = () => DP.prompt({ title: '新建文件夹', label: '文件夹名称', onOk: async v => { await safe(() => DP.api('/common/explorer/mkdir', { mountPoint: DP.ui.fileMount, dstPath: (DP.ui.filePath === '/' ? '' : DP.ui.filePath) + '/' + v })); DP.toast('已创建', 'ok'); this.load(root); } });
      const up = root.querySelector('[data-act="upload"]'); if (up) up.onclick = () => this.upload(root);
      const mo = root.querySelector('[data-act="mount"]'); if (mo) mo.onclick = () => this.mountSheet(root);
    },
    async view(root, file) {
      await safe(async () => {
        const d = await DP.api('/common/explorer/get-content', { mountPoint: DP.ui.fileMount, file });
        const content = typeof d === 'string' ? d : (d.content != null ? d.content : JSON.stringify(d, null, 2));
        DP.sheet({ title: file.split('/').pop(), sub: DP.ui.fileMount + ':' + file, full: true,
          body: `<div class="form-field"><label>文件内容</label><textarea id="file-content" style="min-height:46vh">${esc(content)}</textarea></div>`,
          actions: `<button class="btn ghost grow" data-act="cancel">关闭</button><button class="btn primary grow" data-act="save">保存</button>` });
        $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
        $('[data-act="save"]', $('#sheet-root')).onclick = async () => {
          await safe(async () => { await DP.api('/common/explorer/import-file-content', { mountPoint: DP.ui.fileMount, file, content: $('#file-content').value, dstPath: file, fileMode: 644 }); DP.closeSheet(); DP.toast('文件已保存', 'ok'); });
        };
      });
    },
    upload(root) {
      const input = document.createElement('input'); input.type = 'file';
      input.onchange = async () => {
        const f = input.files[0]; if (!f) return;
        if (DP.state.demo) return DP.toast('演示模式下不会真正上传文件', 'ok');
        const fd = new FormData(); fd.append('file', f); fd.append('path', DP.ui.filePath); fd.append('mountPoint', DP.ui.fileMount);
        await safe(async () => { await DP.api('/common/attach/upload', fd, { form: true, method: 'POST' }); DP.toast('上传成功', 'ok'); this.load(root); });
      };
      input.click();
    },
    mountSheet(root) {
      const opts = [['local:host', '宿主机根目录'], ['local:dpanel', '面板数据目录'], ['docker:default', 'Docker 服务']];
      DP.sheet({ title: '选择文件来源', body: `<div class="card tight">${opts.map(([o, label]) => `<button class="drawer-link" data-mount="${o}">${icon('server')}<span class="grow"><b>${label}</b><br><small class="muted mono">${o}</small></span>${DP.ui.fileMount === o ? icon('check') : ''}</button>`).join('')}</div>
        <p class="small muted">也可使用 container:容器名 或 volume:卷名 浏览容器/数据卷内的文件。</p>` });
      DP.on($('#sheet-root'), 'click', '[data-mount]', (e, t) => { DP.ui.fileMount = t.dataset.mount; DP.ui.filePath = '/'; DP.closeSheet(); this.render(root); });
    }
  };

  /* ==================== 应用商店 ==================== */
  // 把 store 源列表的 setting.apps 聚合为可展示的应用项
  // 真实返回: {list:[{id,title,name,setting:{type,url,apps:[StoreAppDetail],total}}]}
  // StoreAppDetail: {title,titles,name,description,descriptions,version:{版本名:{name,default,...}},tag,website,...}
  function flattenStoreApps(stores) {
    const out = [];
    (stores || []).forEach(s => {
      const setting = s.setting || {};
      (setting.apps || []).forEach(a => {
        const versions = Object.keys(a.version || {});
        let ver = '';
        for (const k of versions) { if (a.version[k] && a.version[k].default) { ver = k; break; } }
        if (!ver) ver = versions[0] || '';
        out.push({
          storeId: s.id, storeTitle: s.title, appName: a.name, title: a.title || a.name,
          name: a.name, description: a.description || '', categories: a.tag || [],
          version: ver, versions, icon: (a.title || a.name || 'A')[0], installed: !!a.installed
        });
      });
    });
    return out;
  }
  pages.store = {
    title: '应用商店',
    async render(root) {
      root.innerHTML = DP.searchbar('store-search', '搜索应用…', DP.ui.storeQuery) + DP.skeleton(3);
      const d = await DP.api('/common/store/get-list', { enableAppList: true }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const stores = d.list || [];
      const all = flattenStoreApps(stores);
      const q = DP.ui.storeQuery.toLowerCase();
      const list = all.filter(a => !q || (a.title || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
      root.innerHTML = `<div class="page-head"><div><h2>应用商店</h2><p>一键部署常用服务 · ${stores.length} 个商店源</p></div>${DP.iconBtn('sync', 'refresh')}</div>` +
        DP.searchbar('store-search', '搜索应用…', DP.ui.storeQuery) +
        (list.length ? list.map((a, i) => `<div class="item-card" data-i="${i}"><div class="row"><div class="avatar-sm" style="background:var(--primary-soft);color:var(--primary);font-weight:800">${esc(a.icon || 'A')}</div><div class="grow"><div class="title">${esc(a.title)}</div><div class="sub">${esc(a.description || a.name)}</div></div>${a.installed ? '<span class="chip green">已安装</span>' : `<button class="btn primary sm" data-deploy="${i}">安装</button>`}</div>
          <div class="chips"><span class="chip">v${esc(a.version)}</span><span class="chip purple">${esc(a.storeTitle)}</span>${(a.categories || []).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div></div>`).join('') : DP.empty(stores.length ? '暂无应用' : '请先添加商店源', 'store'));
      DP.bindSearch(root, 'store-search', 'storeQuery', () => pages.store.render(root));
      const s = root.querySelector('[data-act="sync"]');
      if (s) s.onclick = async () => {
        if (!stores.length) return DP.toast('暂无可同步的商店源，请先在网页端添加', 'err');
        await safe(async () => {
          let ok = 0;
          for (const st of stores) {
            // 部署版 sync 要求全量参数；大商店同步可能较慢，逐个进行并容错
            try {
              await DP.api('/common/store/sync', { id: st.id, name: st.name, type: (st.setting || {}).type || '', url: (st.setting || {}).url || '' });
              ok++;
            } catch (e) { DP.toast(st.title + ' 同步失败', 'err'); }
          }
          if (ok) DP.toast('已同步 ' + ok + '/' + stores.length + ' 个商店源', 'ok');
        });
        pages.store.render(root);
      };
      const deploy = async a => {
        if (!a.version) return DP.toast('该应用无可用版本', 'err');
        await safe(async () => { await DP.api('/common/store/deploy', { storeId: a.storeId, appName: a.appName, version: a.version }); DP.toast('部署任务已提交', 'ok'); });
      };
      DP.on(root, 'click', '[data-deploy]', async (e, t) => { e.stopPropagation(); await deploy(list[+t.dataset.deploy]); });
      DP.on(root, 'click', '.item-card', async (e, t) => {
        if (e.target.closest('[data-deploy]')) return;
        const a = list[+t.dataset.i]; if (!a) return;
        await safe(async () => {
          const d = await DP.api('/common/store/get-app-detail', { storeId: a.storeId, appName: a.appName, version: a.version });
          const detail = d.detail || d;
          const yaml = d.yaml || (Array.isArray(d.yaml) ? d.yaml[0] : '') || '';
          DP.sheet({ title: a.title, sub: a.storeTitle, full: true,
            body: `<div class="card"><div class="mid bold">${esc(a.description || '')}</div><div class="chips mt12"><span class="chip">版本 v${esc(a.version)}</span><span class="chip purple">${esc(a.storeTitle)}</span></div></div>
            ${detail.setting && detail.setting.environment && detail.setting.environment.length ? `<div class="card"><div class="card-head"><h3>环境变量</h3></div>${detail.setting.environment.map(en => `<div class="small mono" style="padding:4px 0">${esc(en.name || en.key || '')}${en.value ? ' = ' + esc(en.value) : ''}</div>`).join('')}</div>` : ''}
            ${yaml ? `<div class="card"><div class="card-head"><h3>Compose 配置</h3></div><pre class="small mono" style="white-space:pre-wrap;word-break:break-all">${esc(Array.isArray(yaml) ? yaml[0] : yaml)}</pre></div>` : ''}`,
            actions: `<button class="btn primary block" data-act="deploy">一键安装</button>` });
          const b = $('[data-act="deploy"]', $('#sheet-root')); if (b) b.onclick = async () => { DP.closeSheet(); await deploy(a); };
        });
      });
    }
  };

  /* ==================== 计划任务 ==================== */
  pages.cron = {
    title: '计划任务',
    async render(root) {
      root.innerHTML = DP.skeleton(3);
      const d = await DP.api('/common/cron/get-list', { title: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      root.innerHTML = `<div class="page-head"><div><h2>计划任务</h2><p>定时执行备份、清理与检查</p></div>${DP.iconBtn('add', 'plus')}</div>` +
        (list.length ? list.map(c => `<div class="item-card" data-id="${c.id}"><div class="row"><div class="avatar-sm ${c.setting && c.setting.disable ? '' : 'green'}">${icon('clock')}</div><div class="grow"><div class="title">${esc(c.title)}</div><div class="sub mono">${esc((c.setting && c.setting.spec) || '手动触发')} · 上次 ${DP.ago(c.lastRunAt)}</div></div><span class="chip ${c.status === 'success' ? 'green' : ''}">${c.setting && c.setting.disable ? '已停用' : c.status === 'success' ? '成功' : '待运行'}</span></div>
          <div class="action-row"><button class="action-btn" data-cron="run">${icon('play')}立即执行</button><button class="action-btn" data-cron="log">${icon('file')}执行日志</button><button class="action-btn danger" data-cron="del">${icon('trash')}删除</button></div></div>`).join('') : DP.empty('暂无计划任务', 'clock'));
      this.bind(root);
    },
    bind(root) {
      const a = root.querySelector('[data-act="add"]'); if (a) a.onclick = () => this.create(root);
      DP.on(root, 'click', '[data-cron]', async (e, t) => {
        e.stopPropagation(); const id = t.closest('.item-card').dataset.id, op = t.dataset.cron;
        if (op === 'run') await safe(async () => { await DP.api('/common/cron/run-once', { id }); DP.toast('任务已触发', 'ok'); });
        if (op === 'del') return DP.confirm({ title: '删除任务', text: '确定删除该计划任务？', danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/common/cron/delete', { id: [Number(id)] })); DP.toast('已删除', 'ok'); pages.cron.render(root); } });
        if (op === 'log') await safe(async () => {
          const d = await DP.api('/common/cron/get-log-list', { id, page: 1, pageSize: 30 });
          DP.sheet({ title: '执行日志', full: true, body: (d.list || []).length ? `<div class="card tight">${d.list.map(l => `<div class="list-item"><div class="avatar-sm ${l.status === 'success' ? 'green' : 'red'}">${icon(l.status === 'success' ? 'check' : 'alert')}</div><div class="grow"><div class="mid">${esc(l.message)}</div><div class="small muted">${DP.fmtTime(l.createdAt)}</div></div></div>`).join('')}</div>` : DP.empty('暂无执行记录', 'file') });
        });
      });
    },
    async create(root) {
      const tpl = await DP.api('/common/cron/template', {}).catch(() => ({ list: [] }));
      DP.sheet({ title: '新建计划任务',
        body: `<div class="form-field"><label>任务标题</label><input id="cron-title" placeholder="例如：每日备份"></div>
          <div class="form-field"><label>Cron 表达式</label><input id="cron-spec" placeholder="0 3 * * *"></div>
          ${(tpl.list || []).length ? `<div class="small muted" style="margin-bottom:8px">常用模板</div><div class="row wrap">${tpl.list.map(x => `<button class="btn outline sm" data-spec="${esc(x.spec)}" data-title="${esc(x.title)}">${esc(x.title)}</button>`).join('')}</div>` : ''}`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">创建</button>` });
      DP.on($('#sheet-root'), 'click', '[data-spec]', (e, b) => { $('#cron-spec').value = b.dataset.spec; $('#cron-title').value = b.dataset.title; });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const title = $('#cron-title').value.trim(), spec = $('#cron-spec').value.trim();
        if (!title || !spec) return DP.toast('请填写标题与表达式', 'err');
        await safe(async () => { await DP.api('/common/cron/create', { id: 0, title, setting: { triggerType: 'cron', spec, disable: false }, command: '' }); DP.closeSheet(); DP.toast('任务已创建', 'ok'); pages.cron.render(root); });
      };
    }
  };

  /* ==================== Swarm ==================== */
  pages.swarm = {
    title: 'Swarm 集群',
    async render(root) {
      root.innerHTML = DP.tabs([['nodes', '节点'], ['services', '服务'], ['tasks', '任务']], DP.ui.swarmTab || 'nodes', 'swarmTab') + DP.skeleton(3);
      const tab = DP.ui.swarmTab || 'nodes';
      const info = await DP.api('/app/swarm/info', {}).catch(() => null);
      const active = !!(info && info.swarm && (info.swarm.ControlAvailable || info.swarm.NodeID));
      let list = [];
      if (active) {
        const d = await DP.api(tab === 'nodes' ? '/app/swarm/node-list' : tab === 'services' ? '/app/swarm/service-list' : '/app/swarm/task-list', tab === 'nodes' ? {} : tab === 'services' ? { name: '' } : { serviceName: '', status: '' }).catch(e => {
          /* 未加入集群/非管理节点时静默处理，避免弹 daemon 原始报错 */
          if (!/swarm/i.test(e && e.message || '')) DP.fail(e);
          return { list: [] };
        });
        list = d.list || (Array.isArray(d) ? d : []);
      }
      if (!document.body.contains(root)) return;
      const head = `<div class="card"><div class="row"><div class="avatar-sm purple" style="background:var(--primary-soft)">${icon('cube')}</div><div class="grow"><div class="mid bold">${esc((info && info.swarm && info.swarm.Cluster && info.swarm.Cluster.Spec && info.swarm.Cluster.Spec.Name) || 'Swarm 集群')}</div><div class="small muted">${info && info.swarm && info.swarm.ControlAvailable ? '当前节点为管理节点' : '未加入集群或为工作节点'}</div></div><span class="chip ${info && info.swarm && info.swarm.ControlAvailable ? 'green' : ''}">${info && info.swarm && info.swarm.ControlAvailable ? '就绪' : '未激活'}</span></div></div>`;
      let rows = '';
      if (tab === 'nodes') rows = list.map(n => `<div class="item-card"><div class="row"><div class="avatar-sm blue">${icon('server')}</div><div class="grow"><div class="title">${esc(n.Hostname || n.ID)}</div><div class="sub">${esc(n.Role)} · ${esc(n.Status && n.Status.State)} · ${esc(n.Availability)}</div></div><span class="chip ${n.Status && n.Status.State === 'ready' ? 'green' : 'red'}">${esc(n.Status && n.Status.State)}</span></div></div>`).join('');
      if (tab === 'services') rows = list.map(s => `<div class="item-card"><div class="row"><div class="avatar-sm">${icon('layers')}</div><div class="grow"><div class="title">${esc(s.Spec && s.Spec.Name || s.ID)}</div><div class="sub">副本 ${esc(s.Spec && s.Spec.Mode && s.Spec.Mode.Replicated && s.Spec.Mode.Replicated.Replicas || 1)} · 版本 ${esc(s.SpecVersion && s.SpecVersion.Index)}</div></div><span class="chip blue">服务</span></div></div>`).join('');
      if (tab === 'tasks') rows = list.map(t => `<div class="item-card"><div class="row"><div class="avatar-sm green">${icon('box')}</div><div class="grow"><div class="title">${esc(t.ServiceName || t.ID)}</div><div class="sub">节点 ${esc(t.NodeID || '—')} · ${esc(t.Status && t.Status.State)}</div></div><span class="chip ${t.Status && t.Status.State === 'running' ? 'green' : 'amber'}">${esc(t.Status && t.Status.State)}</span></div></div>`).join('');
      root.innerHTML = head + DP.tabs([['nodes', '节点'], ['services', '服务'], ['tasks', '任务']], DP.ui.swarmTab || 'nodes', 'swarmTab') + (rows || DP.empty(active ? '暂无数据' : '当前节点未加入 Swarm 集群，此页功能不可用', 'cube'));
      DP.bindTabs(root, () => pages.swarm.render(root));
    }
  };

  /* ==================== 通知 ==================== */
  pages.notices = {
    title: '通知中心',
    async render(root) {
      root.innerHTML = DP.skeleton(3);
      const d = await DP.api('/common/notice/get-list', { page: 1, pageSize: 50, type: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      DP.state.noticeUnread = list.filter(n => !n.read).length;
      const badge = $('#notice-badge'); if (badge) badge.classList.toggle('hidden', !DP.state.noticeUnread);
      root.innerHTML = `<div class="page-head"><div><h2>通知中心</h2><p>${DP.state.noticeUnread} 条未读消息</p></div>${DP.iconBtn('refresh', 'refresh')}</div>` +
        (list.length ? list.map(n => `<div class="item-card" data-id="${n.id}"><div class="row"><div class="avatar-sm ${n.type === 'alert' ? 'red' : n.type === 'cron' ? 'green' : 'blue'}">${icon(n.type === 'alert' ? 'alert' : n.type === 'cron' ? 'clock' : 'bell')}</div><div class="grow"><div class="title">${esc(n.title)}</div><div class="sub" style="white-space:normal">${esc(n.content)}</div></div>${!n.read ? '<i class="status-dot" style="color:var(--primary)"></i>' : ''}</div><div class="row between mt8"><span class="small muted">${DP.ago(n.createdAt)}</span><button class="link-btn" data-del="${n.id}">删除</button></div></div>`).join('') : DP.empty('暂无通知', 'bell'));
      const r = root.querySelector('[data-act="refresh"]'); if (r) r.onclick = () => pages.notices.render(root);
      DP.on(root, 'click', '[data-del]', async (e, t) => { e.stopPropagation(); await safe(() => DP.api('/common/notice/delete', { id: [Number(t.dataset.del)] })); DP.toast('已删除', 'ok'); pages.notices.render(root); });
    }
  };

  /* ==================== 系统日志 ==================== */
  pages.syslog = {
    title: '系统日志',
    async render(root) {
      root.innerHTML = DP.skeleton(3);
      // level/source 后端要求是数组；level 值域 debug/info/warning/error
      const d = await DP.api('/common/log/get-list', { keyword: '', level: [], source: [] }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      const levelCls = l => l === 'error' ? 'red' : (l === 'warning' || l === 'warn') ? 'amber' : 'blue';
      const text = l => {
        if (l.description) return l.description;
        if (typeof l.message === 'string') return l.message;
        if (l.message && typeof l.message === 'object') return l.message.message || l.message.action || JSON.stringify(l.message);
        return '';
      };
      root.innerHTML = `<div class="page-head"><div><h2>系统日志</h2><p>面板运行记录</p></div></div>` +
        (list.length ? list.map(l => `<div class="item-card"><div class="row"><div class="avatar-sm ${levelCls(l.level)}">${icon(l.level === 'error' ? 'alert' : 'info')}</div><div class="grow"><div class="mid bold">${esc(text(l))}</div><div class="small muted">${esc(l.sourceName || l.source || '')} · ${DP.fmtTime(l.createdAt)}</div></div><span class="chip ${levelCls(l.level)}">${esc(l.level)}</span></div></div>`).join('') : DP.empty('暂无日志', 'file'));
    }
  };

  /* ==================== 环境管理 ==================== */
  pages.envs = {
    title: 'Docker 环境',
    async render(root) {
      root.innerHTML = DP.skeleton(3);
      const d = await DP.api('/common/env/get-list', { enableCertContent: false }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      root.innerHTML = `<div class="page-head"><div><h2>Docker 环境</h2><p>同时管理多台 Docker 主机</p></div>${DP.iconBtn('add', 'plus')}</div>` +
        (list.length ? list.map(e => `<div class="item-card" data-name="${esc(e.name)}"><div class="row"><div class="avatar-sm ${e.default ? 'green' : 'blue'}">${icon('server')}</div><div class="grow"><div class="title">${esc(e.name)} ${e.default ? '<span class="chip green">当前</span>' : ''}</div><div class="sub mono">${esc(e.address || '')}</div></div><span class="chip ${e.enable ? 'green' : ''}">${e.enable ? '已启用' : '已停用'}</span></div>
          <div class="action-row"><button class="action-btn" data-env="switch">${icon('check')}切换</button><button class="action-btn" data-env="stat">${icon('chart')}系统状态</button><button class="action-btn danger" data-env="del">${icon('trash')}删除</button></div></div>`).join('') : DP.empty('暂无环境', 'server'));
      const a = root.querySelector('[data-act="add"]'); if (a) a.onclick = () => this.create(root);
      DP.on(root, 'click', '[data-env]', async (e, t) => {
        e.stopPropagation(); const name = t.closest('.item-card').dataset.name, op = t.dataset.env;
        if (op === 'switch') await safe(async () => { await DP.api('/common/env/switch', { name }); DP.state.env = name; $('#env-name').textContent = name; DP.toast('已切换到 ' + name, 'ok'); DP.go('overview'); });
        if (op === 'del') return DP.confirm({ title: '删除环境', text: `确定删除环境 ${name}？`, danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/common/env/delete', { name: [name] })); DP.toast('已删除', 'ok'); pages.envs.render(root); } });
        if (op === 'stat') await safe(async () => {
          /* system-stat 只是采集开关；真实数据来自 get-stat-list（容器/主机）与 usage（磁盘），首次采样需数秒 */
          await DP.api('/common/env/system-stat', { enable: true }).catch(() => null);
          DP.sheet({ title: name + ' · 系统状态', body: `<div id="envstat-body"><div class="card"><div class="center small muted" style="padding:24px 0">正在采集系统状态，首次采样约需 6 秒…</div></div></div>`,
            actions: `<button class="btn ghost grow" data-act="cancel">关闭</button>` });
          $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
          const fmtPct = v => (v == null || isNaN(v)) ? null : Math.round(v * 10) / 10;
          let stat = null, disk = null, dockerDisk = 0;
          for (let i = 0; i < 3; i++) {
            stat = await DP.api('/common/home/get-stat-list', { follow: false }).catch(() => null);
            if (stat && ((stat.docker || []).length || stat.system)) break;
            await new Promise(r => setTimeout(r, 3300));
          }
          for (let i = 0; i < 3; i++) {
            const u = await DP.api('/common/home/usage', {}).catch(() => null);
            const du = (u && u.diskUsage) || {};
            if (du.system && du.system.total) { disk = du.system; dockerDisk = du.docker && du.docker.LayersSize || 0; break; }
            await new Promise(r => setTimeout(r, 3300));
          }
          const body = document.getElementById('envstat-body');
          if (!body) return;
          const containers = (stat && stat.docker) || [];
          const sys = (stat && stat.system) || null;
          const memUsed = containers.reduce((s, c) => s + ((c.memory && c.memory.in) || 0), 0);
          const memTotal = containers.reduce((s, c) => s + ((c.memory && c.memory.out) || 0), 0);
          const cpu = sys ? fmtPct(sys.cpu && sys.cpu.usagePercent) : null;
          const memPct = sys && sys.memory && sys.memory.total ? fmtPct((sys.memory.total - sys.memory.available) / sys.memory.total * 100)
            : memTotal ? fmtPct(memUsed / memTotal * 100) : 0;
          const diskPct = disk ? fmtPct(disk.used / disk.total * 100) : null;
          const load = sys && sys.cpu ? [sys.cpu.load1, sys.cpu.load5, sys.cpu.load15].map(v => v == null ? '—' : (Math.round(v * 100) / 100)).join(' / ') : null;
          body.innerHTML = `<div class="grid c2">
              <div class="card center"><div class="small muted">CPU 使用率</div><div style="margin:8px 0">${DP.donut(cpu || 0, 'var(--primary)', 78)}</div><div class="small muted">${cpu != null ? cpu + '%' : '暂无采样'}${sys && sys.cpu ? ' · ' + sys.cpu.cores + ' 核' : ''}</div></div>
              <div class="card center"><div class="small muted">内存使用率</div><div style="margin:8px 0">${DP.donut(memPct || 0, 'var(--purple)', 78)}</div><div class="small muted">${sys && sys.memory && sys.memory.total ? DP.fmtBytes(sys.memory.total - sys.memory.available) + ' / ' + DP.fmtBytes(sys.memory.total) : memTotal ? DP.fmtBytes(memUsed) + ' / ' + DP.fmtBytes(memTotal) + '（容器合计）' : '暂无采样'}</div></div>
            </div>
            <div class="card tight">
              <div class="row between"><span class="small muted">容器数量</span><span class="small bold">${containers.length}</span></div>
              ${load ? `<div class="row between" style="border-top:1px solid var(--line)"><span class="small muted">主机负载 (1/5/15min)</span><span class="small mono">${esc(load)}</span></div>` : ''}
              ${diskPct != null ? `<div class="row between" style="border-top:1px solid var(--line)"><span class="small muted">主机磁盘</span><span class="small bold">${diskPct}% · ${DP.fmtBytes(disk.used)} / ${DP.fmtBytes(disk.total)}</span></div>` : ''}
              ${dockerDisk ? `<div class="row between" style="border-top:1px solid var(--line)"><span class="small muted">Docker 占用（镜像+容器层）</span><span class="small bold">${DP.fmtBytes(dockerDisk)}</span></div>` : ''}
            </div>
            ${(!sys && !disk) ? '<p class="small muted center">该环境暂未上报主机级采样（需要 DPanel Agent 支持），以上为容器级聚合数据。</p>' : ''}`;
        });
      });
    },
    create(root) {
      DP.sheet({ title: '添加 Docker 环境',
        body: `<div class="form-field"><label>环境名称</label><input id="env-name" placeholder="my-nas"></div>
          <div class="form-field"><label>连接地址</label><input id="env-addr" placeholder="tcp://192.168.1.20:2375 或 ssh://user@host:22"></div>
          <p class="small muted">公网环境强烈建议启用 TLS，避免 Docker API 直接暴露。</p>`,
        actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">添加</button>` });
      $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
      $('[data-act="ok"]', $('#sheet-root')).onclick = async () => {
        const name = $('#env-name').value.trim(), address = $('#env-addr').value.trim();
        if (!name || !address) return DP.toast('请填写完整信息', 'err');
        await safe(async () => { await DP.api('/common/env/create', { name, address, check: true }); DP.closeSheet(); DP.toast('环境已添加', 'ok'); pages.envs.render(root); });
      };
    }
  };

  /* ==================== 快照 ==================== */
  pages.snapshots = {
    title: '容器快照',
    async render(root, params) {
      root.innerHTML = DP.skeleton(3);
      const d = await DP.api('/app/container-backup/get-list', { containerId: params && params.id || '', page: 1, pageSize: 30 }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      root.innerHTML = `<div class="page-head"><div><h2>容器快照</h2><p>全量备份、恢复与迁移</p></div>${DP.iconBtn('add', 'plus')}</div>` +
        (list.length ? list.map(b => `<div class="item-card"><div class="row"><div class="avatar-sm amber">${icon('download')}</div><div class="grow"><div class="title">${esc(b.name || b.containerId)}</div><div class="sub">${DP.fmtBytes(b.size)} · ${DP.fmtTime(b.createdAt)}</div></div></div>
          <div class="action-row"><button class="action-btn" data-snap="restore" data-id="${b.id}">${icon('restart')}恢复</button><button class="action-btn danger" data-snap="del" data-id="${b.id}">${icon('trash')}删除</button></div></div>`).join('') : DP.empty('暂无快照', 'download'));
      const a = root.querySelector('[data-act="add"]'); if (a) a.onclick = () => DP.prompt({ title: '创建快照', label: '容器 ID', value: params && params.id || '', onOk: async v => { await safe(() => DP.api('/app/container-backup/create', { id: v, enableBackupImage: true, enableBackupImageContainer: true, enableBackupVolume: true, backupVolumeList: [], description: '' })); DP.toast('快照任务已创建', 'ok'); } });
      DP.on(root, 'click', '[data-snap]', async (e, t) => {
        const id = t.dataset.id;
        if (t.dataset.snap === 'restore') return DP.confirm({ title: '恢复快照', text: '恢复会覆盖当前容器状态，确定继续？', danger: true, okText: '恢复', onOk: async () => { await safe(() => DP.api('/app/container-backup/restore', { id, enableForce: true, noStart: false })); DP.toast('恢复任务已提交', 'ok'); } });
        return DP.confirm({ title: '删除快照', text: '确定删除该快照？', danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/app/container-backup/delete', { id: [Number(id)] })); DP.toast('已删除', 'ok'); pages.snapshots.render(root, params); } });
      });
    }
  };

  /* ==================== 注册表 / 标签 / 域名 / 证书 ==================== */
  pages.registries = {
    title: '镜像仓库',
    async render(root) {
      const d = await DP.api('/common/registry/get-list', { title: '', serverAddress: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      root.innerHTML = `<div class="page-head"><div><h2>镜像仓库</h2><p>管理私有仓库凭据</p></div>${DP.iconBtn('add', 'plus')}</div>` +
        (list.length ? list.map(x => `<div class="item-card"><div class="row"><div class="avatar-sm blue">${icon('key')}</div><div class="grow"><div class="title">${esc(x.title)}</div><div class="sub mono">${esc(x.serverAddress)} · ${esc(x.username || '')}</div></div></div><div class="action-row"><button class="action-btn danger" data-del="${x.id}">${icon('trash')}删除</button></div></div>`).join('') : DP.empty('暂无仓库', 'key'));
      const a = root.querySelector('[data-act="add"]'); if (a) a.onclick = () => {
        DP.sheet({ title: '添加镜像仓库',
          body: `<div class="form-field"><label>名称</label><input id="rg-title"></div><div class="form-field"><label>仓库地址</label><input id="rg-addr" placeholder="registry.example.com"></div><div class="form-field"><label>用户名</label><input id="rg-user"></div><div class="form-field"><label>密码</label><input id="rg-pass" type="password"></div>`,
          actions: `<button class="btn ghost grow" data-act="cancel">取消</button><button class="btn primary grow" data-act="ok">保存</button>` });
        $('[data-act="cancel"]', $('#sheet-root')).onclick = DP.closeSheet;
        $('[data-act="ok"]', $('#sheet-root')).onclick = async () => { await safe(async () => { await DP.api('/common/registry/create', { id: 0, title: $('#rg-title').value, serverAddress: $('#rg-addr').value, username: $('#rg-user').value, password: $('#rg-pass').value }); DP.closeSheet(); DP.toast('已保存', 'ok'); pages.registries.render(root); }); };
      };
      DP.on(root, 'click', '[data-del]', async (e, t) => { DP.confirm({ title: '删除仓库', text: '确定删除？', danger: true, okText: '删除', onOk: async () => { await safe(() => DP.api('/common/registry/delete', { id: [Number(t.dataset.del)] })); DP.toast('已删除', 'ok'); pages.registries.render(root); } }); });
    }
  };

  pages.tags = {
    title: '标签分组',
    async render(root) {
      const d = await DP.api('/common/tag/get-list', { showCompose: true, showSwarm: true }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      /* 真实返回 accessor.Tag: {tag, tagColor, group, item: [{name, title, ...}]} */
      root.innerHTML = `<div class="page-head"><div><h2>标签分组</h2><p>按标签筛选与快捷访问</p></div>${DP.iconBtn('add', 'plus')}</div>` +
        (list.length ? list.map((t, ti) => `<div class="item-card"><div class="row"><div class="avatar-sm" style="background:${esc(t.tagColor || 'var(--primary-soft)')}22;color:${esc(t.tagColor || 'var(--primary)')}">${icon('filter')}</div><div class="grow"><div class="title">${esc(t.tag)}</div><div class="sub">${(t.item || []).length} 个关联项${t.group ? ' · ' + esc(t.group) : ''}</div></div><button class="btn ghost sm" data-del="${ti}">删除</button></div></div>`).join('') : DP.empty('暂无标签', 'filter'));
      const a = root.querySelector('[data-act="add"]'); if (a) a.onclick = () => DP.prompt({ title: '新建标签', label: '标签名称', onOk: async v => { await safe(() => DP.api('/common/tag/create', { tag: v, tagColor: '#5B5BD6', enableShowGroup: true })); DP.toast('已创建', 'ok'); pages.tags.render(root); } });
      /* 服务端 TagDelete 要求 name 必填（逐项删除），需按 item.name 逐条调用 */
      DP.on(root, 'click', '[data-del]', async (e, t) => {
        const tag = list[+t.dataset.del];
        if (!tag) return;
        const names = (tag.item || []).map(i => i.name).filter(Boolean);
        await safe(async () => {
          for (const n of names) await DP.api('/common/tag/delete', { name: n, tag: tag.tag });
          if (!names.length) await DP.api('/common/tag/delete', { name: tag.tag, tag: tag.tag });
          DP.toast('已删除', 'ok');
          pages.tags.render(root);
        });
      });
    }
  };

  pages.domains = {
    title: '域名与证书',
    async render(root) {
      root.innerHTML = DP.tabs([['domain', '域名绑定'], ['cert', 'SSL 证书']], DP.ui.domainTab || 'domain', 'domainTab') + DP.skeleton(2);
      const tab = DP.ui.domainTab || 'domain';
      const d = await DP.api(tab === 'domain' ? '/app/site-domain/get-list' : '/app/site-cert/get-list', { containerId: '', serverName: '', certName: '', name: '' }).catch(e => { DP.fail(e); return { list: [] }; });
      if (!document.body.contains(root)) return;
      const list = d.list || [];
      const rows = tab === 'domain' ? list.map(x => `<div class="item-card"><div class="row"><div class="avatar-sm blue">${icon('globe')}</div><div class="grow"><div class="title">${esc(x.serverName)}</div><div class="sub">容器 ${esc(x.containerID)} · 证书 ${esc(x.certName || '无')}</div></div><span class="chip green">已绑定</span></div></div>`).join('')
        : list.map(x => `<div class="item-card"><div class="row"><div class="avatar-sm green">${icon('shield')}</div><div class="grow"><div class="title">${esc(x.mainDomain)}</div><div class="sub">${(x.domains || []).join(', ')} · 到期 ${DP.fmtTime(x.expireAt)}</div></div><span class="chip green">有效</span></div></div>`).join('');
      root.innerHTML = DP.tabs([['domain', '域名绑定'], ['cert', 'SSL 证书']], tab, 'domainTab') + (rows || DP.empty('暂无数据', 'globe'));
      DP.bindTabs(root, () => pages.domains.render(root));
    }
  };

  /* ==================== 设置 ==================== */
  pages.settings = {
    title: '设置',
    async render(root) {
      root.innerHTML = `<div class="page-head"><div><h2>设置</h2><p>面板偏好与系统维护</p></div></div>
        <div class="card"><div class="card-head"><h3>外观</h3></div>
          <div class="switch-row"><span class="mid">深色模式</span><div class="switch ${DP.state.theme === 'dark' ? 'on' : ''}" id="set-dark"></div></div>
          <div class="switch-row"><span class="mid">跟随系统主题</span><div class="switch" id="set-follow"></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>连接</h3></div>
          <div class="row between" style="padding:9px 0"><span class="small muted">面板地址</span><span class="small mono">${esc(DP.state.baseUrl || '演示模式')}</span></div>
          <div class="row between" style="padding:9px 0"><span class="small muted">当前用户</span><span class="small bold">${esc(DP.state.user || '—')}</span></div>
          <div class="row between" style="padding:9px 0"><span class="small muted">Docker 环境</span><span class="small bold">${esc(DP.state.env || 'local')}</span></div>
          ${DP.state.demo ? '' : `<p class="small muted">若使用网页 / PWA 方式访问，请将本页地址加入 DPanel 的 <span class="mono">app.cors</span> 配置；Android 壳无需设置。</p>`}
        </div>
        <div class="card"><div class="card-head"><h3>系统维护</h3></div>
          ${[['check-update', 'sparkles', '检查更新'], ['panel-backup', 'download', '创建面板备份'], ['backup-list', 'file', '备份列表'], ['panel-usage', 'chart', '磁盘占用'], ['clear-cache', 'trash', '清理缓存']].map(([a, ic, t]) => `<button class="drawer-link" data-set="${a}">${icon(ic)}<span class="grow">${t}</span>${icon('chevron-right', 'sm')}</button>`).join('')}
        </div>
        <div class="card"><div class="card-head"><h3>关于</h3></div>
          <div class="small muted">DPanel Mobile v1.0 · 基于开源项目 donknap/dpanel 的 API 构建。<br>本项目与 DPanel 官方无关联。</div>
        </div>`;
      $('#set-dark', root).onclick = e => { const on = !e.currentTarget.classList.contains('on'); DP.toggle(e.currentTarget, on); DP.setTheme(on ? 'dark' : 'light'); };
      $('#set-follow', root).onclick = e => { const on = !e.currentTarget.classList.contains('on'); DP.toggle(e.currentTarget, on); if (on) { const dark = matchMedia('(prefers-color-scheme: dark)').matches; DP.setTheme(dark ? 'dark' : 'light'); $('#set-dark').classList.toggle('on', dark); } };
      DP.on(root, 'click', '[data-set]', async (e, t) => {
        const a = t.dataset.set;
        if (a === 'check-update') await safe(async () => { const d = await DP.api('/common/panel/check-new-version', {}); DP.sheet({ title: '检查更新', body: `<div class="card"><div class="mid bold">${esc(d.version || '已是最新版本')}</div><div class="small muted mt8">${esc(d.changelog || '当前已是最新版本。')}</div></div>`, actions: d.url ? `<a class="btn primary block" href="${esc(d.url)}" target="_blank" rel="noopener">查看发布说明</a>` : '' }); });
        if (a === 'panel-backup') await safe(async () => { await DP.api('/common/panel/backup', {}); DP.toast('备份任务已提交', 'ok'); });
        if (a === 'clear-cache') await safe(async () => { await DP.api('/common/setting/cache', { key: '', value: '', keep: false }); DP.toast('缓存已清理', 'ok'); });
        if (a === 'panel-usage') await safe(async () => { const d = await DP.api('/common/panel/usage', {}); DP.sheet({ title: '磁盘占用', body: `<div class="card tight"><div class="row between"><span class="small muted">Docker 总占用</span><span class="small bold">${DP.fmtBytes(d.size)}</span></div><div class="row between"><span class="small muted">备份占用</span><span class="small bold">${DP.fmtBytes(d.backupSize)}</span></div><div class="row between"><span class="small muted">存储卷</span><span class="small bold">${DP.fmtBytes(d.volumeSize)}</span></div></div>` }); });
        if (a === 'backup-list') await safe(async () => { const d = await DP.api('/common/panel/backup-list', {}); DP.sheet({ title: '备份列表', full: true, body: (d.list || []).length ? d.list.map(b => `<div class="item-card"><div class="row"><div class="avatar-sm blue">${icon('file')}</div><div class="grow"><div class="title mono">${esc(b.name)}</div><div class="sub">${DP.fmtBytes(b.size)} · ${DP.fmtTime(b.createdAt)}</div></div></div></div>`).join('') : DP.empty('暂无备份', 'file') }); });
      });
    }
  };

  /* ==================== 更多页面 ==================== */
  pages.more = {
    title: '更多功能',
    render(root) {
      const groups = [
        { title: '容器与编排', items: [['compose', 'code', 'Compose 编排'], ['swarm', 'cube', 'Swarm 集群'], ['snapshots', 'download', '容器快照'], ['domains', 'globe', '域名与证书']] },
        { title: '系统', items: [['envs', 'server', 'Docker 环境'], ['cron', 'clock', '计划任务'], ['registries', 'key', '镜像仓库'], ['tags', 'filter', '标签分组'], ['store', 'store', '应用商店'], ['syslog', 'file', '系统日志'], ['settings', 'gear', '设置']] }
      ];
      root.innerHTML = `<div class="page-head"><div><h2>更多功能</h2><p>完整管理能力</p></div></div>` +
        groups.map(g => `<div class="card"><div class="card-head"><h3>${g.title}</h3></div>${g.items.map(([go, ic, t]) => `<button class="drawer-link" data-go="${go}">${icon(ic)}<span class="grow">${t}</span>${icon('chevron-right', 'sm')}</button>`).join('')}</div>`).join('') +
        `<div class="card"><div class="card-head"><h3>服务器</h3></div><button class="drawer-link" data-go="login">${icon('logout')}<span class="grow">切换服务器 / 退出</span>${icon('chevron-right', 'sm')}</button></div>`;
      DP.on(root, 'click', '[data-go]', (e, t) => DP.go(t.dataset.go));
    }
  };
})(window);
