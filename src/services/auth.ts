import { ref } from 'vue';
const KEY = 'qinghe.session.v1';
const lifetime = 8 * 60 * 60 * 1000;
function valid() { try { const session = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return session?.username === 'admin' && Number.isFinite(session.expires) && session.expires > Date.now(); } catch { return false; } }
export const authenticated = ref(valid());
export function login(username: string, password: string) { if (username.trim() !== 'admin' || password !== '123') throw new Error('用户名或密码不正确，请重新输入'); sessionStorage.setItem(KEY, JSON.stringify({username:'admin',expires:Date.now()+lifetime})); authenticated.value=true; }
export function logout() { sessionStorage.removeItem(KEY); authenticated.value=false; }
export function requireSession() { if (!valid()) { authenticated.value=false; throw new Error('登录已过期，请重新登录'); } }
if(typeof window !== 'undefined') window.setInterval(() => { if (authenticated.value && !valid()) logout(); }, 30000);
// This is a local demonstration gate, not a production authentication boundary.
