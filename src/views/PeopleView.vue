<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { activeEmployees, avatarStyle, busy, data, exportCsv, mutate } from '../store';
import type { Employee } from '../types';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';

const search = ref('');
const department = ref('');
const status = ref('');
const currentPage = ref(1);
const pageSize = 8;
const modal = ref<'new' | 'detail' | null>(null);
const selected = ref<Employee | null>(null);
const editing = ref(false);
const error = ref('');
const blank = (): Omit<Employee, 'id'> => ({ name: '', englishName: '', department: data.departments[0]?.name || '', position: '', level: 'P5', location: '杭州', employmentType: '全职', status: '试用', joinDate: data.meta.referenceDate, manager: '', email: '' });
const form = reactive(blank());
const filtered = computed(() => data.employees.filter(employee => {
  const keyword = search.value.trim().toLowerCase();
  return (!keyword || [employee.name, employee.englishName, employee.position, employee.email, employee.id].join(' ').toLowerCase().includes(keyword)) && (!department.value || employee.department === department.value) && (!status.value || employee.status === status.value);
}));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visibleEmployees = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));
const newThisMonth = computed(() => activeEmployees.value.filter(employee => employee.joinDate.slice(0, 7) === data.meta.referenceDate.slice(0, 7)).length);
watch([search, department, status], () => { currentPage.value = 1; });
watch(pages, value => { currentPage.value = Math.min(currentPage.value, value); });
function statusClass(value: string) { return value === '正式' ? 'badge-green' : value === '试用' ? 'badge-blue' : value === '待入职' ? 'badge-amber' : 'badge-muted'; }
function openNew() { Object.assign(form, blank()); selected.value = null; editing.value = false; error.value = ''; modal.value = 'new'; }
function openEmployee(employee: Employee) { selected.value = employee; Object.assign(form, Object.fromEntries(Object.keys(blank()).map(key => [key, employee[key as keyof Employee]]))); editing.value = false; error.value = ''; modal.value = 'detail'; }
function closeModal() { if (!busy.value) { modal.value = null; error.value = ''; } }
async function save() {
  error.value = '';
  if (!form.name.trim() || !form.department || !form.position.trim() || !form.level.trim() || !form.location.trim() || !form.manager.trim() || !form.email.trim()) { error.value = '请补全姓名、部门、岗位、职级、办公地点、直属主管和邮箱。'; return; }
  const isNew = modal.value === 'new';
  const body = isNew ? { ...form, name: form.name.trim(), email: form.email.trim() } : { department: form.department, position: form.position.trim(), level: form.level.trim(), location: form.location.trim(), manager: form.manager.trim(), email: form.email.trim() };
  const saved = await mutate(isNew ? '/employees' : `/employees/${selected.value?.id}`, body, isNew ? 'POST' : 'PATCH', isNew ? '员工档案已创建' : '员工档案已更新');
  if (saved) modal.value = null;
  else error.value = '保存未成功，请根据提示检查信息后重试。';
}
function exportEmployees() { exportCsv('员工名册.csv', ['工号', '姓名', '英文名', '部门', '岗位', '职级', '工作地点', '用工类型', '状态', '入职日期', '直属主管', '邮箱'], filtered.value.map(e => [e.id, e.name, e.englishName, e.department, e.position, e.level, e.location, e.employmentType, e.status, e.joinDate, e.manager, e.email])); }
</script>

