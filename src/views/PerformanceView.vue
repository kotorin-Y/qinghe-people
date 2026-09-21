<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { avatarStyle, busy, data, exportCsv, mutate } from '../store';
import type { Performance } from '../types';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';

const search = ref('');
const department = ref('');
const status = ref('');
const selected = ref<Performance | null>(null);
const error = ref('');
const form = reactive<{ progress: number; score: number | ''; status: string }>({ progress: 0, score: '', status: '进行中' });
const filtered = computed(() => data.performance.filter(record => {
  const keyword = search.value.trim().toLowerCase();
  return (!keyword || [record.name, record.objective].join(' ').toLowerCase().includes(keyword)) && (!department.value || record.department === department.value) && (!status.value || record.status === status.value);
}));
const averageProgress = computed(() => data.performance.length ? Math.round(data.performance.reduce((sum, record) => sum + record.progress, 0) / data.performance.length) : 0);
const completed = computed(() => data.performance.filter(record => record.status === '已完成').length);
const waiting = computed(() => data.performance.filter(record => record.status === '待评审').length);
const due = computed(() => data.performance.filter(record => record.status !== '已完成' && record.dueDate < data.meta.referenceDate).length);
const statusClass = (value: string) => value === '已完成' ? 'badge-green' : value === '待评审' ? 'badge-amber' : 'badge-blue';
function openRecord(record: Performance) { selected.value = record; Object.assign(form, { progress: record.progress, score: record.score ?? '', status: record.status }); error.value = ''; }
function closeModal() { if (!busy.value) selected.value = null; }
async function save() {
  if (!selected.value || selected.value.status === '已完成') return;
  error.value = '';
  const progress = Number(form.progress);
  const score = form.score === '' ? null : Number(form.score);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) { error.value = '目标进度需要在 0–100% 之间。'; return; }
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) { error.value = '评审分数需要在 0–100 分之间。'; return; }
  if (form.status === '已完成' && (progress !== 100 || score === null)) { error.value = '标记为已完成前，请将进度更新至 100% 并填写评审分数。'; return; }
  const saved = await mutate(`/performance/${selected.value.id}`, { progress, ...(score === null ? {} : {score}), status: form.status }, 'PATCH', '目标进展已更新');
  if (saved) selected.value = null;
  else error.value = '保存未成功，请根据提示检查信息后重试。';
}
function exportPerformance() { exportCsv('绩效目标进展.csv', ['员工', '部门', '目标', '进度', '状态', '评审分数', '截止日期'], filtered.value.map(record => [record.name, record.department, record.objective, `${record.progress}%`, record.status, record.score ?? '', record.dueDate])); }
</script>

