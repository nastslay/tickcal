import { useState, useEffect } from "react";

const COLORS = [
  { id: 1, key: "c1", hex: "#E8C547", defaultLabel: "Żółty" },
  { id: 2, key: "c2", hex: "#5B9BF0", defaultLabel: "Niebieski" },
  { id: 3, key: "c3", hex: "#F07373", defaultLabel: "Czerwony" },
  { id: 4, key: "c4", hex: "#6DCF8E", defaultLabel: "Zielony" },
];

const STORAGE_KEY = "tickcal_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first: 0=Mon … 6=Sun
function getFirstDayOffset(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function App() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [activeColor, setActiveColor] = useState(1);
  const [ticks, setTicks] = useState({});       // "YYYY-MM-DD" -> colorId
  const [labels, setLabels] = useState({});     // colorId -> string
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");

  // load
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.ticks) setTicks(saved.ticks);
      if (saved.labels) setLabels(saved.labels);
    }
  }, []);

  // save
  useEffect(() => {
    saveState({ ticks, labels });
  }, [ticks, labels]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const offset = getFirstDayOffset(viewYear, viewMonth);

  function dateKey(d) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function handleDayClick(day) {
    const key = dateKey(day);
    setTicks(prev => {
      const next = { ...prev };
      if (next[key] === activeColor) {
        delete next[key]; // odznacz jeśli ten sam kolor
      } else {
        next[key] = activeColor;
      }
      return next;
    });
  }

  function getLabel(colorId) {
    return labels[colorId] || COLORS.find(c => c.id === colorId)?.defaultLabel || "";
  }

  function startEditLabel(colorId) {
    setEditingLabel(colorId);
    setLabelDraft(labels[colorId] || "");
  }

  function commitLabel() {
    if (editingLabel !== null) {
      setLabels(prev => ({ ...prev, [editingLabel]: labelDraft.trim() }));
      setEditingLabel(null);
    }
  }

  // counts for current view
  const counts = {};
  COLORS.forEach(c => { counts[c.id] = 0; });
  Object.entries(ticks).forEach(([k, cid]) => {
    const [y, m] = k.split("-").map(Number);
    if (y === viewYear && m === viewMonth + 1) {
      counts[cid] = (counts[cid] || 0) + 1;
    }
  });

  // total counts across all time
  const totalCounts = {};
  COLORS.forEach(c => { totalCounts[c.id] = 0; });
  Object.values(ticks).forEach(cid => {
    totalCounts[cid] = (totalCounts[cid] || 0) + 1;
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // build grid cells
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d) =>
    d &&
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    d === today.getDate();

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "#1a1a1a",
        borderBottom: "1px solid #2a2a2a",
        padding: "20px 20px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, letterSpacing: "-0.5px" }}>
            {MONTHS_PL[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        {/* Color picker */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveColor(c.id)}
              title={getLabel(c.id)}
              style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: c.hex,
                border: activeColor === c.id ? `3px solid #fff` : "3px solid transparent",
                outline: activeColor === c.id ? `2px solid ${c.hex}` : "none",
                cursor: "pointer",
                transition: "transform 0.15s, outline 0.15s",
                transform: activeColor === c.id ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ padding: "16px 16px 0" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
          {DAYS_PL.map(d => (
            <div key={d} style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: d === "Sb" || d === "Nd" ? "#888" : "#666",
              padding: "6px 0",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.05em",
            }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = dateKey(day);
            const tickColor = ticks[key];
            const colorHex = tickColor ? COLORS.find(c => c.id === tickColor)?.hex : null;
            const today_ = isToday(day);
            const colIndex = i % 7;
            const isWeekend = colIndex === 5 || colIndex === 6;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  border: today_ ? "2px solid #f0f0f0" : "2px solid transparent",
                  background: tickColor ? colorHex + "22" : "#1a1a1a",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  transition: "background 0.12s, transform 0.1s",
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                }}
                onTouchStart={e => e.currentTarget.style.transform = "scale(0.93)"}
                onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <span style={{
                  fontSize: 14,
                  fontWeight: today_ ? 600 : 400,
                  color: isWeekend ? "#888" : (today_ ? "#fff" : "#d0d0d0"),
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {tickColor && (
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: colorHex,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Counters + labels */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: "#555",
          letterSpacing: "0.1em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Ten miesiąc · Łącznie
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {COLORS.map(c => (
            <div key={c.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "#1a1a1a",
              borderRadius: 12,
              border: activeColor === c.id ? `1px solid ${c.hex}44` : "1px solid #2a2a2a",
              cursor: "pointer",
            }}
              onClick={() => setActiveColor(c.id)}
            >
              <div style={{
                width: 12, height: 12,
                borderRadius: "50%",
                background: c.hex,
                flexShrink: 0,
              }} />

              {/* label editable */}
              {editingLabel === c.id ? (
                <input
                  autoFocus
                  value={labelDraft}
                  onChange={e => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={e => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") setEditingLabel(null); }}
                  onClick={e => e.stopPropagation()}
                  placeholder={c.defaultLabel}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${c.hex}`,
                    outline: "none",
                    color: "#f0f0f0",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    padding: "2px 0",
                  }}
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 14, color: "#c0c0c0" }}
                  onDoubleClick={e => { e.stopPropagation(); startEditLabel(c.id); }}
                  title="Kliknij dwukrotnie, aby edytować etykietę"
                >
                  {getLabel(c.id)}
                  <span style={{ fontSize: 10, color: "#444", marginLeft: 6 }}>(2× klik = edytuj)</span>
                </span>
              )}

              {/* counts */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 18,
                  fontWeight: 500,
                  color: c.hex,
                  minWidth: 28,
                  textAlign: "right",
                }}>
                  {counts[c.id]}
                </span>
                <span style={{ color: "#333", fontSize: 12 }}>·</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  color: "#555",
                  minWidth: 24,
                  textAlign: "right",
                }}>
                  {totalCounts[c.id]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: "none",
  color: "#888",
  fontSize: 26,
  cursor: "pointer",
  padding: "0 8px",
  lineHeight: 1,
  fontFamily: "'DM Sans', sans-serif",
};
