# 运行与部署

## 环境矩阵

| 方式 | 所需环境 | 操作 |
| --- | --- | --- |
| 预构建包 | Windows / macOS / Linux，Node.js 24 | node scripts/serve.mjs |
| 源码构建 | Node.js 24、npm、依赖下载网络 | npm ci，然后 npm run check |
| 静态托管 | 任意支持 HTML/JS/CSS 的服务 | 上传 dist 内全部文件 |
| Docker | Docker Engine / Desktop 与 Compose | docker compose up --build -d |

默认账号 admin，密码 123。启动后访问终端显示的地址。Windows 使用 start.cmd，macOS/Linux 使用 sh start.sh。无需数据库、业务后端或运行时 npm 依赖。不要直接双击 index.html；浏览器模块需要 HTTP(S) 服务。

## 监听与端口

默认 HOST=127.0.0.1、PORT=4318。允许外部设备访问时明确设置 HOST=0.0.0.0，并配置所在环境的网络规则。Node 静态服务只提供 dist，不能提供源码、配置或数据库。

PowerShell：

~~~powershell
$env:HOST='0.0.0.0'
$env:PORT='8080'
node scripts/serve.mjs
~~~

macOS/Linux：

~~~sh
HOST=0.0.0.0 PORT=8080 node scripts/serve.mjs
~~~

容器默认映射主机 4318 端口；如需其他端口，修改 compose.yaml 的映射左侧。面向公网托管时由平台或反向代理提供 HTTPS。当前固定体验账号不用于真实业务访问控制。

## 静态站点与子目录

构建使用相对资源路径和哈希路由。将 dist 整体上传至根目录或子目录，以目录结尾的 URL 访问。保留 assets 与 favicon.svg。无需把所有不存在的路径重写为 index.html；业务页面位于 # 之后。

## 配置

.env.example 给出可选接入字段，默认保持空值。VITE_HR_API_BASE_URL 在构建时嵌入页面，修改后必须重新构建。HR_API_PROXY_TARGET 仅供开发服务器使用，生产代理由托管环境设置。所有 VITE_ 变量都可被浏览器读取，不得放密钥。

## 数据留存与升级

当前数据按浏览器和站点隔离。迁移域名、端口或浏览器不会迁移编辑；员工与审计导出只用于阅读，不是完整可恢复备份。附件及其他编辑没有跨设备恢复机制。新版本部署前保留上一个 dist 和压缩包以便回退；本版未提供存储结构自动迁移。

## 排查

- 端口占用：更换 PORT。
- 缺少构建文件：源码工程先 npm ci 和 npm run build，或使用含 dist 的完整交付包。
- 构建失败：检查 Node.js 为 24，依赖与锁文件一致。
- 页面仍为旧版本：刷新并检查托管缓存；index.html 应使用不缓存或重新验证策略。
- 无法保存：检查站点存储权限和容量，使用更小简历文件。不要清除站点数据来尝试保留编辑。
- PDF 不显示：使用简历弹窗中的打开或下载入口。

GitHub Actions 提供三种操作系统的构建/数据/静态服务检查，以及 Linux 浏览器和容器检查。未实际执行的环境不能视为已验证。
