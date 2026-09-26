export const API_BASE = import.meta.env.VITE_PLACEMENT_API || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export interface Question {
  id: string; title: string; title_slug: string; source: string; type: string;
  difficulty: Difficulty; category: string; topics: string[]; workflow_phase: number;
  software_roles: string[]; companies: string[]; description: string;
  starter_code: Record<string, string>; reference_solution?: Record<string, string>;
  test_cases: Array<{ input: string; expected: string }>;
  related_videos?: { topic_video?: Video; problem_videos?: Video[] };
  solved?: boolean; opted_out?: boolean;
}
export interface Video { video_id: string; title: string; channel: string }
export interface Role { id: string; title: string; icon?: string; summary: string; rationale: string; key_topics: string[]; top_hiring_companies: string[]; phases: Array<{number:number;title:string;description:string;topics:string[]}>; question_count?: number }
export interface Company { name: string; problem_count: number; easy_pct: number; medium_pct: number; hard_pct: number; top_topics: string[] }
export interface Phase { number:number; title:string; description:string; questions_by_difficulty:Record<Difficulty,Question[]>; opted_out_questions:Question[]; total:number; solved:number; opted_out:number; progress_percentage:number }
export interface Workflow { mode:'role'|'company'; target_id:string; title:string; overall_progress:number; phases:Phase[] }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { credentials:'include', headers: {'Content-Type':'application/json'}, ...options });
  if (!response.ok) throw new Error((await response.text()) || `Request failed: ${response.status}`);
  return response.json();
}

export async function getRoles(): Promise<Role[]> {
  try { return await request<Role[]>('/api/workflows/roles'); }
  catch { const response = await fetch('/workflows.json'); return (await response.json()).roles; }
}
export async function getCompanies(): Promise<Company[]> {
  try { return await request<Company[]>('/api/companies?limit=500'); }
  catch { const response = await fetch('/company_profiles.json'); return Object.values((await response.json()).companies); }
}
export async function getQuestions(): Promise<Question[]> {
  try { return await request<Question[]>('/api/questions'); }
  catch { return (await fetch('/questions.json')).json(); }
}
export async function selectWorkflow(mode:'role'|'company', target_id:string) {
  localStorage.setItem('jobway-active-workflow', JSON.stringify({mode,target_id}));
  try { await request('/api/workflow/select', {method:'POST', body:JSON.stringify({mode,target_id})}); } catch { /* local fallback is intentional */ }
}
export async function getActiveWorkflow(): Promise<Workflow> {
  try {
    const active = await request<Workflow & {active_workflow?:null}>('/api/workflow/active');
    if (active.active_workflow === null) throw new Error('No active workflow');
    return active;
  } catch {
    const selected = JSON.parse(localStorage.getItem('jobway-active-workflow') || '{"mode":"role","target_id":"backend_swe"}');
    const [roles, questions] = await Promise.all([getRoles(), getQuestions()]);
    const role = roles.find(item => item.id === selected.target_id) || roles[0];
    const phases: Phase[] = role.phases.map(definition => {
      const pool = questions.filter(question => question.workflow_phase === definition.number && (selected.mode === 'company' ? question.companies?.some(value => value.toLowerCase() === selected.target_id.toLowerCase()) : question.software_roles?.includes(role.id)));
      const source = pool.length ? pool : questions.filter(question => question.workflow_phase === definition.number);
      return {number:definition.number,title:selected.mode==='company'?`${selected.target_id} — ${definition.title}`:definition.title,description:definition.description,questions_by_difficulty:{Easy:source.filter(q=>q.difficulty==='Easy'),Medium:source.filter(q=>q.difficulty==='Medium'),Hard:source.filter(q=>q.difficulty==='Hard')},opted_out_questions:[],total:source.length,solved:0,opted_out:0,progress_percentage:0};
    });
    return {mode:selected.mode,target_id:selected.target_id,title:selected.mode==='company'?`${selected.target_id} Custom Preparation Path`:`${role.title} Workflow`,overall_progress:0,phases};
  }
}
export const post = <T>(path:string, body:unknown) => request<T>(path,{method:'POST',body:JSON.stringify(body)});
