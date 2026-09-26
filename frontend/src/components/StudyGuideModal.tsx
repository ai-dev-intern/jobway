import { BookOpen, Check, CheckCircle2, Clock3, ExternalLink, PlayCircle, Target, X } from 'lucide-react';
import { StudyGuide } from '../data/studyGuides';
import './PlacementPortal.css';

interface StudyGuideModalProps {
  guide: StudyGuide;
  completed: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function StudyGuideModal({ guide, completed, onClose, onComplete }: StudyGuideModalProps) {
  return <div className="study-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="study-modal" role="dialog" aria-modal="true" aria-labelledby="study-guide-title">
      <header className="study-header">
        <div><span className="study-kicker"><BookOpen/> CHECKPOINT MANUSCRIPT</span><h2 id="study-guide-title">{guide.title}</h2><p>{guide.summary}</p></div>
        <button className="study-close" onClick={onClose} aria-label="Close study guide"><X/></button>
      </header>
      <div className="study-layout">
        <main className="manuscript">
          <div className="study-meta"><span><Clock3/> {guide.readTime} read</span><span><Target/> Interview focused</span></div>
          <section className="study-objectives"><span>After this lesson, you can</span><ul>{guide.objectives.map(item => <li key={item}><CheckCircle2/>{item}</li>)}</ul></section>
          {guide.sections.map(section => <section className="manuscript-section" key={section.heading}>
            <h3>{section.heading}</h3>
            {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
            {section.code && <pre className="study-code"><code>{section.code}</code></pre>}
          </section>)}
          <section className="study-takeaways"><span>QUICK RECALL</span><h3>Keep these three ideas</h3>{guide.takeaways.map((item,index)=><div key={item}><b>0{index+1}</b><p>{item}</p></div>)}</section>
          <details className="interview-drill"><summary>Interview check: {guide.drill.question}</summary><p>{guide.drill.answer}</p></details>
        </main>
        <aside className="study-video-column">
          <div className="study-video-card">
            <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${guide.video.id}`} title={guide.video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>
            <div className="video-copy"><span><PlayCircle/> GUIDED VIDEO</span><h3>{guide.video.title}</h3><p>{guide.video.channel}</p><a href={`https://www.youtube.com/watch?v=${guide.video.id}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink/></a></div>
          </div>
          <div className="study-complete-card"><span>{completed?<CheckCircle2/>:<BookOpen/>}</span><h3>{completed?'Checkpoint complete':'Ready to check it off?'}</h3><p>{completed?'Your progress is saved on this device. Revisit the material whenever you need a refresher.':'Finish the manuscript, watch the lesson, and make sure you can answer the interview check.'}</p><button className={completed?'btn-secondary':'btn-primary'} disabled={completed} onClick={onComplete}>{completed?<><Check/> Completed</>:<>Mark studied & complete</>}</button></div>
        </aside>
      </div>
    </section>
  </div>;
}