<template>
  <div class="page-heading">
    <div><div class="eyebrow">PEOPLE DIRECTORY</div><h1>员工管理</h1><p class="page-subtitle">一份清晰的员工档案，连接人与组织的每个阶段。</p></div>
    <div class="heading-actions"><button class="btn" @click="exportEmployees"><Icon name="download" :size="16" />导出名册</button><button class="btn btn-primary" @click="openNew"><Icon name="plus" :size="17" />新增员工</button></div>
  </div>

  <div class="metric-row">
    <div class="metric-card"><span class="metric-label">在职员工</span><strong class="metric-value">{{ activeEmployees.length }}<small>人</small></strong><span class="metric-foot">正式与试用期员工</span></div>
    <div class="metric-card"><span class="metric-label">本月入职</span><strong class="metric-value">{{ newThisMonth }}<small>人</small></strong><span class="metric-foot">{{ data.meta.referenceDate.slice(0, 7) }} 入职且在职</span></div>
    <div class="metric-card"><span class="metric-label">试用期员工</span><strong class="metric-value">{{ data.employees.filter(e => e.status === '试用').length }}<small>人</small></strong><span class="metric-foot">关注融入与转正评估</span></div>
    <div class="metric-card"><span class="metric-label">待入职</span><strong class="metric-value">{{ data.employees.filter(e => e.status === '待入职').length }}<small>人</small></strong><span class="metric-foot">准备好每一次初次见面</span></div>
  </div>

  <section class="panel directory-panel">
    <div class="panel-header"><div class="panel-title"><h2>员工名册</h2><span class="record-count">{{ filtered.length }} 位员工</span></div><span class="directory-note">档案信息 · 统一维护</span></div>
    <div class="toolbar">
      <label class="search-field"><Icon name="search" :size="17" /><input v-model="search" type="search" placeholder="搜索姓名、岗位、邮箱或工号" aria-label="搜索员工" /></label>
      <select v-model="department" class="select-field" aria-label="按部门筛选"><option value="">全部部门</option><option v-for="item in data.departments" :key="item.id">{{ item.name }}</option></select>
      <select v-model="status" class="select-field" aria-label="按员工状态筛选"><option value="">全部状态</option><option>正式</option><option>试用</option><option>待入职</option><option>已离职</option></select>
      <button v-if="search || department || status" class="btn btn-quiet btn-small" @click="search = ''; department = ''; status = ''">清除筛选</button>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>员工</th><th>部门 / 岗位</th><th>职级</th><th>工作地点</th><th>入职日期</th><th>状态</th><th class="action-column">操作</th></tr></thead><tbody>
      <tr v-for="employee in visibleEmployees" :key="employee.id">
        <td><button class="person-cell person-button" @click="openEmployee(employee)"><span class="avatar" :style="avatarStyle(employee.name)">{{ employee.name.slice(-2) }}</span><span><span class="person-name">{{ employee.name }}<span class="english-name">{{ employee.englishName }}</span></span><span class="person-subtitle">{{ employee.id }}</span></span></button></td>
        <td><div class="cell-main">{{ employee.department }}</div><div class="person-subtitle">{{ employee.position }}</div></td><td><span class="level-pill">{{ employee.level }}</span></td><td>{{ employee.location }}</td><td class="date-cell">{{ employee.joinDate }}</td><td><span class="badge" :class="statusClass(employee.status)"><i />{{ employee.status }}</span></td><td class="action-column"><button class="btn btn-quiet btn-small" :aria-label="`查看${employee.name}的档案`" @click="openEmployee(employee)">查看<Icon name="chevronRight" :size="14" /></button></td>
      </tr>
    </tbody></table></div>
    <div v-if="!visibleEmployees.length" class="empty-state"><Icon name="users" :size="28" /><strong>没有找到符合条件的员工</strong><p>试试其他关键词，或调整部门和状态筛选。</p><button v-if="search || department || status" class="btn btn-small" @click="search = ''; department = ''; status = ''">查看全部员工</button></div>
    <div class="table-pagination"><span>共 {{ filtered.length }} 条<span v-if="filtered.length">，当前 {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filtered.length) }} 条</span></span><div><button class="btn btn-small" :disabled="currentPage <= 1" @click="currentPage--">上一页</button><span class="page-number">{{ currentPage }} / {{ pages }}</span><button class="btn btn-small" :disabled="currentPage >= pages" @click="currentPage++">下一页</button></div></div>
  </section>

  <Modal v-if="modal" :title="modal === 'new' ? '新增员工' : '员工档案'" :subtitle="modal === 'new' ? '建立员工档案，开启新一段成长旅程。' : '维护基础信息，让协作从准确的信息开始。'" wide @close="closeModal">
    <div v-if="modal === 'detail' && selected" class="profile-banner"><span class="avatar profile-avatar" :style="avatarStyle(selected.name)">{{ selected.name.slice(-2) }}</span><div><h3>{{ selected.name }} <span>{{ selected.englishName }}</span></h3><p>{{ selected.position }} · {{ selected.department }}</p></div><span class="badge" :class="statusClass(selected.status)">{{ selected.status }}</span></div>
    <dl v-if="modal === 'detail' && selected && !editing" class="profile-details">
      <div><dt>员工编号</dt><dd>{{ selected.id }}</dd></div><div><dt>职级</dt><dd>{{ selected.level }}</dd></div><div><dt>所属部门</dt><dd>{{ selected.department }}</dd></div><div><dt>直属主管</dt><dd>{{ selected.manager || '—' }}</dd></div><div><dt>工作地点</dt><dd>{{ selected.location }}</dd></div><div><dt>用工类型</dt><dd>{{ selected.employmentType }}</dd></div><div><dt>入职日期</dt><dd>{{ selected.joinDate }}</dd></div><div><dt>工作邮箱</dt><dd>{{ selected.email || '—' }}</dd></div>
    </dl>
    <form v-else id="employee-form" class="form-grid" @submit.prevent="save">
      <label v-if="modal === 'new'" class="form-field">姓名 <span class="required">*</span><input v-model="form.name" required maxlength="30" placeholder="请输入员工姓名" /></label>
      <label v-if="modal === 'new'" class="form-field">英文名<input v-model="form.englishName" maxlength="40" placeholder="选填" /></label>
      <label class="form-field">所属部门 <span class="required">*</span><select v-model="form.department" required><option value="" disabled>请选择部门</option><option v-for="item in data.departments" :key="item.id">{{ item.name }}</option></select></label>
      <label class="form-field">岗位 <span class="required">*</span><input v-model="form.position" required maxlength="60" placeholder="如：高级前端工程师" /></label>
      <label class="form-field">职级 <span class="required">*</span><input v-model="form.level" required maxlength="20" placeholder="如：P5" /></label>
      <label class="form-field">工作地点 <span class="required">*</span><input v-model="form.location" required maxlength="50" placeholder="如：杭州" /></label>
      <label class="form-field">直属主管 <span class="required">*</span><input v-model="form.manager" required maxlength="30" placeholder="请输入主管姓名" /></label>
      <label class="form-field">工作邮箱 <span class="required">*</span><input v-model="form.email" required type="email" maxlength="100" placeholder="name@company.com" /></label>
      <label v-if="modal === 'new'" class="form-field">用工类型<select v-model="form.employmentType"><option>全职</option><option>实习</option><option>外包</option><option>兼职</option></select></label>
      <label v-if="modal === 'new'" class="form-field">员工状态<select v-model="form.status"><option>正式</option><option>试用</option><option>待入职</option></select></label>
      <label v-if="modal === 'new'" class="form-field">入职日期 <span class="required">*</span><input v-model="form.joinDate" required type="date" /></label>
      <p v-if="modal === 'detail'" class="form-full form-hint"><Icon name="briefcase" :size="15" />员工状态与入职日期由入转调离流程维护。</p>
      <p v-if="error" class="form-full form-error" role="alert">{{ error }}</p>
    </form>
    <template #footer><button class="btn" :disabled="busy" @click="closeModal">{{ modal === 'detail' && !editing ? '关闭' : '取消' }}</button><button v-if="modal === 'detail' && !editing" class="btn btn-primary" @click="editing = true"><Icon name="edit" :size="15" />编辑档案</button><button v-else class="btn btn-primary" type="submit" form="employee-form" :disabled="busy">{{ busy ? '正在保存…' : modal === 'new' ? '创建员工档案' : '保存修改' }}</button></template>
  </Modal>
