import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, CheckCircle2, ChevronRight, Code2, Filter, Search, Sparkles, Target } from 'lucide-react';
import { Company, Difficulty, getCompanies, getQuestions, Question } from '../placementApi';
import './PlacementPortal.css';

const difficulties: Array<'All' | Difficulty> = ['All', 'Easy', 'Medium', 'Hard'];

export default function PracticeHub() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');
  const [topic, setTopic] = useState('All topics');
  const mode = params.get('mode') === 'company' ? 'company' : 'dsa';
  const company = params.get('company') || 'Amazon';

  useEffect(() => { getQuestions().then(setQuestions); getCompanies().then(values=>setCompanies(values.filter(item=>item.problem_count>0))); }, []);
  const topics = useMemo(() => ['All topics', ...Array.from(new Set(questions.filter(item=>item.type==='Programming').flatMap(item=>item.topics))).sort()], [questions]);
  const pool = useMemo(() => questions.filter(item => {
    if (mode === 'dsa' && item.type !== 'Programming') return false;
    if (mode === 'company' && !item.companies?.some(value=>value.toLowerCase()===company.toLowerCase())) return false;
    if (difficulty !== 'All' && item.difficulty !== difficulty) return false;
    if (topic !== 'All topics' && !item.topics.includes(topic)) return false;
    const haystack = `${item.title} ${item.category} ${item.topics.join(' ')}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [questions, mode, company, difficulty, topic, query]);
  const count = (level: Difficulty) => pool.filter(item=>item.difficulty===level).length;
  const setMode = (next:'dsa'|'company') => setParams(next==='company'?{mode:'company',company}:{mode:'dsa'});
  const setCompany = (name:string) => setParams({mode:'company',company:name});
  const featured = pool[0];

  return <div className="portal-page practice-page">
    <header className="practice-hero">
      <div><div className="eyebrow"><Sparkles size={15}/> INTENTIONAL PRACTICE</div><h1>Build patterns.<br/><span>Not streak anxiety.</span></h1><p>Choose a topic or a target company, then work through verified questions at the right difficulty.</p></div>
      <div className="practice-stat-stack"><div><strong>{questions.filter(q=>q.type==='Programming').length}</strong><span>verified DSA problems</span></div><div><strong>{companies.length}</strong><span>company pools ready</span></div><div><strong>10</strong><span>tests per submission</span></div></div>
    </header>

    <div className="practice-mode-switch" role="tablist"><button className={mode==='dsa'?'active':''} onClick={()=>setMode('dsa')}><Code2/> Pure DSA practice<span>Topic-first preparation</span></button><button className={mode==='company'?'active':''} onClick={()=>setMode('company')}><Building2/> Company-wise practice<span>Targeted interview pools</span></button></div>

    {mode==='company'&&<section className="company-strip"><span><Target size={16}/> Practicing for</span><select value={company} onChange={event=>setCompany(event.target.value)}>{companies.map(item=><option key={item.name}>{item.name}</option>)}</select><p>Showing questions historically associated with <strong>{company}</strong>.</p></section>}

    {featured&&<section className="featured-practice"><div className="featured-kicker"><span>START HERE</span><i/></div><div><span className={`difficulty ${featured.difficulty.toLowerCase()}`}>{featured.difficulty}</span><h2>{featured.title}</h2><p>{featured.description}</p><div className="chip-row">{featured.topics.slice(0,5).map(value=><span className="chip" key={value}>{value}</span>)}</div></div><button className="btn-primary" onClick={()=>navigate(`/studio/${featured.id}`)}>Solve recommended problem <ChevronRight size={16}/></button></section>}

    <section className="practice-browser">
      <aside className="practice-filters"><div className="filter-title"><Filter size={16}/> Refine practice</div><label>Search problems<div className="filter-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Two Sum, graphs…"/></div></label><label>Topic<select value={topic} onChange={event=>setTopic(event.target.value)}>{topics.map(value=><option key={value}>{value}</option>)}</select></label><div className="filter-block"><span>Difficulty</span>{difficulties.map(level=><button className={difficulty===level?'active':''} onClick={()=>setDifficulty(level)} key={level}>{level}<small>{level==='All'?pool.length:count(level as Difficulty)}</small></button>)}</div><div className="practice-note"><BarChart3/><div><strong>Practice deliberately</strong><p>Try for 25 minutes, inspect failed cases, then watch the walkthrough.</p></div></div></aside>
      <div className="practice-results"><header><div><span className="rank">{mode==='company'?company.toUpperCase():'ALL DSA'} QUESTION SET</span><h2>{pool.length} problems matched</h2></div><span className="result-legend"><i className="easy"/> Easy <i className="medium"/> Medium <i className="hard"/> Hard</span></header><div className="practice-list">{pool.map((question,index)=><article className="practice-question" key={question.id}><span className="practice-number">{String(index+1).padStart(2,'0')}</span><div className="practice-question-main"><div><span className={`difficulty ${question.difficulty.toLowerCase()}`}>{question.difficulty}</span><span className="source-label">{question.source}</span></div><h3>{question.title}</h3><p>{question.description}</p><div className="chip-row">{question.topics.slice(0,4).map(value=><span className="chip" key={value}>{value}</span>)}</div></div><div className="practice-question-action"><span><CheckCircle2 size={14}/> 10 verified tests</span><button className="btn-secondary" onClick={()=>navigate(`/studio/${question.id}`)}>Practice <ChevronRight size={15}/></button></div></article>)}</div>{!pool.length&&<div className="empty-practice"><Search/><h3>No problems match this combination</h3><p>Clear a filter or choose another company to continue.</p><button className="btn-secondary" onClick={()=>{setQuery('');setDifficulty('All');setTopic('All topics')}}>Reset filters</button></div>}</div>
    </section>
  </div>;
}
