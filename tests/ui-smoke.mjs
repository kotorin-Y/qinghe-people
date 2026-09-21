import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import initial from '../src/data/demo.json' with {type:'json'};


const server=createServer((req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=resolve('dist','.'+(path==='/'?'/index.html':path));if(!file.startsWith(resolve('dist')+'/')&&!file.startsWith(resolve('dist')+'\\'))throw new Error();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
const app={server,close:()=>new Promise(resolve=>server.close(resolve))};
await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${app.server.address().port}`;
const output = resolve('test-results');
await mkdir(output, { recursive: true });
const executablePath = process.env.BROWSER_EXECUTABLE;
const channel = process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
let browser;
try {
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : channel ? { channel } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const bootstrap = async () => await page.evaluate(()=>JSON.parse(localStorage.getItem('qinghe.workspace.v2')||'null')) || structuredClone(initial);
  const go = async (route, title) => { await page.goto(`${url}/#${route}`); await page.getByRole('heading', { level: 1, name: title }).waitFor(); };
  const closeModal = async () => { await page.getByRole('dialog').getByRole('button', { name: '关闭窗口' }).click(); };
  const requests=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
  await page.goto(url+'/#recruitment');
  await page.getByRole('heading',{name:'欢迎回来'}).waitFor();
  assert.equal(await page.locator('.app-shell').count(),0);
  await page.screenshot({path:resolve(output,'login-desktop.png'),fullPage:true});
  await page.getByLabel('密码',{exact:true}).fill('wrong');
  await page.getByRole('button',{name:'登录工作台'}).click();
  await page.getByRole('alert').waitFor();
  await page.getByLabel('密码',{exact:true}).fill('123');
  await page.getByRole('button',{name:'显示密码'}).click();
  assert.equal(await page.getByLabel('密码',{exact:true}).getAttribute('type'),'text');
  await page.getByRole('button',{name:'登录工作台'}).click();
  await page.getByRole('heading',{name:'招聘管理',level:1}).waitFor();
  await page.reload();
  await page.getByRole('heading',{name:'招聘管理',level:1}).waitFor();
  await page.locator('.candidate-card').first().click();
  await page.getByRole('heading',{name:'简历预览'}).waitFor();
  assert.equal(await page.locator('.resume-paper').count(),1);
  await page.screenshot({path:resolve(output,'resume-desktop.png'),fullPage:true});
  await closeModal();
  console.log('PASS: login guard, invalid password, visibility, refresh session and seeded resume');
  await go('dashboard', /早上好/);
  await page.screenshot({ path: resolve(output, 'dashboard-desktop.png'), fullPage: true });
  for (const [route,title] of [['people','员工管理'],['organization','组织与编制'],['recruitment','招聘管理'],['lifecycle','入转调离'],['tasks',/待办与审批/],['performance','绩效与成长'],['analytics','人力分析'],['settings','系统与审计']]) {
    await go(route,title);
    assert.equal(await page.locator('.error-panel').count(),0);
  }
  console.log('PASS: all 9 pages render without runtime failures');

  await go('people','员工管理');
  await page.getByLabel('按员工状态筛选').selectOption('已离职');
  assert.equal(await page.locator('tbody tr').count(), (await bootstrap()).employees.filter(e=>e.status==='已离职').length);
  await page.getByRole('button',{name:'清除筛选'}).click();
  await page.locator('.person-button').first().click();
  await page.getByRole('button',{name:'编辑档案'}).click();
  await page.getByLabel('岗位').fill('业务体验负责人');
  await page.getByRole('button',{name:'保存修改',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  await page.getByRole('button',{name:'新增员工',exact:true}).click();
  await page.getByLabel('姓名',{exact:false}).fill('浏览器验收员工');
  await page.getByLabel('岗位').fill('数据工程师');
  await page.getByLabel('直属主管').fill('林悦');
  await page.getByLabel('工作邮箱').fill('qa@qinghe.example');
  await page.getByRole('button',{name:'创建员工档案'}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  await page.getByLabel('搜索员工').fill('浏览器验收员工');
  assert.equal(await page.locator('tbody tr').count(),1);
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'导出名册'}).click();
  assert.ok((await download).suggestedFilename().endsWith('.csv'));
  await page.reload();
  await page.getByLabel('搜索员工').fill('浏览器验收员工');
  assert.equal(await page.locator('tbody tr').count(),1);
  console.log('PASS: employee edit, subsequent creation, departed filter, export and reload');

  await go('recruitment','招聘管理');
  await page.getByRole('button',{name:'添加候选人',exact:true}).click();
  await page.getByLabel('候选人姓名',{exact:true}).fill('招聘闭环验收');
  await page.getByRole('button',{name:'确认创建'}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  await page.locator('.candidate-card').filter({hasText:'招聘闭环验收'}).click();
  await page.getByRole('heading',{name:'尚未添加简历'}).waitFor();
  const upload=page.getByLabel('上传候选人简历');
  await upload.setInputFiles({name:'unsupported.txt',mimeType:'text/plain',buffer:Buffer.from('not a resume')});
  await page.getByRole('alert').filter({hasText:'仅支持'}).waitFor();
  await upload.setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(2*1024*1024+1)});
  await page.getByRole('alert').filter({hasText:'2 MB'}).waitFor();
  const printPage=await browser.newPage();await printPage.setContent('<h1>Resume preview acceptance</h1><p>Valid local PDF document.</p>');const pdf=await printPage.pdf();await printPage.close();
  await upload.setInputFiles({name:'candidate-resume.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.locator('iframe[title="候选人 PDF 简历预览"]').waitFor();
  assert.equal((await bootstrap()).candidates.find(c=>c.name==='招聘闭环验收').resume.kind,'pdf');
  const png=await page.screenshot();
  await upload.setInputFiles({name:'candidate-resume.png',mimeType:'image/png',buffer:png});
  await page.getByAltText('候选人上传的简历').waitFor();
  await closeModal();await page.reload();await page.getByRole('heading',{name:'招聘管理',level:1}).waitFor();
  await page.locator('.candidate-card').filter({hasText:'招聘闭环验收'}).click();await page.getByAltText('候选人上传的简历').waitFor();await closeModal();
  console.log('PASS: empty resume, invalid/oversize validation, PDF/image preview, replacement and persistence');
  for(const stage of ['初试','复试','Offer','待入职']) {
    await page.locator('.candidate-card').filter({hasText:'招聘闭环验收'}).click();
    await page.getByRole('button',{name:stage==='待入职'?'确认接受，转入职':'推进至'+stage}).click();
    await page.getByRole('dialog').waitFor({state:'detached'});
  }
  let snapshot=await bootstrap();
  const employee=snapshot.employees.find(e=>e.name==='招聘闭环验收');
  assert.equal(employee.status,'待入职');
  await go('lifecycle','入转调离');
  await page.locator('.journey-person').filter({hasText:'招聘闭环验收'}).click();
  const checkboxes=page.locator('.checklist-item input');
  for(let i=0;i<await checkboxes.count();i++) { await checkboxes.nth(i).check(); await page.waitForFunction(()=>!document.querySelector('.checklist-item input:disabled')); }
  await page.getByRole('button',{name:'确认办结',exact:true}).click();
  await page.getByRole('button',{name:'流程已办结'}).waitFor();
  snapshot=await bootstrap();
  assert.equal(snapshot.employees.find(e=>e.id===employee.id).status,'正式');
  console.log('PASS: candidate pipeline → pending employee → onboarding checklist → active employee');

  await go('tasks',/待办与审批/);
  const before=(await bootstrap()).tasks.filter(t=>t.status==='待处理').length;
  await page.locator('.inbox-task').first().click();
  await page.getByRole('dialog').getByRole('button',{name:/同意申请|确认完成/}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal((await bootstrap()).tasks.filter(t=>t.status==='待处理').length,before-1);
  console.log('PASS: approval updates persistent state');

  await go('performance','绩效与成长');
  const record=(await bootstrap()).performance.find(p=>p.status!=='已完成'&&p.score===null);
  const row=page.locator('tbody tr').filter({hasText:record.name});
  await row.getByRole('button').click();
  await page.getByLabel('目标进度百分比').fill('70');
  await page.getByRole('button',{name:'保存进展'}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal((await bootstrap()).performance.find(p=>p.id===record.id).score,null);
  await row.getByRole('button').click();
  await page.getByLabel('目标进度百分比').fill('100');
  await page.getByRole('dialog').getByLabel('目标状态').selectOption('已完成');
  await page.getByLabel('评审分数').fill('90');
  await page.getByRole('button',{name:'保存进展'}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal((await bootstrap()).performance.find(p=>p.id===record.id).status,'已完成');
  await row.getByRole('button').click();
  assert.equal(await page.getByRole('button',{name:'保存进展'}).count(),0);
  await closeModal();
  console.log('PASS: unscored progress update, scored completion and readonly completed review');

  await page.keyboard.press('Control+k');
  await page.getByLabel('全局搜索关键词').fill('浏览器验收员工');
  await page.locator('.search-result').first().waitFor();
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await go('dashboard',/早上好/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
  const toastClose=page.getByRole('button',{name:'关闭提示'}); if(await toastClose.count())await toastClose.click();
  await page.screenshot({path:resolve(output,'dashboard-mobile.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'打开导航'}).click();
  await page.locator('nav').getByRole('link',{name:'招聘管理'}).click();
  await page.getByRole('heading',{level:1,name:'招聘管理'}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  assert.equal(await page.locator('.nav-overlay').count(),0);
  await page.locator('.candidate-card').first().click();
  await page.getByRole('heading',{name:'简历预览'}).waitFor();
  assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.screenshot({path:resolve(output,'resume-mobile.png'),animations:'disabled'});
  await closeModal();
  await page.getByRole('button',{name:'新建职位'}).click();
  await page.getByRole('dialog').waitFor();
  await closeModal();
  for (const [route,title] of [['people','员工管理'],['organization','组织与编制'],['lifecycle','入转调离'],['tasks',/待办与审批/],['performance','绩效与成长'],['analytics','人力分析'],['settings','系统与审计']]) {
    await go(route,title);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1), route+' mobile overflow');
  }
  console.log('PASS: global search, keyboard dismiss, all mobile pages, navigation and modal');
  for(const width of [360,768,1024,1920]) {
    await page.setViewportSize({width,height:900});
    for(const [route,title] of [['dashboard',/早上好/],['people','员工管理'],['organization','组织与编制'],['recruitment','招聘管理'],['lifecycle','入转调离'],['tasks',/待办与审批/],['performance','绩效与成长'],['analytics','人力分析'],['settings','系统与审计']]){await go(route,title);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow at '+width);}
  }
  await page.getByRole('button',{name:'退出登录',exact:true}).click();
  await page.getByRole('heading',{name:'欢迎回来'}).waitFor();
  await page.reload();await page.getByRole('heading',{name:'欢迎回来'}).waitFor();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,'login-mobile.png'),fullPage:true});
  assert.equal(requests.length,0,'local mode must never request business APIs');
  console.log('PASS: all 9 pages at 360/390/768/1024/1440/1920, logout and zero API requests');
  assert.deepEqual(errors,[]);
  console.log('UI acceptance complete. Screenshots: test-results/');
} finally { await browser?.close(); await app.close(); }
