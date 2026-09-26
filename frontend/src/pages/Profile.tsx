import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  CheckCircle,
  Award,
  Eye,
  MessageSquare,
  Code2,
  Globe,
  Github,
} from "lucide-react";
import "./Profile.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "");

interface UserData {
  username: string;
  joinedAt: string;
  rank: number;
  reputation: number;
  views: number;
  discuss: number;
  solution: number;
  stats: {
    totalSolved: number;
    difficultyBreakdown: {
      Easy: number;
      Medium: number;
      Hard: number;
    };
    calendarHeatmap: Record<string, number>;
    totalActiveDays: number;
    maxStreak: number;
  };
  totalAvailable?: {
    Total: number;
    Easy: number;
    Medium: number;
    Hard: number;
  };
}

// Component to render the LeetCode-style activity heatmap
const Heatmap = ({ data }: { data: Record<string, number> }) => {
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      result.push(d);
    }
    return result;
  }, []);

  return (
    <div className="heatmap-grid">
      {days.map((date, idx) => {
        const dateStr = date.toISOString().split("T")[0];
        const count = data[dateStr] || 0;
        let level = 0;
        if (count > 0) level = 1;
        if (count >= 2) level = 2;
        if (count >= 4) level = 3;
        if (count >= 6) level = 4;

        return (
          <div
            key={idx}
            className={`heatmap-cell level-${level}`}
            title={`${dateStr}: ${count} submissions`}
          />
        );
      })}
    </div>
  );
};

export default function Profile() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE}/users/${encodeURIComponent(user.id)}`,
          {
            withCredentials: true,
            timeout: 4000,
          },
        );

        if (response.data && response.data.success) {
          setProfileData(response.data.data);
        } else setProfileData(null);
      } catch (err) {
        console.warn("Profile request failed.", err);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div
        className="container flex-center"
        style={{ minHeight: "60vh", flexDirection: "column", gap: "1rem" }}
      >
        <h2>Profile Not Found</h2>
        <p className="text-muted">
          Please log in to view your profile dashboard.
        </p>
      </div>
    );
  }

  const { stats, totalAvailable } = profileData;

  const TOTAL_QUESTIONS = totalAvailable?.Total || 150;
  const TOTAL_EASY = totalAvailable?.Easy || 50;
  const TOTAL_MEDIUM = totalAvailable?.Medium || 75;
  const TOTAL_HARD = totalAvailable?.Hard || 25;

  const totalSolved = stats?.totalSolved || 0;
  const solvedPercentage =
    TOTAL_QUESTIONS > 0 ? Math.round((totalSolved / TOTAL_QUESTIONS) * 100) : 0;

  const rank = profileData.rank || 1240;
  const reputation = profileData.reputation || 340;
  const solution = profileData.solution || 22;
  const discuss = profileData.discuss || 14;
  const views = profileData.views || 1980;

  const diffEasy = stats?.difficultyBreakdown?.Easy || 0;
  const diffMedium = stats?.difficultyBreakdown?.Medium || 0;
  const diffHard = stats?.difficultyBreakdown?.Hard || 0;
  const totalActiveDays = stats?.totalActiveDays || 34;
  const maxStreak = stats?.maxStreak || 12;
  const calendarHeatmap = stats?.calendarHeatmap || {};

  return (
    <div className="leetcode-profile-container animate-fade-in">
      {/* Left Sidebar */}
      <aside className="profile-sidebar">
        <div className="user-info-card glass-panel">
          <div className="avatar-section">
            <div className="avatar">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#9ca3af"
                className="w-full h-full"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25c-2.42 0-4.38 1.96-4.38 4.38 0 2.41 1.96 4.37 4.38 4.37s4.38-1.96 4.38-4.37c0-2.42-1.96-4.38-4.38-4.38ZM7.5 13.5c-3.13 0-5.67 2.37-6 5.43a.75.75 0 0 0 .75.82h19.5a.75.75 0 0 0 .75-.82c-.33-3.06-2.87-5.43-6-5.43H7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="user-details">
              <h1>{profileData.username}</h1>
              <p className="username-handle">
                @{profileData.username.toLowerCase()}
              </p>
              <div className="rank-info">
                Rank <span>#{rank.toLocaleString()}</span>
              </div>
              <p className="text-muted text-xs mt-1">
                Joined {new Date(profileData.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="social-links">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="social-link"
            >
              <Github size={16} /> github.com/
              {profileData.username.toLowerCase()}
            </a>
            <a
              href="https://jobway.dev"
              target="_blank"
              rel="noreferrer"
              className="social-link"
            >
              <Globe size={16} /> jobway.dev/u/
              {profileData.username.toLowerCase()}
            </a>
          </div>
        </div>

        {/* Community Stats Card */}
        <div className="community-stats-card glass-panel">
          <h3>Community Activity</h3>
          <ul className="stats-list">
            <li>
              <span className="stat-label">
                <Eye size={16} className="icon-cyan" /> Views
              </span>
              <span className="stat-value">{views.toLocaleString()}</span>
            </li>
            <li>
              <span className="stat-label">
                <Code2 size={16} className="icon-green" /> Solutions
              </span>
              <span className="stat-value">{solution}</span>
            </li>
            <li>
              <span className="stat-label">
                <MessageSquare size={16} className="icon-orange" /> Discussions
              </span>
              <span className="stat-value">{discuss}</span>
            </li>
            <li>
              <span className="stat-label">
                <Award size={16} className="icon-orange" /> Reputation
              </span>
              <span className="stat-value">{reputation}</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="profile-main">
        {/* Solved Stats */}
        <div className="solved-card glass-panel">
          <div className="circle-progress-container">
            <svg viewBox="0 0 100 100" className="circle-svg">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <circle
                cx="50"
                cy="50"
                r="45"
                className="circle-fill"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * (solvedPercentage || 0)) / 100}
              />
            </svg>
            <div className="circle-content">
              <span className="solved-count">{totalSolved}</span>
              <span className="solved-total">/ {TOTAL_QUESTIONS}</span>
              <span className="solved-label">
                <CheckCircle size={14} /> Solved
              </span>
            </div>
          </div>

          <div className="difficulty-bars">
            <div className="diff-bar-wrapper">
              <div className="diff-label">Easy</div>
              <div className="diff-counts">
                <span>{diffEasy}</span>/{TOTAL_EASY}
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill easy"
                  style={{
                    width: `${TOTAL_EASY > 0 ? (diffEasy / TOTAL_EASY) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="diff-bar-wrapper">
              <div className="diff-label">Med.</div>
              <div className="diff-counts">
                <span>{diffMedium}</span>/{TOTAL_MEDIUM}
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill medium"
                  style={{
                    width: `${TOTAL_MEDIUM > 0 ? (diffMedium / TOTAL_MEDIUM) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="diff-bar-wrapper">
              <div className="diff-label">Hard</div>
              <div className="diff-counts">
                <span>{diffHard}</span>/{TOTAL_HARD}
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill hard"
                  style={{
                    width: `${TOTAL_HARD > 0 ? (diffHard / TOTAL_HARD) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Submissions Calendar Heatmap */}
        <div className="heatmap-card glass-panel">
          <div className="heatmap-header">
            <h3>{totalSolved} submissions in the past one year</h3>
            <div className="heatmap-stats">
              <span>
                Total active days: <strong>{totalActiveDays}</strong>
              </span>
              <span>
                Max streak: <strong>{maxStreak} days</strong>
              </span>
            </div>
          </div>
          <div className="heatmap-wrapper">
            <Heatmap data={calendarHeatmap} />
            <div className="heatmap-months">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
