import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Cloud,
  Code2,
  Database,
  Layout,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TerminalSquare,
} from "lucide-react";
import "./Dashboard.css";

const categories = [
  {
    id: "dsa",
    name: "Data Structures & Algorithms",
    icon: Code2,
    color: "#635bff",
    description:
      "Build strong problem-solving skills with guided coding practice.",
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    icon: BrainCircuit,
    color: "#d946ef",
    description: "Learn models, neural networks, and practical AI foundations.",
  },
  {
    id: "computer-networks",
    name: "Computer Networks",
    icon: Network,
    color: "#0ea5e9",
    description:
      "Understand how devices, servers, and the internet communicate.",
  },
  {
    id: "system-design",
    name: "System Design",
    icon: Layout,
    color: "#f97316",
    description: "Learn to design scalable and dependable software systems.",
  },
  {
    id: "dbms",
    name: "Databases & SQL",
    icon: Database,
    color: "#ef4444",
    description: "Master SQL, indexing, transactions, and data modelling.",
  },
  {
    id: "cyber-security",
    name: "Cybersecurity",
    icon: ShieldCheck,
    color: "#059669",
    description:
      "Learn safe coding, network security, and common vulnerabilities.",
  },
  {
    id: "cloud-computing",
    name: "Cloud Computing",
    icon: Cloud,
    color: "#2563eb",
    description: "Explore cloud platforms, deployment, and microservices.",
  },
  {
    id: "operating-systems",
    name: "Operating Systems",
    icon: TerminalSquare,
    color: "#e11d48",
    description:
      "Understand memory, processes, threads, and computer resources.",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      categories.filter((item) =>
        `${item.name} ${item.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="dashboard-container animate-fade-in">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div>
          <span className="dashboard-kicker">
            <Sparkles /> YOUR JOB WAY DASHBOARD
          </span>
          <h1 id="dashboard-title">What would you like to do today?</h1>
          <p>
            Pick up your roadmap, practice interview questions, or learn a core
            subject. Everything is one click away.
          </p>
        </div>
        <div className="dashboard-streak">
          <strong>Start</strong>
          <span>
            small today.
            <br />
            Build momentum.
          </span>
        </div>
      </section>

      <section className="dashboard-actions" aria-label="Quick actions">
        <button
          className="dashboard-action action-career"
          onClick={() => navigate("/prepare")}
        >
          <span>
            <Target />
          </span>
          <div>
            <small>DISCOVER</small>
            <h2>Choose a career</h2>
            <p>Explore 12 jobs or take the simple quiz.</p>
          </div>
          <ArrowRight />
        </button>
        <button
          className="dashboard-action action-roadmap"
          onClick={() => navigate("/workflow")}
        >
          <span>
            <BookOpenCheck />
          </span>
          <div>
            <small>CONTINUE</small>
            <h2>My roadmap</h2>
            <p>Study topics and check off your progress.</p>
          </div>
          <ArrowRight />
        </button>
        <button
          className="dashboard-action action-practice"
          onClick={() => navigate("/practice")}
        >
          <span>
            <Code2 />
          </span>
          <div>
            <small>PRACTICE</small>
            <h2>Solve questions</h2>
            <p>Choose DSA or company-wise questions.</p>
          </div>
          <ArrowRight />
        </button>
      </section>

      <section className="learning-library" aria-labelledby="library-title">
        <header>
          <div>
            <span>LEARNING LIBRARY</span>
            <h2 id="library-title">Explore a subject</h2>
            <p>
              Short explanations and practice questions for interview
              fundamentals.
            </p>
          </div>
          <label className="dashboard-search">
            <Search />
            <span className="sr-only">Search subjects</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subjects"
            />
          </label>
        </header>
        <div className="categories-grid">
          {filtered.map((category) => (
            <button
              key={category.id}
              className="category-card"
              onClick={() => navigate(`/category/${category.id}`)}
              style={{ "--category-color": category.color } as CSSProperties}
            >
              <span className="category-icon-wrapper">
                <category.icon />
              </span>
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <b>
                  Start learning <ArrowRight />
                </b>
              </div>
            </button>
          ))}
        </div>
        {!filtered.length && (
          <div className="dashboard-empty">
            <Search />
            <h3>No subjects found</h3>
            <p>Try a shorter search, such as “data” or “cloud”.</p>
            <button className="btn-secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