<template>
  <div class="page-heading"><div><div class="eyebrow">PERFORMANCE & GROWTH</div><h1>绩效与成长</h1><p class="page-subtitle">把业务目标转化为行动，看见每一位伙伴的成长。</p></div><button class="btn" @click="exportPerformance"><Icon name="download" :size="16" />导出目标报表</button></div>
  <div class="performance-banner"><div class="banner-icon"><Icon name="target" :size="27" /></div><div><span class="banner-eyebrow">持续对齐 · 及时反馈</span><h2>让目标可见，让成长发生。</h2><p>持续记录目标进展，在评审前建立有依据的反馈。</p></div><div class="banner-progress"><strong>{{ averageProgress }}<small>%</small></strong><span>目标平均进度</span></div></div>
  <div class="metric-row">
    <div class="metric-card"><span class="metric-label">目标记录</span><strong class="metric-value">{{ data.performance.length }}<small>项</small></strong><span class="metric-foot">当前维护的员工目标</span></div>
    <div class="metric-card"><span class="metric-label">已完成目标</span><strong class="metric-value">{{ completed }}<small>项</small></strong><span class="metric-foot">目标完成且已评审</span></div>
    <div class="metric-card"><span class="metric-label">等待评审</span><strong class="metric-value">{{ waiting }}<small>项</small></strong><span class="metric-foot">准备反馈与成长对话</span></div>
    <div class="metric-card"><span class="metric-label">逾期未完成</span><strong class="metric-value" :class="{ 'attention-value': due > 0 }">{{ due }}<small>项</small></strong><span class="metric-foot">截至 {{ data.meta.referenceDate }}</span></div>
  </div>
  <section class="panel performance-panel">
    <div class="panel-header"><div class="panel-title"><h2>员工目标</h2><span class="record-count">{{ filtered.length }} 项</span></div><span class="panel-caption">从目标到成果，每一步都可追踪</span></div>
    <div class="toolbar"><label class="search-field"><Icon name="search" :size="17" /><input v-model="search" type="search" placeholder="搜索员工或目标关键词" aria-label="搜索绩效目标" /></label><select v-model="department" class="select-field" aria-label="按部门筛选绩效"><option value="">全部部门</option><option v-for="item in data.departments" :key="item.id">{{ item.name }}</option></select><select v-model="status" class="select-field" aria-label="按目标状态筛选"><option value="">全部状态</option><option>进行中</option><option>待评审</option><option>已完成</option></select><button v-if="search || department || status" class="btn btn-small btn-quiet" @click="search = ''; department = ''; status = ''">清除筛选</button></div>
    <div class="table-wrap"><table class="table performance-table"><thead><tr><th>员工 / 部门</th><th>业务目标</th><th>目标进度</th><th>状态</th><th>评审分数</th><th>截止日期</th><th class="action-column">操作</th></tr></thead><tbody><tr v-for="record in filtered" :key="record.id"><td><div class="person-cell"><span class="avatar" :style="avatarStyle(record.name)">{{ record.name.slice(-2) }}</span><div><span class="person-name">{{ record.name }}</span><span class="person-subtitle">{{ record.department }}</span></div></div></td><td><p class="objective-text">{{ record.objective }}</p></td><td><div class="objective-progress"><span>{{ record.progress }}<small>%</small></span><div class="progress-track"><span class="progress-fill" :class="{ completed: record.status === '已完成' }" :style="{ width: `${record.progress}%` }" /></div></div></td><td><span class="badge" :class="statusClass(record.status)">{{ record.status }}</span></td><td><strong v-if="record.score !== null" class="score-value">{{ record.score }}<small> / 100</small></strong><span v-else class="no-score">待评审</span></td><td><span class="due-date" :class="{ overdue: record.dueDate < data.meta.referenceDate && record.status !== '已完成' }">{{ record.dueDate }}</span></td><td class="action-column"><button class="btn btn-small btn-quiet" :aria-label="`更新${record.name}的目标`" @click="openRecord(record)">{{ record.status === '已完成' ? '查看' : '更新' }}<Icon name="chevronRight" :size="14" /></button></td></tr></tbody></table></div>
    <div v-if="!filtered.length" class="empty-state"><Icon name="target" :size="27" /><strong>暂未找到目标记录</strong><p>调整关键词、部门或目标状态后再试一次。</p><button v-if="search || department || status" class="btn btn-small" @click="search = ''; department = ''; status = ''">查看全部目标</button></div>
    <div class="performance-note"><Icon name="target" :size="15" />完成标准：进度达到 100%，并填写评审分数。评审分数采用百分制。</div>
  </section>

  <Modal v-if="selected" title="更新目标进展" subtitle="记录真实进展，为成长对话提供依据。" @close="closeModal">
    <div class="goal-summary"><div class="person-cell"><span class="avatar" :style="avatarStyle(selected.name)">{{ selected.name.slice(-2) }}</span><div><span class="person-name">{{ selected.name }}</span><span class="person-subtitle">{{ selected.department }} · 截止 {{ selected.dueDate }}</span></div></div><p>{{ selected.objective }}</p></div>
    <div v-if="selected.status === '已完成'" class="info-banner"><p>该目标已完成。进度 {{ selected.progress }}%，评审分数 {{ selected.score }} / 100，记录已锁定。</p></div>
    <form v-if="selected.status !== '已完成'" id="performance-form" class="form-grid" @submit.prevent="save">
      <div class="form-field form-full"><label for="goal-progress">目标进度 <strong class="progress-label">{{ form.progress }}%</strong></label><div class="progress-editor"><input id="goal-progress" v-model.number="form.progress" type="range" min="0" max="100" step="1" aria-label="拖动更新目标进度" /><input v-model.number="form.progress" type="number" min="0" max="100" step="1" required aria-label="目标进度百分比" /></div></div>
      <label class="form-field">目标状态<select v-model="form.status"><option>进行中</option><option>待评审</option><option>已完成</option></select></label>
      <label class="form-field">评审分数<input v-model.number="form.score" type="number" min="0" max="100" step="1" :required="form.status === '已完成'" placeholder="0–100 分，未评审可留空" /></label>
      <p class="form-full form-hint"><Icon name="check" :size="15" />标记已完成时，需要进度为 100% 并填写评审分数。</p>
      <p v-if="error" class="form-error form-full" role="alert">{{ error }}</p>
    </form>
    <template #footer><button class="btn" :disabled="busy" @click="closeModal">取消</button><button v-if="selected.status !== '已完成'" class="btn btn-primary" type="submit" form="performance-form" :disabled="busy">{{ busy ? '正在保存…' : '保存进展' }}</button></template>
  </Modal>
