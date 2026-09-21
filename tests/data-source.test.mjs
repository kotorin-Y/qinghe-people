import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { HrHttpDataSource } from '../src/services/hr-api.ts';

async function endpoint(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return new HrHttpDataSource(`http://127.0.0.1:${server.address().port}/enterprise/hr/`);
}
const snapshot = {
  employees: [], departments: [], jobs: [], candidates: [], tasks: [], lifecycles: [], performance: [], events: [], audit: [],
  meta: { demo: false, company: '企业接口验收', referenceDate: '2026-09-21', user: { name: '企业用户', role: 'HRBP' } },
};
test('enterprise data source reads a custom base path and forwards business writes', async t => {
  const calls = [];
  const source = await endpoint(t, async (req, res) => {
    let text = ''; for await (const chunk of req) text += chunk;
    calls.push({ path: req.url, method: req.method, body: text ? JSON.parse(text) : null });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.method === 'GET' ? snapshot : { data: { id: 'enterprise-123', position: '产品专家' } }));
  });
  assert.deepEqual(await source.bootstrap(), snapshot);
  assert.equal((await source.write('/employees/enterprise-123', { position: '产品专家' }, 'PATCH')).data.position, '产品专家');
  assert.deepEqual(calls, [{ path: '/enterprise/hr/bootstrap', method: 'GET', body: null }, { path: '/enterprise/hr/employees/enterprise-123', method: 'PATCH', body: { position: '产品专家' } }]);
});
test('enterprise errors preserve business conflict messages', async t => {
  const source = await endpoint(t, (_req, res) => { res.writeHead(409, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: '企业系统已处理该申请' })); });
  await assert.rejects(source.write('/tasks/t1', { status: '已通过' }, 'PATCH'), /企业系统已处理该申请/);
});
test('wrong proxy content and missing top-level contracts fail explicitly', async t => {
  const html = await endpoint(t, (_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<html>Login</html>'); });
  await assert.rejects(html.bootstrap(), /未返回 JSON/);
  const invalid = await endpoint(t, (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"data":[]}'); });
  await assert.rejects(invalid.bootstrap(), /不符合 HR 接口契约/);
});
