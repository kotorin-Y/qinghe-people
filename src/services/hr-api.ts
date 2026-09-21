import type { AppData } from '../types';
import { LocalDataSource } from './local-data.ts';

/** Enterprise systems implement this contract; pages never depend on a vendor API. */
export interface HrDataSource {
  bootstrap(): Promise<AppData>;
  write(path: string, body: unknown, method: string): Promise<{ data: unknown }>;
}

export class HrHttpDataSource implements HrDataSource {
  private readonly base: string;
  constructor(base = '/api') {
    const normalized = base.trim().replace(/\/+$/, '');
    if (!normalized || normalized.startsWith('//') || (!normalized.startsWith('/') && !/^https?:\/\//.test(normalized))) throw new Error('数据接口地址须为 /api 形式的路径或 HTTP(S) 地址');
    this.base = normalized;
  }

  private async request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(this.base + path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('数据接口未返回 JSON，请检查企业接口地址或代理配置');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `数据请求失败（${response.status}）`);
    return result;
  }

  async bootstrap(): Promise<AppData> {
    const result = await this.request('/bootstrap');
    const collections = ['employees', 'jobs', 'candidates', 'tasks', 'lifecycles', 'performance', 'departments', 'events', 'audit'];
    if (!result || collections.some(key => !Array.isArray(result[key])) || typeof result.meta?.demo !== 'boolean' || typeof result.meta?.company !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(result.meta?.referenceDate) || typeof result.meta?.user?.name !== 'string' || typeof result.meta?.user?.role !== 'string') throw new Error('数据源格式不符合 HR 接口契约，请检查集合和 meta 字段');
    return result as AppData;
  }

  async write(path: string, body: unknown, method: string): Promise<{ data: unknown }> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new Error('业务接口路径无效');
    return this.request(path, method, body);
  }
}

export const apiBase = import.meta.env?.VITE_HR_API_BASE_URL || '';
export const hrApi: HrDataSource = apiBase ? new HrHttpDataSource(apiBase) : new LocalDataSource();
