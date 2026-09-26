import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { API_BASE, Role, selectWorkflow } from "../placementApi";

interface Option {
  id: string;
  label: string;
  weights: Record<string, number>;
}
interface QuizItem {
  id: string;
  scenario: string;
  options: Option[];
}
interface Recommendation {
  role_id: string;
  title: string;
  match_percentage: number;
  rationale: string;
  key_topics: string[];
  top_hiring_companies: string[];
}

export default function CareerQuizModal({
  roles,
  onClose,
  onStarted,
}: {
  roles: Role[];
  onClose: () => void;
  onStarted: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Recommendation[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/career/quiz`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => fetch("/career_quiz.json").then((r) => r.json()))
      .then(setQuiz);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const assess = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/career/assess`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      setResults((await r.json()).recommendations);
    } catch {
      const scores: Record<string, number> = {};
      quiz.forEach((q) => {
        const option = q.options.find((o) => o.id === answers[q.id]);
        Object.entries(option?.weights || {}).forEach(
          ([role, w]) => (scores[role] = (scores[role] || 0) + w),
        );
      });
      const possible: Record<string, number> = {};
      quiz.forEach((q) => {
        const maxForQuestion: Record<string, number> = {};
        q.options.forEach((option) =>
          Object.entries(option.weights).forEach(
            ([role, w]) =>
              (maxForQuestion[role] = Math.max(maxForQuestion[role] || 0, w)),
          ),
        );
        Object.entries(maxForQuestion).forEach(
          ([role, w]) => (possible[role] = (possible[role] || 0) + w),
        );
      });
      setResults(
        Object.entries(scores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, score]) => {
            const role = roles.find((r) => r.id === id)!;
            return {
              role_id: id,
              title: role.title,
              match_percentage: Math.min(
                99,
                Math.round((score / Math.max(1, possible[id])) * 100),
              ),
              rationale: role.rationale,
              key_topics: role.key_topics,
              top_hiring_companies: role.top_hiring_companies,
            };
          }),
      );
    }
  };
  const current = quiz[index];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="quiz-modal glass-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        {!results.length ? (
          <>
            <div className="eyebrow">
              <Sparkles size={16} /> Career compass · {index + 1} of{" "}
              {quiz.length || 10}
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={1}
              aria-valuemax={quiz.length || 10}
              aria-valuenow={index + 1}
            >
              <span
                style={{
                  width: `${((index + 1) / (quiz.length || 10)) * 100}%`,
                }}
              />
            </div>
            <h2>{current?.scenario || "Loading your career compass…"}</h2>
            <div className="quiz-options">
              {current?.options.map((option) => (
                <button
                  key={option.id}
                  className={
                    answers[current.id] === option.id
                      ? "quiz-option selected"
                      : "quiz-option"
                  }
                  onClick={() =>
                    setAnswers({ ...answers, [current.id]: option.id })
                  }
                >
                  <span>{option.id.toUpperCase()}</span>
                  {option.label}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                disabled={!index}
                onClick={() => setIndex(index - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              {index < quiz.length - 1 ? (
                <button
                  className="btn-primary"
                  disabled={!answers[current?.id]}
                  onClick={() => setIndex(index + 1)}
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn-primary"
                  disabled={Object.keys(answers).length < quiz.length}
                  onClick={assess}
                >
                  See my matches
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow">
              <Sparkles size={16} /> Your top job paths
            </div>
            <h2>These careers may fit you well</h2>
            <div className="recommendations">
              {results.map((item, rank) => (
                <article className="recommendation" key={item.role_id}>
                  <div className="match-ring">
                    <strong>{item.match_percentage}%</strong>
                    <small>match</small>
                  </div>
                  <div>
                    <span className="rank">#{rank + 1} recommendation</span>
                    <h3>{item.title}</h3>
                    <p>{item.rationale}</p>
                    <div className="chip-row">
                      {item.key_topics.slice(0, 4).map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      await selectWorkflow("role", item.role_id);
                      onStarted();
                    }}
                  >
                    Start workflow
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
