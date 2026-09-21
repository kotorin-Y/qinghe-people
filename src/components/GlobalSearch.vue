<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from './Modal.vue';
import Icon from './Icon.vue';
import { data, navigate } from '../store';
import type { Page } from '../types';
const emit = defineEmits<{ close: [] }>();
const query = ref('');
const results = computed(() => {
  const term = query.value.trim().toLowerCase();
  const all = [
    ...data.employees.map(e => ({ title: e.name, subtitle: `${e.department} · ${e.position}`, page: 'people' as Page, icon: 'users' })),
    ...data.jobs.map(j => ({ title: j.title, subtitle: `招聘职位 · ${j.department}`, page: 'recruitment' as Page, icon: 'briefcase' })),
    ...data.tasks.map(t => ({ title: t.title, subtitle: `${t.subject} · ${t.status}`, page: 'tasks' as Page, icon: 'tasks' }))
  ];
  return term ? all.filter(r => `${r.title}${r.subtitle}`.toLowerCase().includes(term)).slice(0, 12) : [];
});
function go(page: Page) { navigate(page); emit('close'); }
</script>
<template><Modal title="全局搜索" subtitle="查找员工、招聘职位和待办事项" @close="emit('close')"><div class="search-field full-search"><Icon name="search"/><input v-model="query" autofocus placeholder="搜索姓名、职位或事项…" aria-label="全局搜索关键词"/></div><div v-if="!query" class="empty-state"><Icon name="search" :size="32"/><p>从一个名字或关键词开始</p><span>例如：技术研发、产品经理、转正</span></div><div v-else-if="!results.length" class="empty-state"><p>没有找到“{{ query }}”</p><span>试试其他姓名或关键词</span></div><button v-for="(result,i) in results" :key="i" class="search-result" @click="go(result.page)"><span class="result-icon"><Icon :name="result.icon"/></span><span><strong>{{ result.title }}</strong><small>{{ result.subtitle }}</small></span><Icon name="arrowUpRight" :size="17"/></button></Modal></template>
