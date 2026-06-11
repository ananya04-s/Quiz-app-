import { useState, useEffect, useRef, useCallback } from "react";

// ── Genre catalogue ──────────────────────────────────────────────────────────
const GENRES = [
  { id: "science",    label: "Science",       emoji: "🔬", color: "#0ea5e9", bg: "#e0f2fe", dark: "#0369a1" },
  { id: "history",    label: "History",       emoji: "📜", color: "#f59e0b", bg: "#fef3c7", dark: "#b45309" },
  { id: "geography",  label: "Geography",     emoji: "🌍", color: "#10b981", bg: "#d1fae5", dark: "#065f46" },
  { id: "movies",     label: "Movies",        emoji: "🎬", color: "#8b5cf6", bg: "#ede9fe", dark: "#5b21b6" },
  { id: "sports",     label: "Sports",        emoji: "⚽", color: "#ef4444", bg: "#fee2e2", dark: "#991b1b" },
  { id: "music",      label: "Music",         emoji: "🎵", color: "#ec4899", bg: "#fce7f3", dark: "#9d174d" },
  { id: "technology", label: "Technology",    emoji: "💻", color: "#6366f1", bg: "#e0e7ff", dark: "#3730a3" },
  { id: "literature", label: "Literature",    emoji: "📚", color: "#84cc16", bg: "#ecfccb", dark: "#365314" },
];

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function useTimer(active) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Claude API call ──────────────────────────────────────────────────────────
async function fetchQuestions(genre) {
  const prompt = `Generate exactly 50 multiple-choice quiz questions about "${genre}".

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- Only one option is correct
- Questions should range from easy to hard
- Make questions interesting and varied
- Return ONLY valid JSON, no markdown, no extra text

Format (array of 50 objects):
[
  {
    "q": "Question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "answer": 0
  }
]

Where "answer" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.find(b => b.type === "text")?.text ?? "[]";
  const clean = raw.replace(/```json|```/gi, "").trim();
  return JSON.parse(clean);
}

// ── Screen: Genre Picker ─────────────────────────────────────────────────────
function GenreScreen({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App bar */}
      <div style={{
        background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        padding: "18px 20px 22px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🧠</div>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>Quiz Master</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>50 questions · pick your genre</p>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "18px 14px 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        alignContent: "start",
      }}>
        {GENRES.map(g => (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            onMouseEnter={() => setHovered(g.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === g.id ? g.color : g.bg,
              border: `2px solid ${g.color}`,
              borderRadius: 18,
              padding: "18px 12px",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              transition: "all 0.18s ease",
              transform: hovered === g.id ? "scale(1.04)" : "scale(1)",
              boxShadow: hovered === g.id ? `0 8px 20px ${g.color}44` : "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: 34 }}>{g.emoji}</span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: hovered === g.id ? "#fff" : g.dark,
              transition: "color 0.18s",
            }}>{g.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: "10px 20px 14px",
        textAlign: "center",
        borderTop: "1px solid #e2e8f0",
        background: "#fff",
      }}>
        <p style={{ fontSize: 12, color: "#94a3b8" }}>
          Questions are AI-generated fresh each time ✨
        </p>
      </div>
    </div>
  );
}

// ── Screen: Loading ──────────────────────────────────────────────────────────
function LoadingScreen({ genre }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 32,
      background: `linear-gradient(160deg, ${genre.bg} 0%, #f8fafc 100%)`,
    }}>
      <div style={{
        fontSize: 64,
        animation: "spinSlow 2s linear infinite",
        display: "inline-block",
      }}>
        {genre.emoji}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: genre.dark, marginTop: 24 }}>
        Generating {genre.label} Quiz
      </h2>
      <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>
        Crafting 50 questions{dots}
      </p>
      {/* Progress bar */}
      <div style={{
        marginTop: 28, width: "100%", maxWidth: 240,
        height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: genre.color,
          borderRadius: 99,
          animation: "loadBar 3s ease-in-out infinite",
        }} />
      </div>
      <style>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes loadBar {
          0%   { width: 5%; }
          50%  { width: 75%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}

// ── Screen: Quiz ─────────────────────────────────────────────────────────────
function QuizScreen({ genre, questions, onFinish }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers]     = useState([]);   // {correct: bool}[]
  const [shake, setShake]         = useState(false);
  const [slideDir, setSlideDir]   = useState("in");
  const elapsed = useTimer(true);

  const q = questions[qIndex];
  const progress = ((qIndex) / questions.length) * 100;
  const correctSoFar = answers.filter(a => a.correct).length;

  const handleSelect = (i) => { if (!confirmed) setSelected(i); };

  const handleSubmit = () => {
    if (selected === null) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    setConfirmed(true);
    setAnswers(prev => [...prev, { correct: selected === q.answer }]);
  };

  const handleNext = () => {
    setSlideDir("out");
    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        onFinish({ answers: [...answers, { correct: selected === q.answer }], elapsed });
      } else {
        setQIndex(i => i + 1);
        setSelected(null);
        setConfirmed(false);
        setSlideDir("in");
      }
    }, 250);
  };

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App bar */}
      <div style={{ background: genre.color, padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{
            background: "rgba(255,255,255,0.25)", color: "#fff",
            fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
          }}>
            {genre.emoji} {genre.label}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>
              ⏱ {fmt(elapsed)}
            </span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>
              ✅ {correctSoFar}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: "#fff", borderRadius: 99,
            width: `${progress}%`, transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Q {qIndex + 1} of {questions.length}</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question + Options */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 14px 8px",
        opacity: slideDir === "out" ? 0 : 1,
        transform: slideDir === "out" ? "translateX(-30px)" : "translateX(0)",
        transition: "all 0.25s ease",
      }}>
        {/* Question card */}
        <div style={{
          background: confirmed ? (selected === q.answer ? "#ecfdf5" : "#fef2f2") : "#fff",
          border: confirmed
            ? `2px solid ${selected === q.answer ? "#10b981" : "#ef4444"}`
            : "2px solid #e2e8f0",
          borderRadius: 18, padding: "18px 16px", marginBottom: 14,
          transition: "all 0.3s ease",
          animation: shake ? "shakeFn 0.5s ease" : "slideInQ 0.35s ease",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <span style={{
              background: genre.color, color: "#fff",
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
              letterSpacing: 1,
            }}>Q{qIndex + 1}</span>
            {confirmed && (
              <span style={{ fontSize: 18 }}>
                {selected === q.answer ? "✅" : "❌"}
              </span>
            )}
          </div>
          <p style={{
            fontSize: 16, fontWeight: 700, color: "#1e293b",
            lineHeight: 1.55, margin: 0,
          }}>
            {q.q}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect  = i === q.answer;
            let bg = "#f8fafc", border = "1.5px solid #e2e8f0", textColor = "#334155", labelBg = "#e2e8f0", labelColor = "#475569";

            if (confirmed) {
              if (isCorrect) {
                bg = "#ecfdf5"; border = "2px solid #10b981";
                labelBg = "#10b981"; labelColor = "#fff"; textColor = "#065f46";
              } else if (isSelected) {
                bg = "#fef2f2"; border = "2px solid #ef4444";
                labelBg = "#ef4444"; labelColor = "#fff"; textColor = "#991b1b";
              } else {
                bg = "#f1f5f9"; textColor = "#94a3b8";
              }
            } else if (isSelected) {
              bg = "#eef2ff"; border = `2px solid ${genre.color}`;
              labelBg = genre.color; labelColor = "#fff"; textColor = "#1e293b";
            }

            return (
              <button key={i}
                onClick={() => handleSelect(i)}
                disabled={confirmed}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: bg, border, borderRadius: 12,
                  padding: "11px 13px", cursor: confirmed ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  transform: isSelected && !confirmed ? "scale(1.01)" : "scale(1)",
                  boxShadow: isSelected && !confirmed ? `0 3px 12px ${genre.color}33` : "none",
                  textAlign: "left", width: "100%",
                }}
              >
                <span style={{
                  minWidth: 26, height: 26, background: labelBg, color: labelColor,
                  borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, flexShrink: 0, transition: "all 0.2s",
                }}>
                  {optionLetters[i]}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: textColor, lineHeight: 1.4, transition: "color 0.2s" }}>
                  {opt}
                </span>
                {confirmed && isCorrect && <span style={{ marginLeft: "auto", fontSize: 16 }}>✅</span>}
                {confirmed && isSelected && !isCorrect && <span style={{ marginLeft: "auto", fontSize: 16 }}>❌</span>}
              </button>
            );
          })}
        </div>

        {/* Explanation nudge */}
        {confirmed && (
          <div style={{
            marginTop: 12, padding: "10px 14px",
            background: selected === q.answer ? "#d1fae5" : "#fee2e2",
            borderRadius: 12,
            animation: "slideInQ 0.3s ease",
          }}>
            <p style={{
              fontSize: 13, fontWeight: 600,
              color: selected === q.answer ? "#065f46" : "#991b1b",
              margin: 0,
            }}>
              {selected === q.answer
                ? `🎉 Correct! Great job.`
                : `💡 The correct answer was: ${q.options[q.answer]}`}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={{ padding: "10px 14px 16px", borderTop: "1px solid #f1f5f9" }}>
        {!confirmed ? (
          <button onClick={handleSubmit} style={{
            width: "100%", height: 50, background: genre.color,
            border: "none", borderRadius: 14, color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 16px ${genre.color}55`,
            transition: "transform 0.1s",
          }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Submit Answer ✓
          </button>
        ) : (
          <button onClick={handleNext} style={{
            width: "100%", height: 50,
            background: qIndex + 1 >= questions.length
              ? "linear-gradient(135deg,#f59e0b,#ef4444)"
              : "linear-gradient(135deg,#4f46e5,#7c3aed)",
            border: "none", borderRadius: 14, color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
            animation: "slideInQ 0.3s ease",
          }}>
            {qIndex + 1 >= questions.length ? "See Results 🏆" : `Next Question →`}
          </button>
        )}
      </div>

      <style>{`
        @keyframes shakeFn {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-7px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes slideInQ {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Screen: Results ──────────────────────────────────────────────────────────
function ResultsScreen({ genre, score, total, elapsed, onReplay, onHome }) {
  const pct = Math.round((score / total) * 100);
  const { emoji, label, desc } =
    pct >= 90 ? { emoji: "🏆", label: "Genius!", desc: "Outstanding performance!" } :
    pct >= 70 ? { emoji: "🌟", label: "Great!", desc: "Well done, you really know this!" } :
    pct >= 50 ? { emoji: "👍", label: "Good job!", desc: "More than half right!" } :
    pct >= 30 ? { emoji: "📖", label: "Keep learning", desc: "Practice makes perfect!" } :
                { emoji: "💪", label: "Keep going!", desc: "Better luck next time!" };

  const bars = [
    { label: "Correct",   value: score,        color: "#10b981", total },
    { label: "Incorrect", value: total - score, color: "#ef4444", total },
    { label: "Accuracy",  value: pct,           color: genre.color, total: 100, suffix: "%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${genre.color}, #7c3aed)`,
        padding: "24px 20px 28px", textAlign: "center",
      }}>
        <div style={{ fontSize: 52 }}>{emoji}</div>
        <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "8px 0 4px" }}>{label}</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{desc}</p>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>

        {/* Big score */}
        <div style={{
          background: "#fff", borderRadius: 20,
          border: `3px solid ${genre.color}`,
          padding: "20px 16px", textAlign: "center", marginBottom: 16,
          boxShadow: `0 8px 24px ${genre.color}22`,
          animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 6px", fontWeight: 600 }}>YOUR SCORE</p>
          <p style={{ color: genre.color, fontSize: 52, fontWeight: 900, margin: 0, lineHeight: 1 }}>
            {score}<span style={{ fontSize: 24, color: "#94a3b8" }}>/{total}</span>
          </p>
          <p style={{ color: "#1e293b", fontSize: 18, fontWeight: 700, marginTop: 6 }}>{pct}% Accuracy</p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>⏱ Time: {fmt(elapsed)}</p>
        </div>

        {/* Stats bars */}
        {bars.map(b => (
          <div key={b.label} style={{
            background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{b.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: b.color }}>{b.value}{b.suffix ?? ""}</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: b.color, borderRadius: 99,
                width: `${(b.value / b.total) * 100}%`,
                transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                animation: "barGrow 1s cubic-bezier(0.34,1.3,0.64,1)",
              }} />
            </div>
          </div>
        ))}

        {/* Grade badge */}
        <div style={{
          background: genre.bg, border: `2px solid ${genre.color}`,
          borderRadius: 14, padding: "14px 16px", textAlign: "center", marginBottom: 16,
        }}>
          <p style={{ color: genre.dark, fontSize: 14, fontWeight: 700, margin: 0 }}>
            {genre.emoji} {genre.label} Quiz Complete!
          </p>
          <p style={{ color: genre.dark, fontSize: 12, margin: "4px 0 0", opacity: 0.8 }}>
            {pct >= 80 ? "You're an expert in this topic! 🎓" : pct >= 60 ? "Solid knowledge — keep it up! 📈" : "Great effort! Try again to improve 🔁"}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ padding: "10px 14px 16px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #f1f5f9" }}>
        <button onClick={onReplay} style={{
          height: 50, background: genre.color,
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 4px 16px ${genre.color}55`,
        }}>
          {genre.emoji} Play {genre.label} Again
        </button>
        <button onClick={onHome} style={{
          height: 50, background: "transparent",
          border: "2px solid #4f46e5", borderRadius: 14, color: "#4f46e5",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}>
          ← Choose New Genre
        </button>
      </div>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.8); opacity: 0; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes barGrow {
          from { width: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("genre"); // genre | loading | quiz | results
  const [genre, setGenre]         = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults]     = useState(null);
  const [error, setError]         = useState(null);

  const handleGenreSelect = async (g) => {
    setGenre(g);
    setScreen("loading");
    setError(null);
    try {
      const qs = await fetchQuestions(g.label);
      if (!Array.isArray(qs) || qs.length === 0) throw new Error("No questions returned");
      setQuestions(qs);
      setScreen("quiz");
    } catch (e) {
      setError(e.message);
      setScreen("genre");
    }
  };

  const handleFinish = ({ answers, elapsed }) => {
    const score = answers.filter(a => a.correct).length;
    setResults({ score, total: answers.length, elapsed });
    setScreen("results");
  };

  const handleReplay = () => handleGenreSelect(genre);
  const handleHome   = () => { setScreen("genre"); setResults(null); setQuestions([]); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body {
          font-family: 'Inter', sans-serif;
          background: radial-gradient(ellipse at 30% 30%, #e0e7ff 0%, #f1f5f9 60%);
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px 16px;
        }
        button { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      {/* Phone shell */}
      <div style={{
        width: "100%", maxWidth: 390,
        background: "#1e293b",
        borderRadius: 46,
        padding: "12px 10px",
        boxShadow: "0 40px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)",
      }}>
        {/* Notch */}
        <div style={{
          width: 126, height: 30, background: "#0f172a",
          borderRadius: 20, margin: "0 auto 8px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1e3a5f" }} />
          <div style={{ width: 60, height: 8, borderRadius: 8, background: "#1e3a5f" }} />
        </div>

        {/* Screen */}
        <div style={{
          background: "#f8fafc", borderRadius: 36,
          overflow: "hidden", height: 700,
          display: "flex", flexDirection: "column",
          position: "relative",
        }}>
          {/* Status bar */}
          <div style={{
            background: screen === "genre" ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                      : genre ? genre.color : "#4f46e5",
            padding: "8px 20px 6px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>9:41</span>
            <div style={{ display: "flex", gap: 5 }}>
              {[16, 12, 12].map((w, i) => (
                <div key={i} style={{ width: w, height: 8, background: "rgba(255,255,255,0.65)", borderRadius: 3 }} />
              ))}
            </div>
          </div>

          {/* Active screen */}
          <div style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
            {screen === "genre"   && <GenreScreen onSelect={handleGenreSelect} />}
            {screen === "loading" && <LoadingScreen genre={genre} />}
            {screen === "quiz"    && questions.length > 0 && (
              <QuizScreen genre={genre} questions={questions} onFinish={handleFinish} />
            )}
            {screen === "results" && results && (
              <ResultsScreen
                genre={genre}
                score={results.score}
                total={results.total}
                elapsed={results.elapsed}
                onReplay={handleReplay}
                onHome={handleHome}
              />
            )}
          </div>

          {/* Error toast */}
          {error && (
            <div style={{
              position: "absolute", bottom: 70, left: 16, right: 16,
              background: "#ef4444", color: "#fff", borderRadius: 12,
              padding: "12px 16px", fontSize: 13, fontWeight: 600,
              animation: "slideInQ 0.3s ease",
            }}>
              ❌ {error} — please try again.
            </div>
          )}

          {/* Home indicator */}
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 10px", flexShrink: 0 }}>
            <div style={{ width: 100, height: 5, background: "#cbd5e1", borderRadius: 99 }} />
          </div>
        </div>
      </div>
    </>
  );
}
