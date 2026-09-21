export interface Employee { id: string; name: string; englishName: string; department: string; position: string; level: string; location: string; employmentType: string; status: string; joinDate: string; manager: string; email: string }
export interface Job { id: string; title: string; department: string; level: string; location: string; headcount: number; status: string; owner: string; salaryRange: string; openedAt: string }
export type Resume = { kind:'profile'; summary:string; education:string; experiences:{company:string;period:string;position:string;description:string}[]; skills:string[]; demo?:boolean } | {kind:'pdf'|'image';name:string;dataUrl:string};
export interface Candidate { id: string; name: string; jobId: string; stage: string; source: string; experience: string; appliedAt: string; tags: string[]; resume?:Resume }
export interface Task { id: string; title: string; category: string; subject: string; department: string; dueDate: string; priority: string; status: string; description: string }
export interface Lifecycle { id: string; employeeId: string; name: string; department: string; type: string; effectiveDate: string; owner: string; status: string; checklist: { id: string; label: string; done: boolean }[] }
export interface Performance { id: string; employeeId: string; name: string; department: string; objective: string; progress: number; score: number | null; status: string; dueDate: string }
export interface Department { id: string; name: string; headcountBudget: number; costBudget: number }
export interface CalendarEvent { id: string; title: string; time: string; date: string; type: string; participants: string }
export interface Audit { id: string; action: string; entity: string; detail: string; createdAt: string }
export interface AppData { employees: Employee[]; jobs: Job[]; candidates: Candidate[]; tasks: Task[]; lifecycles: Lifecycle[]; performance: Performance[]; departments: Department[]; events: CalendarEvent[]; audit: Audit[]; meta: { demo: boolean; referenceDate: string; company: string; user: { name: string; role: string } } }
export type Page = 'dashboard' | 'people' | 'organization' | 'recruitment' | 'lifecycle' | 'tasks' | 'performance' | 'analytics' | 'settings';
