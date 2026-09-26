import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Building2, Radar, Target } from "lucide-react";
import {
  API_BASE,
  Company,
  getCompanies,
  selectWorkflow,
} from "../placementApi";
import "./PlacementPortal.css";

interface Card extends Company {
  readiness_score: number;
  missing_topics: string[];
  gap_problems: Array<{ title: string; difficulty: string }>;
}
interface Groups {
  high_chance: Card[];
  within_reach: Card[];
  stretch_targets: Card[];
}
const sections: [keyof Groups, string, string][] = [
  ["high_chance", "High chance", "Ready to interview now"],
  ["within_reach", "Within reach", "A focused gap sprint can unlock these"],
  [
    "stretch_targets",
    "Stretch targets",
    "Build the missing patterns deliberately",
  ],
];
export default function CompanyChancesView() {
  const [groups, setGroups] = useState<Groups>({
    high_chance: [],
    within_reach: [],
    stretch_targets: [],
  });
  const navigate = useNavigate();
  useEffect(() => {
    fetch(`${API_BASE}/api/companies/chances`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setGroups)
      .catch(async () => {
        const companies = await getCompanies();
        setGroups({
          high_chance: [],
          within_reach: [],
          stretch_targets: companies.slice(0, 12).map((c) => ({
            ...c,
            readiness_score: 0,
            missing_topics: c.top_topics || [],
            gap_problems: [],
          })),
        });
      });
  }, []);
  const prepare = async (name: string) => {
    await selectWorkflow("company", name);
    navigate("/workflow");
  };
  return (
    <div className="portal-page chances-page">
      <header className="chances-hero">
        <div>
          <div className="eyebrow">
            <Radar size={16} /> LIVE READINESS MAP
          </div>
          <h1>Companies you can crack</h1>
          <p>
            Your score blends company-specific coverage, transferable topic
            mastery, and Core CS depth. It updates after every accepted
            submission.
          </p>
        </div>
        <div className="score-formula">
          <span>55% company problems</span>
          <span>30% topic transfer</span>
          <span>15% Core CS</span>
        </div>
      </header>
      {sections.map(([key, title, subtitle]) => (
        <section className={`chance-section ${key}`} key={key}>
          <div className="chance-heading">
            <span className="chance-light" />
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <strong>{groups[key].length}</strong>
          </div>
          <div className="chance-grid">
            {groups[key]
              .slice(0, key === "stretch_targets" ? 12 : 8)
              .map((company) => (
                <article className="chance-card" key={company.name}>
                  <header>
                    <span className="company-monogram small">
                      {company.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{company.name}</h3>
                      <p>{company.problem_count} tracked questions</p>
                    </div>
                    <div className="score">
                      <strong>{company.readiness_score}%</strong>
                      <span>ready</span>
                    </div>
                  </header>
                  <div className="score-bar">
                    <span style={{ width: `${company.readiness_score}%` }} />
                  </div>
                  <div className="card-section">
                    <span>Priority topics</span>
                    <div className="chip-row">
                      {(company.missing_topics?.length
                        ? company.missing_topics
                        : company.top_topics
                      )
                        .slice(0, 4)
                        .map((t) => (
                          <span className="chip" key={t}>
                            {t}
                          </span>
                        ))}
                    </div>
                  </div>
                  {company.gap_problems?.length > 0 && (
                    <div className="gap-preview">
                      <Target size={15} />
                      <span>Next: {company.gap_problems[0].title}</span>
                    </div>
                  )}
                  <button
                    className="card-link"
                    onClick={() => prepare(company.name)}
                  >
                    Prepare for {company.name} <ArrowUpRight size={15} />
                  </button>
                </article>
              ))}
          </div>
          {!groups[key].length && (
            <div className="empty-chance">
              <Building2 />
              <span>
                Keep solving—companies will move into this tier as your coverage
                grows.
              </span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
