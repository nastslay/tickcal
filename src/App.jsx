import { useState, useEffect, useRef } from "react";

// Predefiniowana paleta kolorów (sztywno zakodowane, użytkownik nie wybiera dowolnego koloru)
const MASTER_PALETTE = [
  { hex: "#E8C547", defaultLabel: "Żółty" },
  { hex: "#5B9BF0", defaultLabel: "Niebieski" },
  { hex: "#F07373", defaultLabel: "Czerwony" },
  { hex: "#6DCF8E", defaultLabel: "Zielony" },
  { hex: "#C56CE8", defaultLabel: "Fioletowy" },
  { hex: "#F09B42", defaultLabel: "Pomarańczowy" },
  { hex: "#F27EA8", defaultLabel: "Różowy" },
  { hex: "#8B5A2B", defaultLabel: "Brązowy" },
];

const MAX_COLORS = 6;
const STORAGE_KEY = "tickcal_v3";

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

// Migracja starych danych (pojedynczy kolor na dzień -> tablica)
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
  const [activeColors, setActiveColors] = useState([]);   // tablica obiektów kolorów z unikalnym id
  const [activeColorId, setActiveColorId] = useState(null);
  const [ticks, setTicks] = useState({});   // "YYYY-MM-DD" -> array of color ids
  const [labels, setLabels] = useState({}); // colorId -> custom label
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [showAddPalette, setShowAddPalette] = useState(false);
  const addButtonRef = useRef(null);

  // Inicjalizacja: wczytaj z localStorage lub ustaw domyślne 4 kolory
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.activeColors && Array.isArray(saved.activeColors)) {
        setActiveColors(saved.activeColors);
      } else {
        // Domyślnie pierwsze 4 kolory z palety
        const defaultColors = MASTER_PALETTE.slice(0, 4).map((c, idx) => ({
          ...c,
          id: idx + 1, // stare ID dla kompatybilności
        }));
        setActiveColors(defaultColors);
      }
      if (saved.ticks) {
        setTicks(migrateTicks(saved.ticks));
      }
      if (saved.labels) {
        setLabels(saved.labels);
      }
      if (saved.activeColorId) {
        setActiveColorId(saved.activeColorId);
      }
    } else {
      // Brak zapisanych danych – ustaw domyślne 4 kolory
      const defaultColors = MASTER_PALETTE.slice(0, 4).map((c, idx) => ({
        ...c,
        id: idx + 1,
      }));
      setActiveColors(defaultColors);
      if (defaultColors.length > 0) setActiveColorId(defaultColors[0].id);
    }
  }, []);

  // Zapisz do localStorage przy każdej zmianie
  useEffect(() => {
    saveState({
      activeColors,
      ticks,
      labels,
      activeColorId,
    });
  }, [activeColors, ticks, labels, activeColorId]);

  // Upewnij się, że aktywny kolor istnieje
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

  // Liczniki dla aktualnego miesiąca
  const counts = {};
  activeColors.forEach(c => { counts[c.id] = 0; });
  Object.entries(ticks).forEach(([key, colorIds]) => {
    const [y, m] = key.split("-").map(Number);
    if (y === viewYear && m === viewMonth + 1) {
      colorIds.forEach(cid => {
        counts[cid] = (counts[cid] || 0) + 1;
      });
    }
  });

  // Liczniki ogółem
  const totalCounts = {};
  activeColors.forEach(c => { totalCounts[c.id] = 0; });
  Object.values(ticks).forEach(colorIds => {
    colorIds.forEach(cid => {
      totalCounts[cid] = (totalCounts[cid] || 0) + 1;
    });
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Dodawanie koloru z predefiniowanej palety
  function addColorFromPalette(paletteColor) {
    if (activeColors.length >= MAX_COLORS) {
      alert(`Możesz dodać maksymalnie ${MAX_COLORS} kolorów.`);
      setShowAddPalette(false);
      return;
    }
    // Sprawdź czy kolor o takim hex już istnieje (opcjonalnie – można dodać ten sam kolor? Zakładamy, że nie)
    const alreadyExists = activeColors.some(c => c.hex === paletteColor.hex);
    if (alreadyExists) {
      alert("Ten kolor jest już dodany.");
      setShowAddPalette(false);
      return;
    }
    const newId = Date.now();
    const newColor = {
      ...paletteColor,
      id: newId,
    };
    setActiveColors(prev => [...prev, newColor]);
    setLabels(prev => ({ ...prev, [newId]: paletteColor.defaultLabel }));
    setActiveColorId(newId);
    setShowAddPalette(false);
  }

  function deleteColor(colorId) {
    if (activeColors.length <= 1) {
      alert("Musi pozostać przynajmniej jeden kolor.");
      return;
    }
    const colorToDelete = activeColors.find(c => c.id === colorId);
    if (!colorToDelete) return;
    const confirmMsg = `Usunąć kolor "${getLabel(colorId)}"? Wszystkie oznaczenia tym kolorem znikną.`;
    if (!window.confirm(confirmMsg)) return;

    // Usuń z listy aktywnych kolorów
    setActiveColors(prev => prev.filter(c => c.id !== colorId));
    // Usuń z wszystkich ticków
    setTicks(prev => {
      const newTicks = {};
      for (const [date, colorIds] of Object.entries(prev)) {
        const filtered = colorIds.filter(id => id !== colorId);
        if (filtered.length > 0) {
          newTicks[date] = filtered;
        }
      }
      return newTicks;
    });
    // Usuń etykietę
    setLabels(prev => {
      const { [colorId]: _, ...rest } = prev;
      return rest;
    });
    // Aktywny kolor zostanie automatycznie zaktualizowany przez useEffect
  }

  // Nieużywane kolory z palety (których nie ma w activeColors)
  const unusedColors = MASTER_PALETTE.filter(
    masterColor => !activeColors.some(active => active.hex === masterColor.hex)
  );

  // Zamknięcie palety po kliknięciu poza nią
  useEffect(() => {
    function handleClickOutside(event) {
      if (addButtonRef.current && !addButtonRef.current.contains(event.target)) {
        const paletteDiv = document.getElementById("add-palette-panel");
        if (paletteDiv && !paletteDiv.contains(event.target)) {
          setShowAddPalette(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generowanie siatki kalendarza
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
      {/* Nagłówek */}
      <div style={{
        background: "#1a1a1a",
        borderBottom: "1px solid #2a2a2a",
        padding: "20px 20px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Nawigacja miesiąca */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, letterSpacing: "-0.5px" }}>
            {MONTHS_PL[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        {/* Kółka kolorów + przycisk dodawania */}
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
                transition: "transform 0.15s, outline 0.15s",
                transform: activeColorId === c.id ? "scale(1.2)" : "scale(1)",
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
                transition: "background 0.1s",
              }}
              title="Dodaj kolor z palety (max 6)"
            >
              +
            </button>
          )}

          {/* Panel wyboru koloru z palety */}
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
                    transition: "transform 0.1s",
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
              letterSpacing: "0.05em",
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

            // Podziel kropki na dwa rzędy (maksymalnie 3 w rzędzie)
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
                {colorHexes.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                    {row1.length > 0 && (
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        {row1.map((hex, idx) => (
                          <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: hex }} />
                        ))}
                      </div>
                    )}
                    {row2.length > 0 && (
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        {row2.map((hex, idx) => (
                          <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: hex }} />
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

      {/* Lista kolorów z licznikami i przyciskami usuwania */}
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
                  <span style={{ fontSize: 10, color: "#444", marginLeft: 6 }}>(2× klik)</span>
                </span>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 18,
                  fontWeight: 500,
                  color: c.hex,
                  minWidth: 28,
                  textAlign: "right",
                }}>
                  {counts[c.id] || 0}
                </span>
                <span style={{ color: "#333", fontSize: 12 }}>·</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  color: "#555",
                  minWidth: 24,
                  textAlign: "right",
                }}>
                  {totalCounts[c.id] || 0}
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); deleteColor(c.id); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                  borderRadius: 20,
                  transition: "color 0.1s",
                  fontWeight: "bold",
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