</template>

<style scoped>
.performance-banner{display:flex;align-items:center;gap:20px;padding:27px 30px;background:linear-gradient(110deg,#eef2ff,#f7f8ff);border:1px solid #e6ebfb;border-radius:12px;margin-bottom:22px}.banner-icon{width:59px;height:59px;border-radius:16px;background:#e3eaff;display:grid;place-items:center;color:#6682e3}.banner-eyebrow{font-size:10px;letter-spacing:1px;color:#7c8dc1}.performance-banner h2{font-size:18px;line-height:1.4;margin:8px 0;color:#45578d}.performance-banner p{font-size:11px;color:#94a0bc;margin:0}.banner-progress{margin-left:auto;display:flex;flex-direction:column;text-align:right;gap:5px}.banner-progress strong{font-size:35px;font-weight:600;letter-spacing:-1px;color:#6881d7}.banner-progress small{font-size:16px;font-weight:400}.banner-progress>span{font-size:10px;color:#97a3c0}.metric-value small{font-size:13px;font-weight:400;margin-left:8px;color:#9197a7}.attention-value{color:#c67f48}.panel-title{display:flex;gap:10px;align-items:center}.record-count{font-size:10px;padding:3px 7px;border-radius:5px;background:#f0f3fa;color:#8591ab}.panel-caption{font-size:11px;color:#a0a7b6}.objective-text{max-width:230px;min-width:140px;white-space:normal;line-height:1.7;margin:0;color:#606d88;font-size:12px}.objective-progress{min-width:85px}.objective-progress>span{display:block;font-size:12px;color:#7184ba;margin-bottom:7px}.objective-progress small{font-size:10px;margin-left:1px}.objective-progress .progress-track{height:4px;max-width:100px}.progress-fill.completed{background:#74b699}.score-value{font-size:15px;font-weight:500;color:#5e6d89}.score-value small{font-size:10px;color:#a0a8b6;font-weight:400}.no-score{font-size:11px;color:#a7aeba}.due-date{font-size:11px;color:#8e99ae;font-variant-numeric:tabular-nums}.due-date.overdue{color:#bf825e}.action-column{text-align:right!important}.performance-note{font-size:10px;color:#9aa3b5;display:flex;align-items:center;gap:8px;padding:16px 22px;border-top:1px solid #edf0f5;line-height:1.7}.goal-summary{background:#f7f8fc;border:1px solid #eef0f6;border-radius:10px;padding:18px;margin-bottom:24px}.goal-summary>p{font-size:13px;color:#697795;line-height:1.8;margin:16px 0 0}.progress-label{float:right;color:#526fd1;font-weight:500}.progress-editor{display:flex;align-items:center;gap:17px}.progress-editor input[type=range]{accent-color:#5574e3;flex:1;min-width:0;box-shadow:none;border:0;padding:0}.progress-editor input[type=number]{width:74px;flex-shrink:0}.form-hint{font-size:10px;color:#929caf;display:flex;align-items:center;gap:7px;margin:4px 0}.empty-state strong{display:block;margin-top:12px}.empty-state p{font-size:12px}@media(max-width:650px){.performance-banner{padding:20px;gap:15px}.performance-banner h2{font-size:15px}.performance-banner p{font-size:10px}.banner-icon{display:none}.banner-progress strong{font-size:27px}.banner-progress>span{font-size:9px;white-space:nowrap}.panel-caption{display:none}}
</style>
