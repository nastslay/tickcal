import { useState, useEffect, useRef } from "react";

// --------------------------------------------------------------
// BARDZIEJ JASKRAWA PALETA
// --------------------------------------------------------------
const MASTER_PALETTE = [
  { hex: "#FFD966", defaultLabel: "Task" },
  { hex: "#4D9EFF", defaultLabel: "Task" },
  { hex: "#FF6B6B", defaultLabel: "Task" },
  { hex: "#6BCB77", defaultLabel: "Task" },
  { hex: "#D96CFF", defaultLabel: "Task" },
  { hex: "#FFB347", defaultLabel: "Task" },
  { hex: "#FF80B3", defaultLabel: "Task" },
  { hex: "#B5835A", defaultLabel: "Task" },
];

const MAX_COLORS = 6;
const STORAGE_KEY = "tickcal_v5";

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

function migrateTicks(oldTicks) {
  if (!oldTicks) return {};
  const newTicks = {};
  for (const [date, value] of Object.entries(oldTicks)) {
    if (typeof value === "number") {
      newTicks[date] = [value];
    } else if (Array.isArray(value)) {
      newTicks[date] = value;
    } else {
      newTicks[date] = [];
    }
  }
  return newTicks;
}

const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function App() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [activeColors, setActiveColors] = useState([]);
  const [activeColorId, setActiveColorId] = useState(null);
  const [ticks, setTicks] = useState({});
  const [labels, setLabels] = useState({});
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [showAddPalette, setShowAddPalette] = useState(false);
  const addButtonRef = useRef(null);

  // Notatki
  const [notes, setNotes] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Inicjalizacja
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.activeColors && Array.isArray(saved.activeColors)) {
        setActiveColors(saved.activeColors);
      } else {
        const defaultColors = MASTER_PALETTE.slice(0, 4).map((c, idx) => ({
          ...c,
          id: idx + 1,
          defaultLabel: `Task ${idx + 1}`,
        }));
        setActiveColors(defaultColors);
        const initialLabels = {};
        defaultColors.forEach(c => { initialLabels[c.id] = c.defaultLabel; });
        setLabels(initialLabels);
      }
      if (saved.ticks) setTicks(migrateTicks(saved.ticks));
      if (saved.labels) setLabels(prev => ({ ...prev, ...saved.labels }));
      if (saved.activeColorId) setActiveColorId(saved.activeColorId);
      if (saved.notes) setNotes(saved.notes);
      if (saved.selectedDate) setSelectedDate(saved.selectedDate);
    } else {
      const defaultColors = MASTER_PALETTE.slice(0, 4).map((c, idx) => ({
        ...c,
        id: idx + 1,
        defaultLabel: `Task ${idx + 1}`,
      }));
      setActiveColors(defaultColors);
      const initialLabels = {};
      defaultColors.forEach(c => { initialLabels[c.id] = c.defaultLabel; });
      setLabels(initialLabels);
      if (defaultColors.length > 0) setActiveColorId(defaultColors[0].id);
    }
  }, []);

  useEffect(() => {
    saveState({
      activeColors,
      ticks,
      labels,
      activeColorId,
      notes,
      selectedDate,
    });
  }, [activeColors, ticks, labels, activeColorId, notes, selectedDate]);

  useEffect(() => {
    const exists = activeColors.some(c => c.id === activeColorId);
    if (!exists && activeColors.length > 0) {
      setActiveColorId(activeColors[0].id);
    } else if (activeColors.length === 0) {
      setActiveColorId(null);
    }
  }, [activeColors, activeColorId]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const offset = getFirstDayOffset(viewYear, viewMonth);

  function dateKey(d) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function handleDayClick(day) {
    if (!activeColorId) return;
    const key = dateKey(day);
    setTicks(prev => {
      const current = prev[key] || [];
      const newColors = current.includes(activeColorId)
        ? current.filter(id => id !== activeColorId)
        : [...current, activeColorId];
      if (newColors.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: newColors };
    });
    setSelectedDate(key);
  }

  function getLabel(colorId) {
    return labels[colorId] || activeColors.find(c => c.id === colorId)?.defaultLabel || "";
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

  const counts = {};
  activeColors.forEach(c => { counts[c.id] = 0; });
  Object.entries(ticks).forEach(([key, colorIds]) => {
    const [y, m] = key.split("-").map(Number);
    if (y === viewYear && m === viewMonth + 1) {
      colorIds.forEach(cid => { counts[cid] = (counts[cid] || 0) + 1; });
    }
  });

  const totalCounts = {};
  activeColors.forEach(c => { totalCounts[c.id] = 0; });
  Object.values(ticks).forEach(colorIds => {
    colorIds.forEach(cid => { totalCounts[cid] = (totalCounts[cid] || 0) + 1; });
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function addColorFromPalette(paletteColor) {
    if (activeColors.length >= MAX_COLORS) {
      alert(`Możesz dodać maksymalnie ${MAX_COLORS} kolorów.`);
      setShowAddPalette(false);
      return;
    }
    const alreadyExists = activeColors.some(c => c.hex === paletteColor.hex);
    if (alreadyExists) {
      alert("Ten kolor jest już dodany.");
      setShowAddPalette(false);
      return;
    }
    const newId = Date.now();
    const nextNumber = activeColors.length + 1;
    const newLabel = `Task ${nextNumber}`;
    const newColor = { ...paletteColor, id: newId, defaultLabel: newLabel };
    setActiveColors(prev => [...prev, newColor]);
    setLabels(prev => ({ ...prev, [newId]: newLabel }));
    setActiveColorId(newId);
    setShowAddPalette(false);
  }

  function deleteColor(colorId) {
    if (activeColors.length <= 1) {
      alert("Musi pozostać przynajmniej jeden kolor.");
      return;
    }
    if (!window.confirm(`Usunąć kolor "${getLabel(colorId)}"? Wszystkie oznaczenia znikną.`)) return;
    setActiveColors(prev => prev.filter(c => c.id !== colorId));
    setTicks(prev => {
      const newTicks = {};
      for (const [date, colorIds] of Object.entries(prev)) {
        const filtered = colorIds.filter(id => id !== colorId);
        if (filtered.length) newTicks[date] = filtered;
      }
      return newTicks;
    });
    setLabels(prev => {
      const { [colorId]: _, ...rest } = prev;
      return rest;
    });
  }

  const unusedColors = MASTER_PALETTE.filter(
    master => !activeColors.some(active => active.hex === master.hex)
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (addButtonRef.current && !addButtonRef.current.contains(event.target)) {
        const paletteDiv = document.getElementById("add-palette-panel");
        if (paletteDiv && !paletteDiv.contains(event.target)) setShowAddPalette(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notatki - funkcje
  function openNoteModal() {
    if (!selectedDate) {
      alert("Najpierw kliknij na dowolny dzień w kalendarzu.");
      return;
    }
    const existingNote = notes[selectedDate] || "";
    setNoteDraft(existingNote);
    setShowNoteModal(true);
  }

  function saveNote() {
    if (!selectedDate) return;
    if (noteDraft.trim() === "") {
      setNotes(prev => {
        const { [selectedDate]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setNotes(prev => ({ ...prev, [selectedDate]: noteDraft.trim() }));
    }
    setShowNoteModal(false);
    setNoteDraft("");
  }

  function viewNote() {
    if (!selectedDate) {
      alert("Najpierw kliknij na dzień.");
      return;
    }
    const note = notes[selectedDate];
    if (!note) {
      alert("Brak notatki dla tego dnia.");
    } else {
      alert(`Notatka z dnia ${selectedDate}:\n\n${note}`);
    }
  }

  function deleteNote() {
    if (!selectedDate) {
      alert("Najpierw kliknij na dzień.");
      return;
    }
    if (!notes[selectedDate]) {
      alert("Brak notatki do usunięcia.");
      return;
    }
    if (window.confirm("Czy na pewno usunąć notatkę?")) {
      setNotes(prev => {
        const { [selectedDate]: _, ...rest } = prev;
        return rest;
      });
    }
  }

  // Generowanie siatki kalendarza
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d) =>
    d && viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();

  // Czy dla wybranego dnia istnieje notatka?
  const hasNoteForSelected = selectedDate && notes[selectedDate];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Nagłówek */}
      <div style={{
        background: "#1a1a1a",
        borderBottom: "1px solid #2a2a2a",
        padding: "20px 20px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500 }}>
            {MONTHS_PL[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {activeColors.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveColorId(c.id)}
              title={getLabel(c.id)}
              style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: c.hex,
                border: activeColorId === c.id ? `3px solid #fff` : "3px solid transparent",
                outline: activeColorId === c.id ? `2px solid ${c.hex}` : "none",
                cursor: "pointer",
                transform: activeColorId === c.id ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s, outline 0.15s",
              }}
            />
          ))}
          {activeColors.length < MAX_COLORS && (
            <button
              ref={addButtonRef}
              onClick={() => setShowAddPalette(prev => !prev)}
              style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: "#2a2a2a",
                border: "2px solid #444",
                cursor: "pointer",
                fontSize: 20,
                fontWeight: "bold",
                color: "#aaa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          )}
          {showAddPalette && unusedColors.length > 0 && (
            <div
              id="add-palette-panel"
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: 12,
                background: "#1e1e1e",
                borderRadius: 20,
                padding: "12px 16px",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
                border: "1px solid #333",
                boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                zIndex: 20,
                minWidth: 200,
              }}
            >
              {unusedColors.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => addColorFromPalette(color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: color.hex,
                    border: "2px solid #fff",
                    cursor: "pointer",
                  }}
                  title={color.defaultLabel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kalendarz */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
          {DAYS_PL.map(d => (
            <div key={d} style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: d === "Sb" || d === "Nd" ? "#888" : "#666",
              padding: "6px 0",
              fontFamily: "'DM Mono', monospace",
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = dateKey(day);
            const tickColorIds = ticks[key] || [];
            const colorHexes = tickColorIds.map(id => activeColors.find(c => c.id === id)?.hex).filter(Boolean);
            const today_ = isToday(day);
            const colIndex = i % 7;
            const isWeekend = colIndex === 5 || colIndex === 6;
            const hasNote = !!notes[key];

            const row1 = colorHexes.slice(0, 3);
            const row2 = colorHexes.slice(3, 6);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  border: today_ ? "2px solid #f0f0f0" : "2px solid transparent",
                  background: colorHexes.length > 0 ? "#1f1f1f" : "#1a1a1a",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  position: "relative",
                  transition: "background 0.12s, transform 0.1s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onTouchStart={e => e.currentTarget.style.transform = "scale(0.93)"}
                onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {hasNote && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: 4,
                    backgroundColor: "#ff4d4d",
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }} />
                )}
                <span style={{
                  fontSize: 14,
                  fontWeight: today_ ? 600 : 400,
                  color: isWeekend ? "#888" : (today_ ? "#fff" : "#d0d0d0"),
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {colorHexes.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                    {row1.length > 0 && (
                      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                        {row1.map((hex, idx) => (
                          <div key={idx} style={{ width: 9, height: 9, borderRadius: "50%", background: hex }} />
                        ))}
                      </div>
                    )}
                    {row2.length > 0 && (
                      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                        {row2.map((hex, idx) => (
                          <div key={idx} style={{ width: 9, height: 9, borderRadius: "50%", background: hex }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel notatek – przyciski w jednej linii, nieco większe */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: "#555",
          letterSpacing: "0.1em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Notatki
        </div>
        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "nowrap",
          overflowX: "auto",
          marginBottom: 12,
        }}>
          <button onClick={openNoteModal} style={noteButtonStyle}>
            {hasNoteForSelected ? "✏️ Edytuj" : "📝 Dodaj"}
          </button>
          {hasNoteForSelected && (
            <button onClick={viewNote} style={noteButtonStyle}>👁️ Zobacz</button>
          )}
          {hasNoteForSelected && (
            <button onClick={deleteNote} style={{ ...noteButtonStyle, background: "#3a1a1a", borderColor: "#a00" }}>
              🗑️ Usuń
            </button>
          )}
        </div>
        {selectedDate && (
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            Wybrany dzień: {selectedDate}
          </div>
        )}
      </div>

      {/* Lista kolorów z licznikami */}
      <div style={{ padding: "0 16px" }}>
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
          {activeColors.map(c => (
            <div key={c.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "#1a1a1a",
              borderRadius: 12,
              border: activeColorId === c.id ? `1px solid ${c.hex}66` : "1px solid #2a2a2a",
              cursor: "pointer",
            }}
              onClick={() => setActiveColorId(c.id)}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.hex, flexShrink: 0 }} />
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
                    padding: "2px 0",
                  }}
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 14, color: "#c0c0c0" }}
                  onDoubleClick={e => { e.stopPropagation(); startEditLabel(c.id); }}
                  title="Kliknij dwukrotnie, aby edytować"
                >
                  {getLabel(c.id)}
                  <span style={{ fontSize: 10, color: "#444", marginLeft: 6 }}>(2× klik)</span>
                </span>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, color: c.hex, minWidth: 28, textAlign: "right" }}>
                  {counts[c.id] || 0}
                </span>
                <span style={{ color: "#333", fontSize: 12 }}>·</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#555", minWidth: 24, textAlign: "right" }}>
                  {totalCounts[c.id] || 0}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteColor(c.id); }}
                style={{
                  background: "none", border: "none", color: "#666", fontSize: 16, cursor: "pointer",
                  padding: "0 4px", borderRadius: 20, transition: "color 0.1s", fontWeight: "bold",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#ff8888"}
                onMouseLeave={e => e.currentTarget.style.color = "#666"}
                title="Usuń kolor"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal notatki */}
      {showNoteModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowNoteModal(false)}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 400,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>Notatka dla dnia {selectedDate}</h3>
            <textarea
              autoFocus
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Wpisz treść notatki..."
              rows={5}
              style={{
                width: "100%", background: "#0f0f0f", border: "1px solid #444", borderRadius: 12,
                padding: 12, color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowNoteModal(false)} style={{ ...modalButton, background: "#333" }}>Anuluj</button>
              <button onClick={saveNote} style={{ ...modalButton, background: "#4D9EFF" }}>Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: "none", border: "none", color: "#888", fontSize: 26,
  cursor: "pointer", padding: "0 8px", lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
};

// Nieco większe przyciski notatek (ale nadal w jednej linii)
const noteButtonStyle = {
  background: "#1a1a1a",
  border: "1px solid #3a3a3a",
  borderRadius: 30,
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: 500,
  color: "#ddd",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  whiteSpace: "nowrap",
  transition: "background 0.1s",
};

const modalButton = {
  border: "none", borderRadius: 30, padding: "8px 20px", color: "#fff",
  fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};