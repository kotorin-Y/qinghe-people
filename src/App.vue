<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './components/Icon.vue';
import LoginView from './views/LoginView.vue';
import { authenticated, logout } from './services/auth';
import GlobalSearch from './components/GlobalSearch.vue';
import DashboardView from './views/DashboardView.vue';
import PeopleView from './views/PeopleView.vue';
import OrganizationView from './views/OrganizationView.vue';
import RecruitmentView from './views/RecruitmentView.vue';
import LifecycleView from './views/LifecycleView.vue';
import TasksView from './views/TasksView.vue';
import PerformanceView from './views/PerformanceView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import SettingsView from './views/SettingsView.vue';
import { data, page, navigate, refresh, loading, loadError, toast, pendingTasks } from './store';
import type { Page } from './types';
const searchOpen = ref(false);
const navOpen = ref(false);
const links: { id: Page; label: string; icon: string; group?: string }[] = [
  { id: 'dashboard', label: '工作台', icon: 'dashboard', group: '工作空间' },
  { id: 'tasks', label: '待办与审批', icon: 'tasks' },
  { id: 'people', label: '员工管理', icon: 'users', group: '人才全生命周期' },
  { id: 'organization', label: '组织与编制', icon: 'organization' },
  { id: 'recruitment', label: '招聘管理', icon: 'briefcase' },
  { id: 'lifecycle', label: '入转调离', icon: 'path' },
  { id: 'performance', label: '绩效与发展', icon: 'target' },
  { id: 'analytics', label: '人力分析', icon: 'chart', group: '组织洞察' }
];
const title = computed(() => links.find(l => l.id === page.value)?.label || '系统与审计');
const views = { dashboard: DashboardView, people: PeopleView, organization: OrganizationView, recruitment: RecruitmentView, lifecycle: LifecycleView, tasks: TasksView, performance: PerformanceView, analytics: AnalyticsView, settings: SettingsView };
function go(id: Page) { navigate(id); navOpen.value = false; }
function onKey(event: KeyboardEvent) { if (!authenticated.value) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchOpen.value = !searchOpen.value; } if (event.key === 'Escape') navOpen.value = false; }
watch(authenticated, loggedIn => { searchOpen.value=false; navOpen.value=false; if(loggedIn){loading.value=true;refresh().catch(()=>{});} }, {immediate:true});
onMounted(() => { window.addEventListener('keydown', onKey); });
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>
<template>
  <LoginView v-if="!authenticated"/>
  <div v-else class="app-shell">
    <div v-if="navOpen" class="nav-overlay" @click="navOpen=false"></div>
    <aside class="sidebar" :class="{ 'is-open': navOpen }">
      <a href="#dashboard" class="brand" @click.prevent="go('dashboard')"><span class="brand-mark"><i></i><i></i><i></i></span><span class="brand-word">青禾 <em>People</em></span></a>
      <button class="company-switch" @click="go('settings')"><span class="company-avatar"><Icon name="buildings" :size="19"/></span><span><strong>{{ data.meta.company }}</strong><small>企业工作空间</small></span><Icon name="chevronDown" :size="15"/></button>
      <nav aria-label="主导航"><template v-for="link in links" :key="link.id"><p v-if="link.group" class="nav-caption">{{ link.group }}</p><a :href="`#${link.id}`" class="nav-item" :class="{ active: page === link.id }" :aria-current="page === link.id ? 'page' : undefined" @click.prevent="go(link.id)"><Icon :name="link.icon" :weight="page===link.id ? 'duotone' : 'regular'"/><span>{{ link.label }}</span><span v-if="link.id==='tasks' && pendingTasks.length" class="nav-count">{{ pendingTasks.length }}</span><span v-if="link.id==='analytics'" class="new-label">NEW</span></a></template></nav>
      <div class="sidebar-bottom"><div class="workspace-note"><span class="note-icon"><Icon name="shield" :size="19"/></span><div><strong>{{ data.meta.demo ? '产品体验工作空间' : '企业工作空间' }}</strong><p>{{ data.meta.demo ? '使用虚构数据，自由探索' : '协同人才与组织成长' }}</p></div></div><a href="#settings" class="nav-item" :class="{active:page==='settings'}" @click.prevent="go('settings')"><Icon name="settings"/><span>系统与审计</span></a><button class="nav-item logout-action" @click="logout"><Icon name="logout"/><span>退出登录</span></button><button class="user-profile" @click="go('settings')"><span class="avatar user-avatar">悦</span><span><strong>{{ data.meta.user.name }}</strong><small>{{ data.meta.user.role }}</small></span><Icon name="chevronDown" :size="16"/></button></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" aria-label="打开导航" @click="navOpen=true"><Icon name="menu"/></button><span>工作空间</span><span class="breadcrumb-slash">/</span><strong>{{ title }}</strong></div><div class="topbar-actions"><button class="global-search" @click="searchOpen=true"><Icon name="search" :size="17"/><span>搜索员工、职位、事项</span><kbd>Ctrl K</kbd></button><span class="demo-label">{{ data.meta.demo ? '演示环境' : '企业数据' }}</span><span class="topbar-divider"></span><button class="icon-btn notification-button" aria-label="查看待办通知" @click="go('tasks')"><Icon name="bell"/><i v-if="pendingTasks.length"></i></button><span class="avatar top-avatar">悦</span></div></header>
      <main id="main-content" class="main-content"><div v-if="loading" class="app-loading"><span class="spinner"></span><h2>正在准备你的工作空间</h2><p>员工、流程和团队动态即将就绪</p></div><div v-else-if="loadError" class="error-panel"><Icon name="warning" :size="40"/><h2>暂时无法连接数据服务</h2><p>{{ loadError }}</p><button class="btn btn-primary" @click="refresh().catch(()=>{})"><Icon name="refresh" :size="17"/>重新连接</button></div><component :is="views[page]" v-else :key="page"/></main>
      <footer class="app-footer"><span>青禾 People <span class="footer-dot">·</span> 让人才与组织一起成长</span><span>{{ data.meta.demo ? '演示数据截至' : '数据截至' }} {{ data.meta.referenceDate }}</span></footer>
    </div>
    <GlobalSearch v-if="searchOpen" @close="searchOpen=false"/>
    <Transition name="toast"><div v-if="toast.text" class="toast-message" :class="{'toast-error':toast.type==='error'}" role="status" aria-live="polite"><Icon :name="toast.type==='error'?'warning':'checkCircle'" :size="20"/><span>{{ toast.text }}</span><button class="icon-btn" aria-label="关闭提示" @click="toast.text=''"><Icon name="x" :size="16"/></button></div></Transition>
  </div>
</template>
