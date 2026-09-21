import initial from '../data/demo.json' with {type:'json'};
import type { AppData, Employee, Candidate, Job, Lifecycle, Performance, Task } from '../types';
import type { HrDataSource } from './hr-api';
import { requireSession } from './auth.ts';
const KEY='qinghe.workspace.v2';
const stages=['简历筛选','初试','复试','Offer','待入职'];
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const id=(prefix:string)=>prefix+'-'+crypto.randomUUID();
function read():AppData { const saved=localStorage.getItem(KEY); if(!saved)return clone(initial) as AppData; try { const value=JSON.parse(saved); if(!value.employees||!value.meta)throw new Error(); return value; }catch{throw new Error('工作空间数据无法读取，请检查站点存储设置后重试');} }
function text(value:unknown,label:string){if(typeof value!=='string'||!value.trim())throw new Error('请填写'+label);return value.trim();}
function integer(value:unknown,min:number,max:number){if(!Number.isInteger(value)||Number(value)<min||Number(value)>max)throw new Error(`请输入 ${min}–${max} 的整数`);return Number(value);}
export class LocalDataSource implements HrDataSource {
  async bootstrap(){requireSession();return read();}
  async write(path:string,body:unknown,method:string){
    requireSession();
    const d=read(), b=body as Record<string,any>, parts=path.split('/').filter(Boolean);let record:any;
    const find=<T extends {id:string}>(list:T[])=>{const r=list.find(x=>x.id===parts[1]);if(!r)throw new Error('记录不存在');return r;};
    const checkDepartment=(name:string)=>{if(!d.departments.some(dep=>dep.name===name))throw new Error('请选择有效部门');};
    if(parts[0]==='employees'){
      if(method==='POST'){record={id:id('emp'),...b} as Employee;text(record.name,'姓名');text(record.position,'岗位');d.employees.push(record);}
      else {record=find(d.employees);Object.assign(record,b);}
      checkDepartment(record.department);
      if(record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))throw new Error('邮箱格式不正确');
      if(record.email && d.employees.some(e=>e.id!==record.id&&e.email.toLowerCase()===record.email.toLowerCase()))throw new Error('该邮箱已用于其他员工');
      for(const related of [...d.lifecycles,...d.performance].filter(x=>x.employeeId===record.id)){related.name=record.name;related.department=record.department;}
    }else if(parts[0]==='jobs'&&method==='POST'){
      checkDepartment(b.department);record={...b,id:id('job'),title:text(b.title,'职位名称'),headcount:integer(b.headcount,1,1000),status:'招聘中',openedAt:d.meta.referenceDate} as Job;d.jobs.push(record);
    }else if(parts[0]==='candidates'){
      if(method==='POST'){const job=d.jobs.find(j=>j.id===b.jobId&&j.status==='招聘中');if(!job)throw new Error('请选择招聘中的职位');record={...b,id:id('can'),name:text(b.name,'候选人姓名'),stage:'简历筛选',appliedAt:d.meta.referenceDate} as Candidate;d.candidates.push(record);}
      else {record=find(d.candidates);if(parts[2]==='resume'){record.resume=b.resume;}
        else if(parts[2]==='stage'){
          if(['待入职','已淘汰'].includes(record.stage))throw new Error('当前招聘流程已结束');
          if(b.stage!=='已淘汰' && stages.indexOf(b.stage)!==stages.indexOf(record.stage)+1)throw new Error('只能推进至下一阶段');
          if(b.stage==='待入职'){
            const j=d.jobs.find(j=>j.id===record.jobId)!;
            if(!j||j.status!=='招聘中')throw new Error('职位已关闭');
            const e:Employee={id:id('emp'),name:record.name,englishName:'',department:j.department,position:j.title,level:j.level,location:j.location,employmentType:'全职',status:'待入职',joinDate:d.meta.referenceDate,manager:j.owner,email:''};d.employees.push(e);
            d.lifecycles.push({id:id('life'),employeeId:e.id,name:e.name,department:e.department,type:'入职',effectiveDate:e.joinDate,owner:j.owner,status:'进行中',checklist:['资料与合同核验','设备和账号准备','入职引导与导师确认'].map((label,i)=>({id:'item-'+i,label,done:false}))});
          }record.stage=b.stage;
        }else throw new Error('操作不存在');
      }
    }else if(parts[0]==='tasks'){
      record=find<Task>(d.tasks);if(record.status!=='待处理')throw new Error('该事项已处理');if(!['已通过','已驳回'].includes(b.status))throw new Error('处理状态无效');record.status=b.status;
    }else if(parts[0]==='lifecycles'){
      record=find<Lifecycle>(d.lifecycles);if(record.status==='已完成')throw new Error('流程已完成');
      if(parts[2]==='checklist'){const item=record.checklist.find((i:{id:string})=>i.id===parts[3]);if(!item||typeof b.done!=='boolean')throw new Error('检查项无效');item.done=b.done;}
      else if(parts[2]==='complete'){if(!record.checklist.length||record.checklist.some((i:{done:boolean})=>!i.done))throw new Error('请完成全部清单');record.status='已完成';const e=d.employees.find(e=>e.id===record.employeeId)!;if(['入职','转正'].includes(record.type))e.status='正式';if(record.type==='离职')e.status='已离职';}
      else throw new Error('操作不存在');
    }else if(parts[0]==='performance'){
      record=find<Performance>(d.performance);if(record.status==='已完成')throw new Error('已完成的绩效不可修改');
      if(b.progress!==undefined)record.progress=integer(b.progress,0,100);if(b.score!==undefined)record.score=integer(b.score,0,100);
      if(!['进行中','待评审','已完成'].includes(b.status))throw new Error('绩效状态无效');record.status=b.status;
      if(record.status==='已完成'&&(record.progress!==100||!Number.isInteger(record.score)))throw new Error('完成须进度100%并填写评分');
    }else throw new Error('操作不存在');
    d.audit.unshift({id:id('audit'),action:parts[2]==='resume'?'更新简历':method==='POST'?'新建 / 办结':'更新记录',entity:parts[0],detail:record.name||record.title||record.objective||record.id,createdAt:new Date().toISOString()});
    try{localStorage.setItem(KEY,JSON.stringify(d));}catch{throw new Error('存储空间不足，本次操作未保存。请使用更小的简历文件');}
    return {data:clone(record)};
  }
}
