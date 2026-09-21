import { computed, reactive, ref } from 'vue';
import type { AppData, Page } from './types';
import { hrApi } from './services/hr-api';
export const data = reactive<AppData>({ employees: [], jobs: [], candidates: [], tasks: [], lifecycles: [], performance: [], departments: [], events: [], audit: [], meta: { demo: true, referenceDate: '2026-09-20', company: '星云科技', user: { name: '林悦', role: 'HR 负责人' } } });
const validPages: Page[] = ['dashboard','people','organization','recruitment','lifecycle','tasks','performance','analytics','settings'];
function hashPage(): Page { const hash = location.hash.slice(1) as Page; return validPages.includes(hash) ? hash : 'dashboard'; }
export const page = ref<Page>(hashPage());
export function navigate(next: Page) { page.value = next; location.hash = next; window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.addEventListener('hashchange', () => { page.value = hashPage(); });
export const loading = ref(true);
export const loadError = ref('');
export const busy = ref(false);
export const toast = ref({ text: '', type: 'success' });
let toastTimer: ReturnType<typeof setTimeout>;
export function notify(text: string, type = 'success') { clearTimeout(toastTimer); toast.value = { text, type }; toastTimer = setTimeout(() => { toast.value.text = ''; }, 4500); }
export async function refresh() { loadError.value = ''; try { Object.assign(data, await hrApi.bootstrap()); } catch (error) { loadError.value = error instanceof Error ? error.message : '加载失败'; throw error; } finally { loading.value = false; } }
export async function mutate(path: string, body: unknown, method = 'POST', success = '已保存') { if (busy.value) return false; busy.value = true; let saved = false; try { await hrApi.write(path, body, method); saved = true; await refresh(); notify(success); return true; } catch (error) { notify(saved ? '操作已保存，但刷新失败。请重新连接获取最新状态，勿重复提交。' : error instanceof Error ? error.message : '操作失败', 'error'); return saved; } finally { busy.value = false; } }
export const activeEmployees = computed(() => data.employees.filter(e => ['正式', '试用'].includes(e.status)));
export const pendingTasks = computed(() => data.tasks.filter(t => t.status === '待处理'));
export const openJobs = computed(() => data.jobs.filter(j => j.status === '招聘中'));
export const headcountBudget = computed(() => data.departments.reduce((n, d) => n + d.headcountBudget, 0));
export const stageNames = ['简历筛选', '初试', '复试', 'Offer', '待入职'];
export function dateLabel(value: string) { if (!value) return '—'; return value.slice(5).replace('-', '月') + '日'; }
export function avatarStyle(name: string) { const colors = [['#edf0ff', '#5266b5'], ['#e8f4ef','#458775'], ['#fff0e5','#ba8351'], ['#f3ebfa','#9870b4'], ['#e8f2fc','#5a84ae']]; const color = colors[Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % colors.length]!; return { background: color[0], color: color[1] }; }
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) { const escape = (value: string | number) => '"' + String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"'; const blob = new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); notify('报表已导出'); }
