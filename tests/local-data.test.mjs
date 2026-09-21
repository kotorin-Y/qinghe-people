import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalDataSource } from '../src/services/local-data.ts';
import { login, logout, authenticated } from '../src/services/auth.ts';
class MemoryStorage { entries=new Map(); getItem(k){return this.entries.get(k)??null;} setItem(k,v){this.entries.set(k,String(v));} removeItem(k){this.entries.delete(k);} }
function fixture(){globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();login('admin','123');return new LocalDataSource();}
test('local login rejects wrong credentials and enforces logout and expiry',async()=>{
  const source=fixture();logout();assert.equal(authenticated.value,false);
  assert.throws(()=>login('admin','wrong'),/不正确/);await assert.rejects(source.bootstrap(),/登录/);
  login('admin','123');assert.equal((await source.bootstrap()).employees.length,48);
  sessionStorage.setItem('qinghe.session.v1',JSON.stringify({username:'admin',expires:Date.now()-1}));await assert.rejects(source.bootstrap(),/过期/);
});
test('browser data maintains offer/onboarding integrity and terminal state',async()=>{
  const source=fixture();const initial=await source.bootstrap();const c=initial.candidates.find(c=>c.stage==='Offer');
  await source.write(`/candidates/${c.id}/stage`,{stage:'待入职'},'PATCH');
  await assert.rejects(source.write(`/candidates/${c.id}/stage`,{stage:'待入职'},'PATCH'),/结束/);
  let data=await source.bootstrap();assert.equal(data.employees.length,49);const flow=data.lifecycles.at(-1);
  await assert.rejects(source.write(`/lifecycles/${flow.id}/complete`,{},'POST'),/完成全部/);
  for(const item of flow.checklist)await source.write(`/lifecycles/${flow.id}/checklist/${item.id}`,{done:true},'PATCH');
  await source.write(`/lifecycles/${flow.id}/complete`,{},'POST');data=await new LocalDataSource().bootstrap();
  assert.equal(data.employees.find(e=>e.id===flow.employeeId).status,'正式');
});
test('browser writes validate state and rollback when storage is full',async()=>{
  const source=fixture();const initial=await source.bootstrap();const p=initial.performance.find(p=>p.status!=='已完成');
  await assert.rejects(source.write(`/performance/${p.id}`,{progress:100,status:'已完成'},'PATCH'),/填写评分/);
  assert.equal((await source.bootstrap()).performance.find(r=>r.id===p.id).status,p.status);
  await source.write(`/performance/${p.id}`,{progress:100,score:0,status:'已完成'},'PATCH');
  const before=localStorage.getItem('qinghe.workspace.v2');const originalSet=localStorage.setItem;
  localStorage.setItem=()=>{throw new Error('QuotaExceeded');};
  await assert.rejects(source.write('/jobs',{title:'未保存岗位',department:'技术研发',headcount:1},'POST'),/未保存/);
  localStorage.setItem=originalSet;assert.equal(localStorage.getItem('qinghe.workspace.v2'),before);
});
