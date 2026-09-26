import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  BrainCircuit,
  Briefcase,
  Bug,
  Building2,
  ChevronRight,
  CloudCog,
  Code2,
  Compass,
  Cpu,
  Database,
  Gamepad2,
  Layers3,
  Layout,
  Palette,
  Search,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";
import CareerQuizModal from "./CareerQuizModal";
import {
  Company,
  getCompanies,
  getRoles,
  Role,
  selectWorkflow,
} from "../placementApi";
import "./PlacementPortal.css";

export default function OnboardingHub() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [quiz, setQuiz] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getRoles().then(setRoles);
    getCompanies().then((values) => {
      setCompanies(values);
      setSelected(
        values.find((company) => company.name === "Amazon") ||
          values[0] ||
          null,
      );
    });
  }, []);

  const matches = useMemo(
    () =>
      companies
        .filter((company) =>
          company.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8),
    [companies, query],
  );
  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  const start = async (mode: "role" | "company", id: string) => {
    await selectWorkflow(mode, id);
    navigate("/workflow");
  };
  const practiceCompany = (name: string) =>
    navigate(`/practice?mode=company&company=${encodeURIComponent(name)}`);
  const roleIcons: Record<string, typeof ServerCog> = {
    server: ServerCog,
    layers: Layers3,
    layout: Layout,
    brain: BrainCircuit,
    database: Database,
    cloud: CloudCog,
    cpu: Cpu,
    smartphone: Smartphone,
    shield: ShieldCheck,
    bug: Bug,
    gamepad: Gamepad2,
    palette: Palette,
  };

  return (
    <div className="portal-page landing-page">
      <section className="portal-hero hero-stage">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} /> Built for your next software offer
          </div>
          <h1>
            One goal.
            <br />
            <span>Your smartest path there.</span>
          </h1>
          <p>
            Tell us what you know today. Job Way turns it into a focused
            learning plan, daily practice, and measurable interview readiness.
          </p>
          <button
            className="hero-cta"
            onClick={() => scrollTo("start-options")}
          >
            Choose how to begin <ArrowDown size={17} />
          </button>
          <div className="hero-metrics">
            <span>
              <strong>{roles.length || 12}</strong> career paths
            </span>
            <span>
              <strong>{companies.length || 470}</strong> companies
            </span>
            <span>
              <strong>10</strong> verified tests/problem
            </span>
          </div>
        </div>
        <aside className="hero-plan-card">
          <div className="plan-card-top">
            <span>YOUR PREP SYSTEM</span>
            <strong>Interview ready</strong>
          </div>
          {[
            ["01", "Discover", "Find the right role"],
            ["02", "Learn", "Follow the roadmap"],
            ["03", "Practice", "Solve with feedback"],
            ["04", "Apply", "Target ready companies"],
          ].map(([number, title, copy], index) => (
            <div className="plan-step" key={number}>
              <span className={index === 0 ? "active" : ""}>{number}</span>
              <div>
                <strong>{title}</strong>
                <small>{copy}</small>
              </div>
              {index < 3 && <i />}
            </div>
          ))}
          <div className="plan-card-score">
            <span>Readiness grows as you solve</span>
            <div>
              <i style={{ width: "62%" }} />
            </div>
          </div>
        </aside>
      </section>

      <section id="start-options" className="start-section">
        <div className="center-heading">
          <span className="eyebrow">
            <Compass size={15} /> START YOUR WAY
          </span>
          <h2>Which sounds most like you?</h2>
          <p>No wrong door. You can switch paths at any time.</p>
        </div>
        <div className="start-grid">
          <button
            className="start-card role-start"
            onClick={() => scrollTo("roles")}
          >
            <span className="start-icon">
              <Briefcase />
            </span>
            <small>I already know</small>
            <h3>I know what I want to become</h3>
            <p>Choose a job and get its complete skill roadmap.</p>
            <b>
              Explore {roles.length || 12} career paths <ChevronRight />
            </b>
          </button>
          <button
            className="start-card quiz-start"
            onClick={() => setQuiz(true)}
          >
            <span className="start-icon">
              <BrainCircuit />
            </span>
            <small>Help me discover</small>
            <h3>I’m not sure—guide me</h3>
            <p>Answer 10 simple questions and see which jobs fit you.</p>
            <b>
              Take the simple career quiz <ChevronRight />
            </b>
          </button>
          <button
            className="start-card company-start"
            onClick={() => scrollTo("companies")}
          >
            <span className="start-icon">
              <Target />
            </span>
            <small>I have a target</small>
            <h3>I want to crack a company</h3>
            <p>Build a plan from recent company patterns and frequency data.</p>
            <b>
              Choose a company <ChevronRight />
            </b>
          </button>
          <button
            className="start-card dsa-start"
            onClick={() => navigate("/practice?mode=dsa")}
          >
            <span className="start-icon">
              <Code2 />
            </span>
            <small>I want to practice</small>
            <h3>Just give me DSA</h3>
            <p>
              Browse topics and difficulty levels without choosing a career
              path.
            </p>
            <b>
              Open DSA practice <ChevronRight />
            </b>
          </button>
        </div>
      </section>

      <section id="roles" className="door-section anchored-section">
        <div className="section-heading">
          <span className="door-number">01</span>
          <div>
            <h2>Choose from {roles.length || 12} career paths</h2>
            <p>
              Each job includes a sequenced curriculum, skill checkpoints, study
              material, and targeted interview practice.
            </p>
          </div>
        </div>
        <div className="role-grid">
          {roles.map((role, index) => {
            const RoleIcon = roleIcons[role.icon || "server"] || ServerCog;
            return (
              <button
                className="role-card"
                key={role.id}
                onClick={() => start("role", role.id)}
                aria-label={`Open the ${role.title} roadmap`}
              >
                <div className="role-card-accent" />
                <div className="role-icon">
                  <RoleIcon />
                </div>
                <span className="role-count">
                  PATH {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{role.title}</h3>
                <p>{role.summary}</p>
                <div className="chip-row">
                  {role.key_topics.slice(0, 4).map((topic) => (
                    <span className="chip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
                <span className="card-link">
                  View detailed roadmap <ChevronRight size={16} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="quiz-banner enhanced-quiz">
        <div className="quiz-art">
          <BrainCircuit />
        </div>
        <div>
          <span className="door-number">CAREER COMPASS</span>
          <h2>Not sure which job fits? That’s completely fine.</h2>
          <p>
            Answer 10 everyday questions. No technical knowledge or complicated
            words required.
          </p>
        </div>
        <button className="light-button" onClick={() => setQuiz(true)}>
          Find my best-fit job <ChevronRight size={16} />
        </button>
      </section>

      <section
        id="companies"
        className="door-section company-door anchored-section"
      >
        <div className="section-heading">
          <span className="door-number">02</span>
          <div>
            <h2>Prepare company-wise</h2>
            <p>
              Choose between a complete company roadmap or jump directly into
              its tagged questions.
            </p>
          </div>
        </div>
        <div className="company-builder">
          <div className="company-search">
            <Search size={18} />
            <label className="sr-only" htmlFor="company-search">
              Search companies
            </label>
            <input
              id="company-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Amazon, Google, Zoho…"
            />
            <div className="company-results">
              {matches.map((company) => (
                <button
                  className={selected?.name === company.name ? "selected" : ""}
                  key={company.name}
                  onClick={() => setSelected(company)}
                  aria-pressed={selected?.name === company.name}
                >
                  <Building2 size={17} />
                  <span>
                    {company.name}
                    <small>
                      {company.problem_count || "Dataset"} tracked problems
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          {selected && (
            <div className="company-profile">
              <span className="company-monogram">
                {selected.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <span className="rank">TARGET COMPANY PROFILE</span>
                <h3>{selected.name}</h3>
                <p className="company-profile-copy">
                  Practice its recurring patterns or follow a phased plan from
                  foundations to the 30-day interview sprint.
                </p>
                <div className="difficulty-split">
                  <span
                    className="easy"
                    style={{ flex: selected.easy_pct || 1 }}
                  >
                    Easy {selected.easy_pct || 0}%
                  </span>
                  <span
                    className="medium"
                    style={{ flex: selected.medium_pct || 1 }}
                  >
                    Medium {selected.medium_pct || 0}%
                  </span>
                  <span
                    className="hard"
                    style={{ flex: selected.hard_pct || 1 }}
                  >
                    Hard {selected.hard_pct || 0}%
                  </span>
                </div>
                <div className="chip-row">
                  {selected.top_topics?.slice(0, 5).map((topic) => (
                    <span className="chip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
                <div className="company-cta-row">
                  <button
                    className="btn-primary"
                    onClick={() => start("company", selected.name)}
                  >
                    Build full roadmap <ChevronRight size={16} />
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => practiceCompany(selected.name)}
                  >
                    Practice questions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="dsa-banner">
        <div className="dsa-code">
          <span>while</span> (not_interview_ready) {"{"}
          <br />
          {"  "}learn_pattern();
          <br />
          {"  "}solve_problem();
          <br />
          {"}"}
        </div>
        <div>
          <div className="eyebrow">
            <Code2 size={15} /> PURE DSA MODE
          </div>
          <h2>Want practice without a prescribed path?</h2>
          <p>
            Filter by arrays, strings, graphs, dynamic programming, difficulty,
            or company. Every coding question opens in the verified workspace.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/practice?mode=dsa")}
        >
          Browse DSA questions <ChevronRight size={16} />
        </button>
      </section>
      {quiz && (
        <CareerQuizModal
          roles={roles}
          onClose={() => setQuiz(false)}
          onStarted={() => navigate("/workflow")}
        />
      )}
    </div>
  );
}
