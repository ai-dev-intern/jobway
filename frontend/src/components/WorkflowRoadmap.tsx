import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Check, CheckCircle2, ChevronDown, Clock3, Code2, Flag,
  PlayCircle, RefreshCw, RotateCcw, SkipForward, Target, Trophy,
} from 'lucide-react';
import { Difficulty, getActiveWorkflow, Phase, post, Question, Workflow } from '../placementApi';
import { studyGuideById, StudyGuide } from '../data/studyGuides';
import StudyGuideModal from './StudyGuideModal';
import './PlacementPortal.css';

const levels: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const phaseDetails: Record<number, {duration:string; focus:string; checkpoints:string[]; gate:string}> = {
  1: {duration:'Weeks 1–2',focus:'Accuracy before speed',checkpoints:['Understand Big-O time and space trade-offs','Recognize array, hashing, and two-pointer patterns','Write a clean brute-force solution before optimizing','Complete the Easy foundation set without hints'],gate:'You can explain why your solution is correct and improve it without guessing.'},
  2: {duration:'Weeks 3–5',focus:'Choose the right structure',checkpoints:['Implement stacks, queues, linked lists, and heaps','Traverse trees iteratively and recursively','Compare sorting strategies and their constraints','Complete at least two Medium problems per core structure'],gate:'You choose a data structure from constraints, not from memorized titles.'},
  3: {duration:'Weeks 6–9',focus:'Model complex systems',checkpoints:['Distinguish BFS, DFS, greedy, and dynamic programming','Build a recurrence before writing DP code','Explain OS, DBMS, network, and OOP fundamentals aloud','Solve one unfamiliar advanced problem under 45 minutes'],gate:'You can connect algorithm choices to Core CS and defend trade-offs.'},
  4: {duration:'Weeks 10–12',focus:'Perform under interview constraints',checkpoints:['Complete the company 30-day high-frequency set','Run two timed mock interview sessions','Review every failed case and record the missed pattern','Re-solve weak problems after a 7-day gap'],gate:'You can solve, communicate, test, and optimize within a real interview window.'},
};

function ProblemCard({question, order, reload}:{question:Question;order:number;reload:()=>void}) {
  const navigate = useNavigate();
  const act = async (path:string, body:unknown) => { try { await post(path,body); } finally { reload(); } };
  return <article className={question.solved?'problem-card completed':'problem-card'}>
    <div className="problem-status">{question.solved?<span className="solved-dot"><Check size={11}/></span>:<span className="problem-order">{String(order).padStart(2,'0')}</span>}</div>
    <div className="problem-main"><div className="problem-meta"><span>{question.source}</span><span>·</span><span>{question.category}</span>{question.companies?.slice(0,2).map(company=><span className="company-pill" key={company}>{company}</span>)}</div><h4>{question.title}</h4><div className="chip-row">{question.topics.slice(0,3).map(topic=><span className="chip" key={topic}>{topic}</span>)}</div></div>
    <div className="problem-actions"><button className="btn-primary" onClick={()=>navigate(`/studio/${question.id}`)}><Code2 size={15}/> {question.solved?'Solve again':'Solve'}</button><button className="icon-action" title="Watch video" onClick={()=>navigate(`/studio/${question.id}`)}><PlayCircle/></button><button className="icon-action" title="Swap problem" onClick={()=>act('/api/workflow/swap',{question_id:question.id})}><RefreshCw/></button><button className="icon-action" title="Opt out" onClick={()=>act('/api/workflow/opt-out',{question_id:question.id,reason:'Skip for now',action:'opt_out'})}><SkipForward/></button></div>
  </article>;
}

