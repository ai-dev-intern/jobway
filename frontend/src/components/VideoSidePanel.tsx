import { useState } from 'react';
import { ChevronRight, PlayCircle, Video as VideoIcon } from 'lucide-react';
import { Video } from '../placementApi';

export default function VideoSidePanel({topic,problem}:{topic?:Video;problem?:Video}){
  const [open,setOpen]=useState(true); const [tab,setTab]=useState<'topic'|'problem'>('topic'); const active=tab==='topic'?topic:problem;
  if(!open)return <button className="video-reopen" onClick={()=>setOpen(true)}><VideoIcon/> Learn</button>;
  return <aside className="video-panel"><header><div><span className="eyebrow"><PlayCircle size={14}/> Guided learning</span><h3>Video studio</h3></div><button className="btn-icon" onClick={()=>setOpen(false)} aria-label="Collapse video"><ChevronRight/></button></header><div className="video-tabs"><button className={tab==='topic'?'active':''} onClick={()=>setTab('topic')}>Concept</button><button className={tab==='problem'?'active':''} onClick={()=>setTab('problem')}>Walkthrough</button></div>{active?<><div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${active.video_id}`} title={active.title} allowFullScreen/></div><h4>{active.title}</h4><p>{active.channel}</p></>:<div className="empty-mini">No video matched yet.</div>}<div className="video-note">Watch, pause, then implement the idea without copying. Retrieval practice beats passive viewing.</div></aside>
}

