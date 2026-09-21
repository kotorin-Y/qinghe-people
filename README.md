# 青禾 People

面向 HR 的人才与组织工作台，版本 1.0.0。包含员工、组织编制、招聘简历、入转调离、待办审批、绩效、人力分析与操作审计。

## 快速运行

交付压缩包包含预构建 dist，安装 Node.js 24 后，无需安装依赖即可运行：

~~~sh
node scripts/serve.mjs
~~~

访问终端显示的地址。Windows 可双击 start.cmd；macOS / Linux 可执行 sh start.sh。默认端口 4318，默认仅监听回环地址。登录账号 admin，密码 123。

从源码获取的工程需要先构建：

~~~sh
npm ci
npm run check
npm start
~~~

开发模式使用 npm run dev。项目使用 Node.js 24 的原生配置加载；请勿使用较低版本开发构建。

## 部署选择

- 静态站点：将 dist 的全部内容部署至任意静态托管服务，支持根目录及子目录；使用哈希路由，无需业务路由重写。
- Node.js：运行内置静态服务，支持 HOST 和 PORT 环境变量，无运行时 npm 依赖。
- 容器：执行 docker compose up --build -d，打开主机 4318 端口。

详见 [部署指南](docs/DEPLOYMENT.md)。

## 数据与使用边界

当前版本为单人产品体验版：数据为虚构样例，编辑保存在当前浏览器的站点存储中。更换浏览器、域名或端口会使用独立工作空间，清除站点数据将删除这些编辑。简历最大 2 MB，支持 PDF、PNG、JPEG、WebP，部分浏览器无法内嵌 PDF 时可打开或下载查看。

固定账号仅用于体验登录，不构成企业安全认证；不连接数据库，不支持多用户同步。请勿录入真实员工敏感信息。企业接口适配层已预留，正式使用需实现服务端认证、授权和数据保护。

## 文档与验证

- [标准化 PRD](docs/PRD.md)
- [企业数据接口契约](docs/ENTERPRISE_DATA_API.md)
- [验收记录](docs/VERIFICATION.md)
- [第三方许可](THIRD_PARTY_NOTICES.md)

npm run check 执行类型检查、构建、数据规则和运行服务测试。npm run test:ui 执行浏览器交互与多尺寸验证；Windows 默认使用 Edge，其他系统先执行 npx playwright-core install chromium，或通过 BROWSER_EXECUTABLE 指定浏览器。

交付包包含完整源码、锁定依赖清单、构建产物、启动脚本、容器配置、CI 配置、文档和测试。依赖包与浏览器不随包分发；从源码安装需要网络，预构建版本运行不需要联网。
