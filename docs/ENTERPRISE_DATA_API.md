# 企业数据接口契约

## 入口

src/services/hr-api.ts 定义 HrDataSource：bootstrap(): Promise<AppData> 和 write(path, body, method): Promise<{ data: unknown }>。默认使用随产品提供的体验数据源。设置 VITE_HR_API_BASE_URL 并重新构建后切换 HTTP 适配器。

GET {base}/bootstrap 返回 AppData 本身，包含 employees、departments、jobs、candidates、tasks、lifecycles、performance、events、audit 数组，以及 meta.demo、meta.company、meta.referenceDate（YYYY-MM-DD）、meta.user.name 和 meta.user.role。完整类型见 src/types.ts；src/data/demo.json 可作结构样例。

## 写接口

| 方法 | 相对路径 | 请求体 |
| --- | --- | --- |
| POST | /employees | Employee 可编辑字段（无 id） |
| PATCH | /employees/:id | 员工可编辑字段 |
| POST | /jobs | title, department, level, location, headcount, owner, salaryRange |
| POST | /candidates | name, jobId, source, experience, tags |
| PATCH | /candidates/:id/stage | {stage} |
| PATCH | /candidates/:id/resume | {resume}，类型见 Resume |
| PATCH | /tasks/:id | {status: 已通过或已驳回} |
| PATCH | /lifecycles/:id/checklist/:itemId | {done: boolean} |
| POST | /lifecycles/:id/complete | {} |
| PATCH | /performance/:id | {progress, score（可省略）, status} |

成功返回 2xx、Content-Type: application/json 和 {data: 更新后的对象}。失败返回非 2xx 与 {error: 可展示的业务错误}。每次写入后前端重新拉取 bootstrap；写入成功但刷新失败会明确提示，避免用户重复提交。请求超时为 15 秒。

## 生产集成约束

现有适配器使用 credentials: same-origin；推荐同源 /api 反向代理及受保护会话。跨源带凭据策略、SSO、CSRF 与权限体系须在实际接入时设计和实现。固定体验登录不提供企业鉴权，必须替换。服务端需要按字段白名单校验、执行状态机、限制文件、管理存储并提供幂等机制。当前前端不能保证网络重试幂等或多人并发一致性。

简历当前通过数据 URL 传送。生产建议上传至受控附件服务，返回短期授权访问地址，并相应扩展 Resume 类型与预览组件。服务端必须对录用生成员工与入职流程执行事务，不能将多个不一致写操作暴露给页面。
