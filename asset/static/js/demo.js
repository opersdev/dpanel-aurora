/* DPanel Mobile — 演示模式数据（结构与真实 API 对齐） */
(function (w) {
  'use strict';
  const DP = w.DP;
  const now = Date.now();
  const iso = d => new Date(now - d * 1000).toISOString();
  const rnd = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  const series = (seed, base, amp) => Array.from({ length: 30 }, (_, i) => Math.round(base + Math.sin(i / 3 + seed) * amp + rnd(seed + i) * amp * .6));

  const containers = [
    { ID: 'a1b2c3d4e5f6', Names: ['/nginx-proxy'], Image: 'nginx:1.27-alpine', ImageID: 'sha256:aa11bb22cc33', State: 'running', Status: 'Up 12 days', Created: iso(1036800), Ports: [{ IP: '0.0.0.0', PrivatePort: 80, PublicPort: 80, Type: 'tcp' }, { IP: '0.0.0.0', PrivatePort: 443, PublicPort: 443, Type: 'tcp' }], Labels: { 'com.docker.compose.project': 'proxy', 'dpanel.group': 'web' }, SizeRw: 4821000, Mounts: [{ Type: 'bind', Source: '/home/nginx/conf', Destination: '/etc/nginx/conf.d' }], NetworkSettings: { Networks: { 'proxy-net': { IPAddress: '172.20.0.5' } } }, HostConfig: { RestartPolicy: { Name: 'always' } } },
    { ID: 'b2c3d4e5f6a7', Names: ['/mysql-prod'], Image: 'mysql:8.4', ImageID: 'sha256:bb22cc33dd44', State: 'running', Status: 'Up 12 days (healthy)', Created: iso(1036800), Ports: [{ IP: '0.0.0.0', PrivatePort: 3306, PublicPort: 3306, Type: 'tcp' }], Labels: { 'com.docker.compose.project': 'database' }, SizeRw: 348200000, Mounts: [{ Type: 'volume', Name: 'mysql_data', Destination: '/var/lib/mysql' }], NetworkSettings: { Networks: { 'app-net': { IPAddress: '172.21.0.3' } } }, HostConfig: { RestartPolicy: { Name: 'unless-stopped' } } },
    { ID: 'c3d4e5f6a7b8', Names: ['/redis-cache'], Image: 'redis:7.4-alpine', ImageID: 'sha256:cc33dd44ee55', State: 'running', Status: 'Up 3 days', Created: iso(259200), Ports: [{ IP: '127.0.0.1', PrivatePort: 6379, PublicPort: 6379, Type: 'tcp' }], Labels: {}, SizeRw: 1200000, Mounts: [], NetworkSettings: { Networks: { 'app-net': { IPAddress: '172.21.0.4' } } }, HostConfig: { RestartPolicy: { Name: 'always' } } },
    { ID: 'd4e5f6a7b8c9', Names: ['/home-assistant'], Image: 'ghcr.io/home-assistant/home-assistant:2026.11', ImageID: 'sha256:dd44ee55ff66', State: 'running', Status: 'Up 26 hours', Created: iso(93600), Ports: [{ IP: '0.0.0.0', PrivatePort: 8123, PublicPort: 8123, Type: 'tcp' }], Labels: { 'dpanel.group': 'home' }, SizeRw: 98200000, Mounts: [{ Type: 'bind', Source: '/home/hass/config', Destination: '/config' }], NetworkSettings: { Networks: { host: {} } }, HostConfig: { RestartPolicy: { Name: 'unless-stopped' } } },
    { ID: 'e5f6a7b8c9d0', Names: ['/nextcloud'], Image: 'nextcloud:31-apache', ImageID: 'sha256:ee55ff660011', State: 'exited', Status: 'Exited (0) 2 hours ago', Created: iso(604800), Ports: [{ IP: '0.0.0.0', PrivatePort: 8080, PublicPort: 8080, Type: 'tcp' }], Labels: { 'com.docker.compose.project': 'cloud' }, SizeRw: 512000000, Mounts: [{ Type: 'volume', Name: 'nextcloud_data', Destination: '/var/www/html/data' }], NetworkSettings: { Networks: { 'app-net': { IPAddress: '' } } }, HostConfig: { RestartPolicy: { Name: 'no' } } },
    { ID: 'f6a7b8c9d0e1', Names: ['/traefik'], Image: 'traefik:v3.4', ImageID: 'sha256:ff6600112233', State: 'running', Status: 'Up 12 days', Created: iso(1036800), Ports: [{ IP: '0.0.0.0', PrivatePort: 80, PublicPort: 8081, Type: 'tcp' }], Labels: { 'com.docker.compose.project': 'proxy' }, SizeRw: 3210000, Mounts: [{ Type: 'bind', Source: '/home/traefik', Destination: '/etc/traefik' }], NetworkSettings: { Networks: { 'proxy-net': { IPAddress: '172.20.0.2' } } }, HostConfig: { RestartPolicy: { Name: 'always' } } },
    { ID: 'a7b8c9d0e1f2', Names: ['/code-server'], Image: 'lscr.io/linuxserver/code-server:latest', ImageID: 'sha256:001122334455', State: 'paused', Status: 'Paused 6 hours ago', Created: iso(86400), Ports: [{ IP: '0.0.0.0', PrivatePort: 8443, PublicPort: 8443, Type: 'tcp' }], Labels: { 'dpanel.group': 'dev' }, SizeRw: 76300000, Mounts: [{ Type: 'bind', Source: '/home/code/config', Destination: '/config' }], NetworkSettings: { Networks: { 'app-net': { IPAddress: '172.21.0.9' } } }, HostConfig: { RestartPolicy: { Name: 'no' } } },
    { ID: 'b8c9d0e1f2a3', Names: ['/dpanel'], Image: 'dpanel/dpanel:latest', ImageID: 'sha256:112233445566', State: 'running', Status: 'Up 12 days', Created: iso(1036800), Ports: [{ IP: '0.0.0.0', PrivatePort: 8080, PublicPort: 8807, Type: 'tcp' }], Labels: { 'dpanel.self': 'true' }, SizeRw: 21400000, Mounts: [{ Type: 'bind', Source: '/var/run/docker.sock', Destination: '/var/run/docker.sock' }], NetworkSettings: { Networks: { bridge: { IPAddress: '172.17.0.8' } } }, HostConfig: { RestartPolicy: { Name: 'always' } } }
  ];

  const images = [
    { ID: 'sha256:aa11bb22cc33', RepoTags: ['nginx:1.27-alpine'], RepoDigests: ['nginx@sha256:abc'], Created: iso(1296000), Size: 52800000, Containers: 1, Labels: {} },
    { ID: 'sha256:bb22cc33dd44', RepoTags: ['mysql:8.4'], RepoDigests: ['mysql@sha256:def'], Created: iso(1296000), Size: 599000000, Containers: 1, Labels: {} },
    { ID: 'sha256:cc33dd44ee55', RepoTags: ['redis:7.4-alpine'], RepoDigests: [], Created: iso(864000), Size: 47200000, Containers: 1, Labels: {} },
    { ID: 'sha256:dd44ee55ff66', RepoTags: ['ghcr.io/home-assistant/home-assistant:2026.11'], RepoDigests: [], Created: iso(172800), Size: 1280000000, Containers: 1, Labels: {} },
    { ID: 'sha256:ee55ff660011', RepoTags: ['nextcloud:31-apache'], RepoDigests: [], Created: iso(691200), Size: 1080000000, Containers: 1, Labels: {} },
    { ID: 'sha256:ff6600112233', RepoTags: ['traefik:v3.4'], RepoDigests: [], Created: iso(1296000), Size: 126000000, Containers: 1, Labels: {} },
    { ID: 'sha256:001122334455', RepoTags: ['lscr.io/linuxserver/code-server:latest'], RepoDigests: [], Created: iso(172800), Size: 784000000, Containers: 1, Labels: {} },
    { ID: 'sha256:112233445566', RepoTags: ['dpanel/dpanel:latest'], RepoDigests: [], Created: iso(1296000), Size: 162000000, Containers: 1, Labels: {} },
    { ID: 'sha256:223344556677', RepoTags: ['alpine:3.21'], RepoDigests: [], Created: iso(2592000), Size: 8400000, Containers: 0, Labels: {} },
    { ID: 'sha256:334455667788', RepoTags: ['<none>:<none>'], RepoDigests: [], Created: iso(3456000), Size: 356000000, Containers: 0, Labels: {} }
  ];

  const networks = [
    { Name: 'bridge', Id: 'n1', Driver: 'bridge', Scope: 'local', Created: iso(2592000), IPAM: { Config: [{ Subnet: '172.17.0.0/16', Gateway: '172.17.0.1' }] }, Containers: { 'b8c9d0e1f2a3': { Name: 'dpanel', IPv4Address: '172.17.0.8/16' } } },
    { Name: 'host', Id: 'n2', Driver: 'host', Scope: 'local', Created: iso(2592000), IPAM: { Config: [] }, Containers: {} },
    { Name: 'none', Id: 'n3', Driver: 'null', Scope: 'local', Created: iso(2592000), IPAM: { Config: [] }, Containers: {} },
    { Name: 'proxy-net', Id: 'n4', Driver: 'bridge', Scope: 'local', Created: iso(1036800), IPAM: { Config: [{ Subnet: '172.20.0.0/16', Gateway: '172.20.0.1' }] }, Containers: { a1b2c3d4e5f6: { Name: 'nginx-proxy', IPv4Address: '172.20.0.5/16' }, f6a7b8c9d0e1: { Name: 'traefik', IPv4Address: '172.20.0.2/16' } } },
    { Name: 'app-net', Id: 'n5', Driver: 'bridge', Scope: 'local', Created: iso(1036800), IPAM: { Config: [{ Subnet: '172.21.0.0/16', Gateway: '172.21.0.1' }] }, Containers: { b2c3d4e5f6a7: { Name: 'mysql-prod', IPv4Address: '172.21.0.3/16' }, c3d4e5f6a7b8: { Name: 'redis-cache', IPv4Address: '172.21.0.4/16' } } }
  ];

  const volumes = [
    { Name: 'mysql_data', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/mysql_data/_data', CreatedAt: iso(1036800), UsageData: { Size: 348200000, RefCount: 1 }, Labels: {} },
    { Name: 'nextcloud_data', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/nextcloud_data/_data', CreatedAt: iso(604800), UsageData: { Size: 512000000, RefCount: 1 }, Labels: {} },
    { Name: 'traefik_certs', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/traefik_certs/_data', CreatedAt: iso(1036800), UsageData: { Size: 1820000, RefCount: 1 }, Labels: {} },
    { Name: 'unused_cache', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/unused_cache/_data', CreatedAt: iso(2592000), UsageData: { Size: 9200000, RefCount: 0 }, Labels: {} }
  ];

  const compose = [
    { id: 1, name: 'proxy', title: '反向代理套件', setting: { type: 'local', status: 'running(2)', dockerEnvName: 'local' }, yaml: 'services:\n  nginx:\n    image: nginx:1.27-alpine\n    ports:\n      - "80:80"\n      - "443:443"\n    restart: always\n' },
    { id: 2, name: 'database', title: '数据库服务', setting: { type: 'local', status: 'running(2)', dockerEnvName: 'local' }, yaml: 'services:\n  mysql:\n    image: mysql:8.4\n    environment:\n      MYSQL_ROOT_PASSWORD: ******\n    volumes:\n      - mysql_data:/var/lib/mysql\n' },
    { id: 3, name: 'cloud', title: '私有云盘', setting: { type: 'outPath', status: 'waiting', dockerEnvName: 'local' }, yaml: 'services:\n  nextcloud:\n    image: nextcloud:31-apache\n    ports:\n      - "8080:80"\n' }
  ];
  /* 真实 get-list 的容器列表在顶层，按 project 字段分组 */
  const composeContainers = [
    { name: '/nginx-proxy', project: 'proxy', service: 'nginx', state: 'running', status: 'Up 3 days', publishers: [] },
    { name: '/traefik', project: 'proxy', service: 'traefik', state: 'running', status: 'Up 3 days', publishers: [{ publishedPort: 80, targetPort: 80, protocol: 'tcp' }] },
    { name: '/mysql-prod', project: 'database', service: 'mysql', state: 'running', status: 'Up 7 days', publishers: [] },
    { name: '/redis-cache', project: 'database', service: 'redis', state: 'running', status: 'Up 7 days', publishers: [] }
  ];

  const files = {
    '/': [
      { name: 'home', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(86400) },
      { name: 'etc', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) },
      { name: 'var', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) },
      { name: 'docker-compose.yml', type: 'file', size: 2841, mode: '-rw-r--r--', modTime: iso(3600) },
      { name: 'readme.md', type: 'file', size: 826, mode: '-rw-r--r--', modTime: iso(7200) }
    ],
    '/home': [
      { name: 'nginx', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(3600) },
      { name: 'hass', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(93600) },
      { name: 'code', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(86400) },
      { name: '.bashrc', type: 'file', size: 3771, mode: '-rw-r--r--', modTime: iso(2592000) }
    ],
    '/home/nginx': [
      { name: 'conf.d', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(3600) },
      { name: 'nginx.conf', type: 'file', size: 1164, mode: '-rw-r--r--', modTime: iso(3600) },
      { name: 'access.log', type: 'file', size: 2836102, mode: '-rw-r--r--', modTime: iso(60) }
    ],
    '/home/nginx/conf.d': [
      { name: 'default.conf', type: 'file', size: 942, mode: '-rw-r--r--', modTime: iso(3600) },
      { name: 'dpanel.conf', type: 'file', size: 618, mode: '-rw-r--r--', modTime: iso(7200) }
    ],
    '/etc': [
      { name: 'nginx', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) },
      { name: 'docker', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(86400) },
      { name: 'hosts', type: 'file', size: 231, mode: '-rw-r--r--', modTime: iso(2592000) }
    ],
    '/var': [
      { name: 'lib', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) },
      { name: 'log', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(3600) }
    ],
    '/home/hass': [{ name: 'configuration.yaml', type: 'file', size: 2048, mode: '-rw-r--r--', modTime: iso(93600) }],
    '/home/code': [{ name: 'config', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(86400) }],
    '/home/code/config': [{ name: 'settings.json', type: 'file', size: 512, mode: '-rw-r--r--', modTime: iso(86400) }],
    '/etc/nginx': [{ name: 'nginx.conf', type: 'file', size: 2335, mode: '-rw-r--r--', modTime: iso(172800) }],
    '/etc/docker': [{ name: 'daemon.json', type: 'file', size: 412, mode: '-rw-r--r--', modTime: iso(86400) }],
    '/var/lib': [{ name: 'docker', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) }],
    '/var/lib/docker': [{ name: 'volumes', type: 'dir', size: 0, mode: 'drwxr-xr-x', modTime: iso(172800) }],
    '/var/log': [{ name: 'syslog', type: 'file', size: 98122, mode: '-rw-r-----', modTime: iso(3600) }]
  };

  const notices = [
    { id: 12, title: '容器镜像有可用更新', content: 'nginx:1.27-alpine 已发布新版本，可一键升级。', type: 'upgrade', createdAt: iso(600), read: false },
    { id: 11, title: '计划任务执行完成', content: '「每日数据库备份」已成功完成，耗时 42 秒。', type: 'cron', createdAt: iso(3600), read: false },
    { id: 10, title: '容器状态异常', content: 'nextcloud 于 2 小时前意外退出 (exit 0)。', type: 'alert', createdAt: iso(7200), read: true },
    { id: 9, title: '面板登录', content: 'admin 从 192.168.1.32 登录成功。', type: 'user', createdAt: iso(86400), read: true }
  ];

  const cronList = [
    { id: 1, title: '每日数据库备份', setting: { triggerType: 'cron', spec: '0 3 * * *', disable: false }, lastRunAt: iso(3600), status: 'success' },
    { id: 2, title: '容器镜像更新检查', setting: { triggerType: 'cron', spec: '0 */6 * * *', disable: false }, lastRunAt: iso(7200), status: 'success' },
    { id: 3, title: '清理无用镜像', setting: { triggerType: 'cron', spec: '0 4 * * 0', disable: true }, lastRunAt: iso(604800), status: 'skip' }
  ];

  const storeApps = [
    { id: 1, title: 'DPanel 官方商店', name: 'dpanel-official', setting: { type: 'git', url: 'https://github.com/donknap/dpanel-store', total: 6, apps: [
      { name: 'nginx-proxy-manager', title: 'Nginx Proxy Manager', description: '带 Web 界面的反向代理管理工具', tag: ['网络'], version: { '2.12.3': { name: '2.12.3', default: true } } },
      { name: 'postgresql', title: 'PostgreSQL', description: '强大的开源关系型数据库', tag: ['数据库'], version: { '17.4': { name: '17.4', default: true } } },
      { name: 'gitea', title: 'Gitea', description: '轻量级自托管 Git 服务', tag: ['开发工具'], version: { '1.24': { name: '1.24', default: true } } },
      { name: 'jellyfin', title: 'Jellyfin', description: '自由开放的媒体服务器', tag: ['影音'], version: { '10.11': { name: '10.11', default: true } } },
      { name: 'grafana', title: 'Grafana', description: '可视化监控与仪表盘平台', tag: ['监控'], version: { '12.2': { name: '12.2', default: true } } },
      { name: 'minio', title: 'MinIO', description: '高性能对象存储', tag: ['存储'], version: { 'RELEASE.2026': { name: 'RELEASE.2026', default: true } } }
    ] } }
  ];

  const envs = [
    { name: 'local', address: 'unix:///var/run/docker.sock', enable: true, default: true, enableSystemStat: true },
    { name: 'nas-02', address: 'ssh://root@192.168.1.20:22', enable: true, default: false, enableSystemStat: true },
    { name: 'cloud-01', address: 'tcp://47.98.1.8:2376', enable: true, default: false, enableSystemStat: false }
  ];

  const demo = {
    containers, images, networks, volumes, compose, files, notices, cronList, storeApps, envs,
    stat: {
      cpu: series(1, 18, 12), mem: series(2, 62, 8), netIn: series(3, 24, 18), netOut: series(4, 12, 9),
      containerStat: containers.filter(c => c.State === 'running').map((c, i) => ({ name: DP.name(c), container: c.Id || c.ID || '', cpu: 2 + i * 3, memory: { in: (80 + i * 60) * 1024 * 1024, out: 1024 * 1024 * 1024 }, networkIO: { in: i * 120 * 1024, out: i * 60 * 1024 }, blockIO: { in: 0, out: 0 } }))
    }
  };
  DP.demoData = demo;
  demo.composeContainers = composeContainers;

  const logLines = [
    '2026/11/19 19:58:01 [notice] 1#1: using the "epoll" event method',
    '2026/11/19 19:58:01 [notice] 1#1: nginx/1.27.4',
    '2026/11/19 20:01:22 [info] 8#8: *12 client 192.168.1.32 closed keepalive connection',
    '2026/11/19 20:03:45 [warn] 9#9: *31 an upstream response is buffered to a temporary file',
    '2026/11/19 20:05:10 [info] 7#7: *44 client requested: GET /api/health HTTP/1.1',
    '2026/11/19 20:05:10 [info] 7#7: *44 upstream response status: 200',
    '2026/11/19 20:07:33 [notice] 1#1: signal 1 (SIGHUP) received from 45, reconfiguring',
    '2026/11/19 20:07:33 [notice] 1#1: reconfiguration complete'
  ];

  DP.demoData.logLines = logLines;
  function findC(p) { return demo.containers.find(c => c.ID === p.md5 || c.ID === p.id || DP.name(c) === p.id); }

  DP.demoApi = async function (path, p) {
    // 模拟少量网络延迟，让加载态可见
    await new Promise(r => setTimeout(r, 140 + Math.random() * 120));
    const D = demo;
    switch (path) {
      case '/common/user/login':
        if (p.username === 'wrong') throw new Error('用户名或密码错误');
        return { accessToken: 'demo-token', redirect: '/home/overview' };
      case '/common/user/login-info': return { showRegister: false, appName: 'dpanel', family: 'ce', feature: ['ce'], theme: {} };
      case '/common/user/get-user-info': return {
        user: { username: p.username || 'admin', name: 'admin' },
        feature: ['ce', 'standard', 'docker-local'], theme: {}, locale: ['zh-CN'], menu: []
      };
      case '/common/home/info': return {
        info: { ID: 'DEMO-HOST-001', Name: 'local - unix:///var/run/docker.sock', ServerVersion: '28.4.0', OperatingSystem: 'Debian GNU/Linux 12', Architecture: 'x86_64', NCPU: 8, MemTotal: 16 * 1024 * 1024 * 1024, DockerRootDir: '/var/lib/docker', Containers: 8, ContainersRunning: 6, ContainersPaused: 1, ContainersStopped: 1, Images: 10, SystemTime: new Date().toISOString(), KernelVersion: '6.8.0-45-generic' },
        clientVersion: '1.51', sdkVersion: '1.51',
        dpanel: { version: 'v1.12.0', runIn: 'container', updateAvailable: true, latestVersion: 'v1.12.1' },
        dockerEnv: D.envs[0]
      };
      case '/common/home/usage': return {
        diskUsage: {
          dockerEnvName: 'local',
          docker: { LayersSize: 3180000000, Images: 10, Containers: 8, Volumes: 4, BuildCache: 0 },
          system: { total: 512000000000, used: 218000000000, available: 294000000000 },
          updatedAt: new Date().toISOString()
        }
      };
      case '/common/home/get-stat-list': return { dockerEnvName: 'local', docker: D.stat.containerStat, system: { cpu: D.stat.cpu.at(-1), memory: D.stat.mem.at(-1) } };
      case '/common/notice/unread': return { count: D.notices.filter(n => !n.read).length };
      case '/common/notice/get-list': return { list: D.notices, total: D.notices.length, page: p.page || 1, pageSize: p.pageSize || 20 };
      case '/common/notice/delete': D.notices = D.notices.filter(n => String(n.id) !== String(p.id)); return 'success';
      case '/common/log/get-list': return { list: [
        { id: '1', level: 'info', source: 'panel', sourceName: '面板', description: '面板启动完成', createdAt: Math.floor(now/1000) - 300 },
        { id: '2', level: 'warning', source: 'docker', sourceName: 'Docker', description: '容器 nextcloud 已退出', createdAt: Math.floor(now/1000) - 7200 },
        { id: '3', level: 'info', source: 'user', sourceName: '用户', description: 'admin 登录成功', createdAt: Math.floor(now/1000) - 86400 },
        { id: '4', level: 'error', source: 'system', sourceName: '系统', description: '获取远程环境 nas-02 统计超时', createdAt: Math.floor(now/1000) - 172800 }
      ], total: 4 };
      case '/common/env/get-list': return { list: D.envs };
      case '/common/env/switch': D.envs.forEach(e => e.default = e.name === p.name); DP.state.env = p.name; return 'success';
      case '/common/env/get-detail': return D.envs.find(e => e.name === p.name) || D.envs[0];
      case '/common/env/system-stat': return { cpu: D.stat.cpu.at(-1), memory: D.stat.mem.at(-1), disk: 43, uptime: '12 天 4 小时', load: '0.42, 0.58, 0.71' };
      case '/common/env/create': D.envs.push({ name: p.name || 'new-env', address: p.address || '', enable: true }); return 'success';
      case '/common/env/delete': D.envs = D.envs.filter(e => e.name !== p.name); return 'success';

      case '/app/container/get-list': return {
        list: D.containers,
        siteList: [{ id: 1, siteTitle: 'Nginx 代理', siteName: 'nginx-proxy', containerInfo: { Id: 'a1b2c3d4e5f6' } }],
        domainList: [{ id: 1, containerID: 'nginx-proxy', serverName: 'dpanel.cc' }]
      };
      case '/app/container/get-detail': {
        const c = findC(p); if (!c) throw new Error('容器不存在');
        return { info: { ...c, Config: { Image: c.Image, Labels: c.Labels, Env: ['PATH=/usr/local/sbin:/usr/local/bin', 'TZ=Asia/Shanghai'], Cmd: [] }, State: { Status: c.State, Running: c.State === 'running', ExitCode: c.State === 'exited' ? 0 : 0, StartedAt: iso(1036800) } }, domain: [] };
      }
      case '/app/container/status': {
        const c = findC(p); if (c) c.State = p.operate === 'stop' ? 'exited' : p.operate === 'pause' ? 'paused' : 'running';
        return 'success';
      }
      case '/app/container/update': { const c = findC(p); if (c && p.name) c.Names = [p.name]; return 'success'; }
      case '/app/container/delete': D.containers = D.containers.filter(c => c !== findC(p)); return { md5: p.md5 };
      case '/app/container/copy': { const c = findC(p); if (c) D.containers.push({ ...c, ID: Math.random().toString(16).slice(2, 14), Names: ['/' + p.copyName] }); return { containerId: 'new-container' }; }
      case '/app/container/commit': return { name: p.name || 'committed-image:latest' };
      case '/app/container/get-stat-info': return { id: p.id, cpu: 3.2 + Math.random() * 5, memory: 128 + Math.random() * 90, memoryLimit: 1024, networkIn: 1200, networkOut: 640, cpuSeries: series(5, 8, 5), memSeries: series(6, 40, 12) };
      case '/app/container/get-process-info': return { list: [{ PID: 1, User: 'root', CPU: 0.2, Memory: 12.4, Command: '/docker-entrypoint.sh nginx -g daemon off;' }, { PID: 8, User: 'www-data', CPU: 0.1, Memory: 6.2, Command: 'nginx: worker process' }] };
      case '/app/container/check-port': return { enable: true, portList: [] };
      case '/app/log/run': return { log: logLines.slice(-Math.min(p.lineTotal || 50, logLines.length)).join('\n') };
      case '/app/container-upgrade/get-list': return { list: D.containers.slice(0, 4).map((c, i) => ({ md5: c.ID, name: DP.name(c), currentImage: c.Image, latestImage: c.Image.replace(/:\d.*/, ':latest'), hasUpdate: i < 2 })) };
      case '/app/container-upgrade/check': return { list: D.containers.slice(0, 3).map(c => ({ md5: c.ID, name: DP.name(c), hasUpdate: true, latestImage: c.Image })) };
      case '/app/container-backup/get-list': return { list: [{ id: 1, containerId: 'a1b2c3d4e5f6', name: 'nginx-proxy', createdAt: iso(86400), size: 4821000 }], total: 1 };

      case '/app/image/get-list': return { list: D.images };
      case '/app/image/get-detail': return { info: D.images.find(i => i.ID === p.md5 || String(i.ID).includes(p.md5)) || D.images[0], layer: [{ created: iso(1296000), size: 52800000, instruction: 'COPY /docker-entrypoint.d/ /docker-entrypoint.d/' }, { created: iso(1296000), size: 31000000, instruction: 'RUN apk add --no-cache curl' }] };
      case '/app/image/delete': D.images = D.images.filter(i => !((Array.isArray(p.md5) ? p.md5 : [p.md5]).includes(i.ID))); return 'success';
      case '/app/image/prune': return { deleted: 2, reclaimed: 356000000 };
      case '/app/image/tag-search': return { list: ['1.27-alpine', '1.27', '1.26-alpine', 'latest', 'stable-alpine'].filter(x => !p.keyword || x.includes(p.keyword)).map(tag => ({ name: 'nginx:' + tag, size: 52800000, lastUpdated: iso(86400) })) };
      case '/app/image/tag-add': return 'success';
      case '/app/image/tag-sync': return { list: ['1.27-alpine', '1.27', 'latest'] };
      case '/app/image-build/get-list': return { list: [{ id: 1, title: '我的 Alpine 镜像', name: 'my-alpine:latest', status: 'success', createdAt: iso(86400) }] };

      case '/app/network/get-list': return { list: D.networks };
      case '/app/network/get-detail': return D.networks.find(n => n.Name === p.name) || D.networks[0];
      case '/app/network/create': D.networks.push({ Name: p.name, Id: 'n' + (D.networks.length + 1), Driver: p.driver || 'bridge', Scope: 'local', Created: new Date().toISOString(), IPAM: { Config: p.ipSubnet ? [{ Subnet: p.ipSubnet, Gateway: p.ipGateway }] : [] }, Containers: {} }); return 'success';
      case '/app/network/delete': D.networks = D.networks.filter(n => n.Name !== p.name); return 'success';
      case '/app/network/connect': case '/app/network/disconnect': return 'success';
      case '/app/volume/get-list': return { list: D.volumes };
      case '/app/volume/get-detail': return D.volumes.find(v => v.Name === p.name) || D.volumes[0];
      case '/app/volume/create': D.volumes.push({ Name: p.name, Driver: 'local', Mountpoint: '/var/lib/docker/volumes/' + p.name + '/_data', CreatedAt: new Date().toISOString(), UsageData: { Size: 0, RefCount: 0 }, Labels: {} }); return 'success';
      case '/app/volume/delete': D.volumes = D.volumes.filter(v => v.Name !== p.name); return 'success';

      case '/app/compose/get-list': return { list: D.compose, containerList: D.composeContainers };
      case '/app/compose/get-detail': {
        const c = D.compose.find(x => String(x.id) === String(p.id) || x.name === p.name) || D.compose[0];
        return { yaml: [c.yaml || '', ''], detail: { id: c.id, name: c.name, title: c.title, setting: c.setting }, project: {}, containerList: (D.composeContainers || []).filter(cc => cc.project === c.name), error: '' };
      }
      case '/app/compose/create': {
        const found = D.compose.find(x => String(x.id) === String(p.id));
        if (found) { found.title = p.title || found.title; found.yaml = p.yaml || found.yaml; if (p.yamlOverride) found.override = p.yamlOverride; }
        else D.compose.push({ id: D.compose.length + 1, name: p.name || 'new-project', title: p.title || p.name, setting: { type: p.type || 'local', status: 'created', dockerEnvName: 'local' }, yaml: p.yaml || '', containerList: [] });
        return 'success';
      }
      case '/app/compose/container-deploy': { const c = D.compose.find(x => String(x.id) === String(p.id)); if (c) c.setting.status = 'running(2)'; return 'success'; }
      case '/app/compose/container-destroy': { const c = D.compose.find(x => String(x.id) === String(p.id)); if (c) c.setting.status = 'waiting'; return 'success'; }
      case '/app/compose/container-ctrl': { const c = D.compose.find(x => String(x.id) === String(p.id)); if (c) c.setting.status = p.op === 'start' ? 'running(2)' : 'waiting'; return 'success'; }
      case '/app/compose/get-from-uri': return { yaml: 'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n' };
      case '/app/compose/download': return 'success';

      case '/app/swarm/info': return { swarm: { NodeID: 'demo-node', ControlAvailable: true, Cluster: { ID: 'cluster-demo', Spec: { Name: 'demo-swarm' }, Nodes: 3, Managers: 1 } }, unlocked: true };
      case '/app/swarm/node-list': return { list: [{ ID: 'n1', Hostname: 'node-1', Role: 'manager', Status: { State: 'ready' }, Availability: 'active' }, { ID: 'n2', Hostname: 'node-2', Role: 'worker', Status: { State: 'ready' }, Availability: 'active' }, { ID: 'n3', Hostname: 'node-3', Role: 'worker', Status: { State: 'down' }, Availability: 'pause' }] };
      case '/app/swarm/service-list': return { list: [{ ID: 's1', Spec: { Name: 'web' }, SpecVersion: { Index: 12 }, Endpoint: { Ports: [{ PublishedPort: 80 }] } }, { ID: 's2', Spec: { Name: 'api' }, SpecVersion: { Index: 8 }, Endpoint: { Ports: [{ PublishedPort: 8080 }] } }] };
      case '/app/swarm/task-list': return { list: [{ ID: 't1', ServiceName: 'web', Status: { State: 'running' }, NodeID: 'n1' }, { ID: 't2', ServiceName: 'api', Status: { State: 'running' }, NodeID: 'n2' }] };
      case '/app/swarm/init': return 'success';

      case '/common/explorer/get-path-list': return { list: D.files[p.path || '/'] || [], mountPoint: p.mountPoint || 'local' };
      case '/common/explorer/get-content': return { content: '# 示例文件\n\n这是演示模式下的文件内容预览。\n\n- 支持文本与配置文件查看\n- 可直接在手机上编辑并保存\n' };
      case '/common/explorer/mkdir': return 'success';
      case '/common/explorer/delete': return 'success';
      case '/common/explorer/copy': return 'success';
      case '/common/explorer/import-file-content': return 'success';
      case '/common/explorer/get-path-size': return { size: 1284000000, files: 42, dirs: 8 };
      case '/common/explorer/get-user-list': return { list: [{ uid: 0, name: 'root' }, { uid: 1000, name: 'admin' }] };

      case '/common/store/get-list': return { list: D.storeApps };
      case '/common/store/get-app-detail': {
        const s = D.storeApps.find(x => String(x.id) === String(p.storeId)) || D.storeApps[0];
        const a = ((s.setting && s.setting.apps) || []).find(x => x.name === p.appName) || {};
        return { detail: { title: a.title || a.name, setting: { type: 'store', environment: [] } }, yaml: 'services:\n  app:\n    image: ' + (p.appName || 'app') + ':' + (p.version || 'latest') + '\n' };
      }
      case '/common/store/deploy': case '/common/store/sync': case '/common/store/check-update': return 'success';
      case '/common/cron/get-list': return { list: D.cronList };
      case '/common/cron/get-detail': return D.cronList.find(c => String(c.id) === String(p.id)) || D.cronList[0];
      case '/common/cron/get-log-list': return { list: [{ id: 1, createdAt: iso(3600), status: 'success', message: '任务执行成功，耗时 42s' }, { id: 2, createdAt: iso(86400), status: 'success', message: '任务执行成功，耗时 38s' }], total: 2 };
      case '/common/cron/run-once': return 'success';
      case '/common/cron/template': return { list: [{ title: '备份容器', spec: '0 3 * * *' }, { title: '清理日志', spec: '0 4 * * 0' }] };
      case '/common/setting/get-setting': return { groupName: p.groupName, name: p.name, value: { enable: true, theme: 'system', locale: 'zh-CN' } };
      case '/common/setting/save-config': return 'success';
      case '/common/setting/get-login-setting': return { systemEntrance: '', twoFa: { enable: false } };
      case '/common/panel/usage': return { size: 3180000000, backupSize: 248000000, volumeSize: 872000000 };
      case '/common/panel/check-new-version': return { version: 'v1.12.1', changelog: '修复若干问题；优化容器状态排序；新增批量更新跳过功能。', url: 'https://github.com/donknap/dpanel/releases' };
      case '/common/panel/backup-list': return { list: [{ name: 'backup-2026-11-18.tar.gz', size: 248000000, createdAt: iso(86400) }, { name: 'backup-2026-11-11.tar.gz', size: 231000000, createdAt: iso(691200) }] };
      case '/common/panel/backup': case '/common/panel/update': return 'success';
      case '/common/registry/get-list': return { list: [{ id: 1, title: 'Docker Hub', serverAddress: 'docker.io', username: 'admin' }, { id: 2, title: '阿里云个人版', serverAddress: 'registry.cn-hangzhou.aliyuncs.com', username: 'user' }] };
      case '/common/tag/get-list': return { list: [{ tag: 'web', tagColor: '#5B5BD6', count: 3 }, { tag: 'database', tagColor: '#0EA5A5', count: 2 }, { tag: 'home', tagColor: '#E08A00', count: 1 }, { tag: 'dev', tagColor: '#8B5CF6', count: 1 }] };
      case '/app/site/get-list': return { list: [{ id: 1, siteTitle: '我的博客', siteName: 'blog', status: 'running' }, { id: 2, siteTitle: 'API 服务', siteName: 'api', status: 'stopped' }] };
      case '/app/site-domain/get-list': return { list: [{ id: 1, containerID: 'nginx-proxy', serverName: 'dpanel.cc', certName: 'dpanel.cc' }] };
      case '/app/site-cert/get-list': return { list: [{ id: 1, mainDomain: 'dpanel.cc', domains: ['dpanel.cc', 'www.dpanel.cc'], expireAt: iso(7776000) }] };
      default:
        console.warn('[demo] 未处理的接口:', path, p);
        return 'success';
    }
  };

  DP.demoWs = function (obj) {
    if (obj && obj.type === '/console/container/demo') setTimeout(() => DP.emitWs('/console/container/demo', '$ demo-container ~ # '), 300);
  };
})(window);