</template>

<style scoped>
.heading-actions,.panel-title,.table-pagination,.table-pagination>div{display:flex;align-items:center;gap:12px}.metric-value small{font-size:13px;font-weight:400;margin-left:8px;color:#9197a7}.panel-title h2{margin:0}.record-count{font-size:11px;border-radius:5px;padding:3px 7px;background:#f0f3f8;color:#778196}.directory-note{font-size:12px;color:#9aa1b1}.person-button{border:0;background:none;cursor:pointer;text-align:left;padding:0;color:inherit;font:inherit}.person-button:hover .person-name{color:#4063e8}.english-name{font-size:11px;color:#a0a7b5;font-weight:400;margin-left:7px}.cell-main{font-size:12px;margin-bottom:5px}.level-pill{border:1px solid #e7eaf0;padding:3px 7px;border-radius:5px;color:#71809a;font-size:11px}.date-cell{font-variant-numeric:tabular-nums;color:#7d8698}.badge i{height:5px;width:5px;border-radius:50%;background:currentColor}.action-column{text-align:right!important}.table-pagination{justify-content:space-between;padding:18px 22px;border-top:1px solid #f0f2f7;font-size:11px;color:#8891a3}.page-number{min-width:40px;text-align:center;font-variant-numeric:tabular-nums}.profile-banner{display:flex;align-items:center;gap:16px;background:#f7f8fc;padding:21px;border-radius:12px;margin-bottom:26px}.profile-avatar{width:52px;height:52px;font-size:17px}.profile-banner h3{font-size:20px;margin:0 0 7px}.profile-banner h3 span{font-size:13px;font-weight:400;color:#8992a4}.profile-banner p{margin:0;font-size:12px;color:#8992a4}.profile-banner>.badge{margin-left:auto}.profile-details{display:grid;grid-template-columns:1fr 1fr;gap:25px 30px;margin:0 0 10px}.profile-details dt{font-size:11px;color:#919aae;margin-bottom:8px}.profile-details dd{margin:0;color:#37425b;font-size:13px;overflow-wrap:anywhere}.required{color:#d26767}.form-hint{display:flex;align-items:center;gap:7px;font-size:11px;color:#8d95a8;margin:5px 0}.empty-state strong{display:block;margin-top:10px}.empty-state p{font-size:12px}.directory-panel{overflow:hidden}@media(max-width:650px){.heading-actions{flex-wrap:wrap}.directory-note{display:none}.table-pagination{padding:15px;align-items:flex-start;gap:14px;flex-wrap:wrap}.profile-details{gap:20px}.english-name{display:none}}
</style>