function PhaseBlock({phase, workflowKey, checks, toggleCheck, onStudy, reload}:{phase:Phase;workflowKey:string;checks:Record<string,boolean>;toggleCheck:(id:string)=>void;onStudy:(guide:StudyGuide,checkId:string)=>void;reload:()=>void}) {
  const details = phaseDetails[phase.number];
  const phaseChecks = details.checkpoints.map((_,index)=>`${workflowKey}:${phase.number}:${index}`);
  const checkedCount = phaseChecks.filter(id=>checks[id]).length;
  const [open,setOpen] = useState(phase.number===1);
  const [tab,setTab] = useState<Difficulty|'Opted Out'>('Easy');
  const list = tab==='Opted Out'?phase.opted_out_questions:phase.questions_by_difficulty[tab];
  const complete = checkedCount===details.checkpoints.length && phase.progress_percentage===100;
  return <section className={open?'phase-block open':'phase-block'}>
    <button className="phase-header" onClick={()=>setOpen(!open)}><span className={complete?'phase-index done':'phase-index'}>{complete?<Check/>:`0${phase.number}`}</span><div><span className="rank">PHASE {phase.number} · {details.duration}</span><h3>{phase.title}</h3><p>{phase.description}</p></div><div className="phase-progress"><strong>{phase.progress_percentage}%</strong><small>{phase.solved} solved · {checkedCount}/{details.checkpoints.length} checkpoints</small><div className="mini-progress"><span style={{width:`${phase.progress_percentage}%`}}/></div></div><ChevronDown className="phase-chevron"/></button>
    {open&&<div className="phase-content">
      <div className="phase-learning-plan"><div className="plan-intro"><span><Clock3/> {details.duration}</span><span><Target/> Focus: {details.focus}</span><h4>What you need to check off</h4><p>Study each topic with its manuscript and focused video, then check it off when you can demonstrate it.</p></div><div className="checkpoint-list">{details.checkpoints.map((checkpoint,index)=>{const id=phaseChecks[index];const guide=studyGuideById[`phase-${phase.number}-${index}`];return <article className={checks[id]?'checkpoint checked':'checkpoint'} key={id}><button className="checkpoint-toggle" onClick={()=>toggleCheck(id)} aria-label={checks[id]?`Mark ${checkpoint} incomplete`:`Mark ${checkpoint} complete`}><span>{checks[id]?<Check/>:index+1}</span><div><strong>{checkpoint}</strong><small>{checks[id]?'Completed':'Mark complete when you can demonstrate this'}</small></div></button>{guide&&<button className="checkpoint-study" onClick={()=>onStudy(guide,id)}><BookOpen/> Study topic <PlayCircle/></button>}</article>})}</div><div className="phase-gate"><Flag/><div><span>PHASE EXIT CRITERIA</span><p>{details.gate}</p></div></div></div>
      <div className="question-section-heading"><div><BookOpen/><span><strong>Practice sequence</strong><small>Work Easy → Medium → Hard. Passing all 10 tests checks a problem off automatically.</small></span></div><span>{phase.solved}/{phase.total-phase.opted_out} complete</span></div>
      <div className="difficulty-tabs">{levels.map(level=><button className={tab===level?`active ${level.toLowerCase()}`:''} key={level} onClick={()=>setTab(level)}>{level}<span>{phase.questions_by_difficulty[level].length}</span></button>)}<button className={tab==='Opted Out'?'active':''} onClick={()=>setTab('Opted Out')}>Opted out <span>{phase.opted_out_questions.length}</span></button>{tab==='Easy'&&<button className="bulk-skip" onClick={()=>post('/api/workflow/opt-out-tier',{phase_number:phase.number,difficulty:'Easy'}).finally(reload)}><SkipForward size={14}/> Skip remaining Easy</button>}</div>
      <div className="problem-list">{list.length?list.map((question,index)=>tab==='Opted Out'?<article className="problem-card opted" key={question.id}><div className="problem-main"><h4>{question.title}</h4><p>{question.category} · {question.difficulty}</p></div><button className="btn-secondary" onClick={()=>post('/api/workflow/opt-out',{question_id:question.id,action:'restore'}).finally(reload)}><RotateCcw size={14}/> Restore</button></article>:<ProblemCard key={question.id} question={question} order={index+1} reload={reload}/>):<div className="empty-tier">No {tab.toLowerCase()} problems in this phase yet.</div>}</div>
    </div>}
  </section>;
}

export default function WorkflowRoadmap() {
  const [workflow,setWorkflow] = useState<Workflow>();
  const [version,setVersion] = useState(0);
  const [checks,setChecks] = useState<Record<string,boolean>>({});
  const [activeStudy,setActiveStudy] = useState<{guide:StudyGuide;checkId:string}>();
  const navigate = useNavigate();
  useEffect(()=>{ getActiveWorkflow().then(setWorkflow); },[version]);
  const workflowKey = workflow?`${workflow.mode}:${workflow.target_id}`:'loading';
  useEffect(()=>{ if(workflow){ try{setChecks(JSON.parse(localStorage.getItem(`jobway-checks:${workflowKey}`)||'{}'));}catch{setChecks({});} } },[workflow,workflowKey]);
  const toggleCheck = (id:string) => setChecks(current=>{const next={...current,[id]:!current[id]};localStorage.setItem(`jobway-checks:${workflowKey}`,JSON.stringify(next));return next});
  const completeCheck = (id:string) => setChecks(current=>{if(current[id])return current;const next={...current,[id]:true};localStorage.setItem(`jobway-checks:${workflowKey}`,JSON.stringify(next));return next});
  const checkpointProgress = useMemo(()=>{const total=16;const done=Object.values(checks).filter(Boolean).length;return Math.round(done/total*100)},[checks]);
  if(!workflow)return <div className="portal-page loading-state">Building your detailed roadmap…</div>;
  const combinedProgress=Math.round(workflow.overall_progress*.75+checkpointProgress*.25);
  return <div className="portal-page roadmap-page">
    <header className="roadmap-hero"><div><div className="eyebrow"><Target size={16}/> ACTIVE {workflow.mode.toUpperCase()} PATH</div><h1>{workflow.title}</h1><p>A step-by-step curriculum with learning checkpoints, progressive problem tiers, and clear exit criteria for every phase.</p></div><div className="readiness-orbit"><strong>{combinedProgress}%</strong><span>total path<br/>complete</span></div><button className="btn-secondary" onClick={()=>navigate('/prepare')}>Switch path</button></header>
    <section className="roadmap-dashboard"><div><span>12-week plan</span><strong>4 progressive phases</strong><small>Foundations to interview performance</small></div><div><span>Learning library</span><strong>16 manuscripts + videos</strong><small>{Object.values(checks).filter(Boolean).length} of 16 checkpoints completed</small></div><div><span>Problem progress</span><strong>{workflow.overall_progress}%</strong><small>Opted-out questions never block you</small></div><div><span>Completion rule</span><strong>10 / 10 tests</strong><small>Submissions check themselves off</small></div></section>
    <div className="roadmap-stepper">{workflow.phases.map(phase=>{const details=phaseDetails[phase.number];const ids=details.checkpoints.map((_,i)=>`${workflowKey}:${phase.number}:${i}`);const done=ids.filter(id=>checks[id]).length;return <button onClick={()=>document.getElementById(`phase-${phase.number}`)?.scrollIntoView({behavior:'smooth'})} key={phase.number}><span className={done===4&&phase.progress_percentage===100?'complete':phase.number===1?'active':''}>{done===4&&phase.progress_percentage===100?<Check/>:phase.number}</span><div><small>{details.duration}</small><strong>{phase.title}</strong><i><b style={{width:`${Math.max(phase.progress_percentage,done/4*100)}%`}}/></i></div></button>})}</div>
    <div className="phases">{workflow.phases.map(phase=><div id={`phase-${phase.number}`} key={phase.number}><PhaseBlock phase={phase} workflowKey={workflowKey} checks={checks} toggleCheck={toggleCheck} onStudy={(guide,checkId)=>setActiveStudy({guide,checkId})} reload={()=>setVersion(value=>value+1)}/></div>)}</div>
    <section className="roadmap-finish"><Trophy/><div><span>YOUR FINISH LINE</span><h2>Interview confidence, backed by evidence.</h2><p>Complete all phase checkpoints and verified questions, then use Company Chances to choose where to apply.</p></div><button className="btn-primary" onClick={()=>navigate('/companies/chances')}>View company readiness</button></section>
    {activeStudy&&<StudyGuideModal guide={activeStudy.guide} completed={!!checks[activeStudy.checkId]} onComplete={()=>completeCheck(activeStudy.checkId)} onClose={()=>setActiveStudy(undefined)}/>} 
  </div>;
}
