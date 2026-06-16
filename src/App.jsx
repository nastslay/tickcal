import { useState, useEffect, useRef } from "react";

// --------------------------------------------------------------
// BARDZO WYRAZISTE KOLORY (mocno nasycone, żywe)
// --------------------------------------------------------------
const MASTER_PALETTE = [
  { hex: "#FFD700", defaultLabel: "Task" }, // złoty
  { hex: "#0099FF", defaultLabel: "Task" }, // neonowy niebieski
  { hex: "#FF3333", defaultLabel: "Task" }, // krwista czerwień
  { hex: "#33CC33", defaultLabel: "Task" }, // intensywna zieleń
  { hex: "#AA33FF", defaultLabel: "Task" }, // mocny fiolet
  { hex: "#FF6600", defaultLabel: "Task" }, // pomarańcz
  { hex: "#FF3399", defaultLabel: "Task" }, // różowy
  { hex: "#CC6600", defaultLabel: "Task" }, // brąz (dla uzupełnienia)
];

const MAX_COLORS = 6;
const STORAGE_KEY = "tickcal_v7"; // v7 – nowe miesiące dziedziczą taski

// ---------- POMOCNICZE FUNKCJE ----------
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

// Domyślne dane dla nowego miesiąca (jeden task "Task 1")
function getDefaultMonthData() {
  const defaultColor = {
    id: Date.now() + Math.random(),
    hex: MASTER_PALETTE[0].hex,
    defaultLabel: "Task 1",
  };
  return {
    colors: [defaultColor],
    ticks: {},
    labels: { [defaultColor.id]: "Task 1" },
    notes: {},
    activeColorId: defaultColor.id,
  };
}

// Nowy miesiąc dziedziczy taski i etykiety z poprzedniego miesiąca
function getInheritedMonthData(sourceData) {
  return {
    colors: sourceData.colors,
    ticks: {},
    labels: { ...sourceData.labels },
    notes: {},
    activeColorId: sourceData.activeColorId,
  };
}

// Znajdź najnowszy miesiąc z dostępnych danych
function getMostRecentMonthData(monthsData) {
  const keys = Object.keys(monthsData).sort();
  if (keys.length === 0) return null;
  return monthsData[keys[keys.length - 1]];
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

// ---------- GŁÓWNY KOMPONENT ----------
export default function App() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthsData, setMonthsData] = useState({});
  const [currentMonthKey, setCurrentMonthKey] = useState(null);

  // Bieżące dane dla otwartego miesiąca
  const [colors, setColors] = useState([]);
  const [ticks, setTicks] = useState({});
  const [labels, setLabels] = useState({});
  const [notes, setNotes] = useState({});
  const [activeColorId, setActiveColorId] = useState(null);

  // UI – edycja etykiety
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [showAddPalette, setShowAddPalette] = useState(false);
  const addButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  // UI – notatki
  const [selectedDate, setSelectedDate] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // UI – modale
  const [customModal, setCustomModal] = useState({ open: false, title: "", message: "", onConfirm: null });
  const [viewNoteModal, setViewNoteModal] = useState({ open: false, noteText: "" });

  // ---------- INICJALIZACJA ----------
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.version === 7 && saved.monthsData) {
      setMonthsData(saved.monthsData);
    } else {
      // Brak danych – utwórz domyślny dla bieżącego miesiąca
      const defaultKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
      const defaultData = getDefaultMonthData();
      setMonthsData({ [defaultKey]: defaultData });
    }
  }, []);

  // Zapisz całość przy każdej zmianie monthsData
  useEffect(() => {
    if (Object.keys(monthsData).length > 0) {
      saveState({ version: 6, monthsData });
    }
  }, [monthsData]);

  // Aktualizuj currentMonthKey i wczytaj dane dla bieżącego miesiąca
  useEffect(() => {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    setCurrentMonthKey(key);
    let data = monthsData[key];
    if (!data) {
      // Nowy miesiąc – odziedzicz taski z poprzedniego miesiąca lub utwórz domyślny
      const recentData = getMostRecentMonthData(monthsData);
      data = recentData ? getInheritedMonthData(recentData) : getDefaultMonthData();
      setMonthsData(prev => ({ ...prev, [key]: data }));
    }
    setColors(data.colors);
    setTicks(data.ticks);
    setLabels(data.labels);
    setNotes(data.notes);
    setActiveColorId(data.activeColorId);
  }, [monthsData, viewYear, viewMonth]);

  // Zapisuj zmiany w bieżącym miesiącu do monthsData
  useEffect(() => {
    if (!currentMonthKey) return;
    const data = {
      colors,
      ticks,
      labels,
      notes,
      activeColorId,
    };
    setMonthsData(prev => ({ ...prev, [currentMonthKey]: data }));
  }, [colors, ticks, labels, notes, activeColorId, currentMonthKey]);

  // ---------- FUNKCJE POMOCNICZE ----------
  function getTaskNumberFromLabel(label) {
    const match = label.match(/Task (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function getNextTaskNumber() {
    let maxNum = 0;
    colors.forEach(c => {
      const label = labels[c.id] || c.defaultLabel;
      const num = getTaskNumberFromLabel(label);
      if (num > maxNum) maxNum = num;
    });
    return maxNum + 1;
  }

  function getLabel(colorId) {
    return labels[colorId] || colors.find(c => c.id === colorId)?.defaultLabel || "";
  }

  function dateKey(d) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // ---------- HANDLERY ----------
  function handleDayClick(day) {
    const key = dateKey(day);
    if (selectedDate === key) {
      // Drugie kliknięcie – dodaj/usuń ticka
      if (activeColorId) {
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
    } else {
      // Pierwsze kliknięcie – tylko zaznacz dzień
      setSelectedDate(key);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // ---------- OPERACJE NA TASKACH (BIEŻĄCY MIESIĄC) ----------
  function addColorFromPalette(paletteColor) {
    if (colors.length >= MAX_COLORS) {
      showCustomAlert("Ograniczenie", `Możesz dodać maksymalnie ${MAX_COLORS} tasków w tym miesiącu.`);
      setShowAddPalette(false);
      return;
    }
    const alreadyExists = colors.some(c => c.hex === paletteColor.hex);
    if (alreadyExists) {
      showCustomAlert("Uwaga", "Ten kolor jest już dodany w tym miesiącu.");
      setShowAddPalette(false);
      return;
    }
    const newId = Date.now() + Math.random();
    const nextNumber = getNextTaskNumber();
    const newLabel = `Task ${nextNumber}`;
    const newColor = { ...paletteColor, id: newId, defaultLabel: newLabel };
    setColors(prev => [...prev, newColor]);
    setLabels(prev => ({ ...prev, [newId]: newLabel }));
    setActiveColorId(newId);
    setShowAddPalette(false);
  }

  function deleteColor(colorId) {
    if (colors.length <= 1) {
      showCustomAlert("Uwaga", "W tym miesiącu musi pozostać przynajmniej jeden task. Możesz użyć Resetu miesiąca, aby przywrócić domyślne ustawienia.");
      return;
    }
    const taskName = getLabel(colorId);
    setCustomModal({
      open: true,
      title: "Potwierdzenie",
      message: `Usunąć "${taskName}" z tego miesiąca? Wszystkie jego oznaczenia w tym miesiącu znikną.`,
      onConfirm: () => {
        setColors(prev => prev.filter(c => c.id !== colorId));
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
        setCustomModal({ open: false, title: "", message: "", onConfirm: null });
      },
      showCancel: true,
    });
  }

  // Resetuj bieżący miesiąc – przywraca jeden task, czyści ticki i notatki
  function resetCurrentMonth() {
    const key = currentMonthKey;
    if (!key) return;
    setCustomModal({
      open: true,
      title: "Reset miesiąca",
      message: `Czy na pewno chcesz zresetować miesiąc ${MONTHS_PL[viewMonth]} ${viewYear}? Wszystkie taski, zaznaczenia i notatki zostaną usunięte, pozostanie tylko jeden task (Task 1).`,
      onConfirm: () => {
        const newData = getDefaultMonthData();
        setMonthsData(prev => ({ ...prev, [key]: newData }));
        // Lokalne stany zostaną zaktualizowane przez useEffect
        setCustomModal({ open: false, title: "", message: "", onConfirm: null });
      },
      showCancel: true,
    });
  }

  // ---------- OPERACJE NA NOTATKACH ----------
  function openNoteModal() {
    if (!selectedDate) {
      showCustomAlert("Brak wyboru", "Najpierw kliknij na dowolny dzień w kalendarzu.");
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
      showCustomAlert("Brak wyboru", "Najpierw kliknij na dzień.");
      return;
    }
    const note = notes[selectedDate];
    if (!note) {
      showCustomAlert("Notatka", "Brak notatki dla tego dnia.");
    } else {
      setViewNoteModal({ open: true, noteText: note });
    }
  }

  function deleteNote() {
    if (!selectedDate) {
      showCustomAlert("Brak wyboru", "Najpierw kliknij na dzień.");
      return;
    }
    if (!notes[selectedDate]) {
      showCustomAlert("Notatka", "Brak notatki do usunięcia.");
      return;
    }
    setCustomModal({
      open: true,
      title: "Potwierdzenie",
      message: "Czy na pewno usunąć notatkę z tego dnia?",
      onConfirm: () => {
        setNotes(prev => {
          const { [selectedDate]: _, ...rest } = prev;
          return rest;
        });
        setCustomModal({ open: false, title: "", message: "", onConfirm: null });
      },
      showCancel: true,
    });
  }

  function showCustomAlert(title, message) {
    setCustomModal({
      open: true,
      title,
      message,
      onConfirm: () => setCustomModal({ open: false, title: "", message: "", onConfirm: null }),
      showCancel: false,
    });
  }

  // ---------- EKSPORT / IMPORT ----------
  function exportData() {
    const dataStr = JSON.stringify({ version: 6, monthsData }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickcal_backup_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== "object") throw new Error("Nieprawidłowy format");
        if (imported.version === 6 && imported.monthsData) {
          setMonthsData(imported.monthsData);
          showCustomAlert("Sukces", "Dane zostały zaimportowane.");
        } else {
          throw new Error("Nieprawidłowy format pliku backupu.");
        }
      } catch (err) {
        showCustomAlert("Błąd", "Plik nie jest prawidłowym backupem.");
      }
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = null;
  }

  // ---------- RESET GLOBALNY (wszystkie miesiące) ----------
  function resetAllMonths() {
    setCustomModal({
      open: true,
      title: "Reset wszystkich danych",
      message: "Czy na pewno chcesz usunąć dane ze wszystkich miesięcy? Zostanie utworzony tylko bieżący miesiąc z jednym taskiem.",
      onConfirm: () => {
        const defaultKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        const defaultData = getDefaultMonthData();
        setMonthsData({ [defaultKey]: defaultData });
        setCustomModal({ open: false, title: "", message: "", onConfirm: null });
      },
      showCancel: true,
    });
  }

  // ---------- OBLICZANIE LICZNIKÓW (dla bieżącego miesiąca) ----------
  const counts = {};
  colors.forEach(c => { counts[c.id] = 0; });
  Object.entries(ticks).forEach(([key, colorIds]) => {
    const [y, m] = key.split("-").map(Number);
    if (y === viewYear && m === viewMonth + 1) {
      colorIds.forEach(cid => { counts[cid] = (counts[cid] || 0) + 1; });
    }
  });

  const totalCounts = {};
  colors.forEach(c => { totalCounts[c.id] = 0; });
  Object.values(ticks).forEach(colorIds => {
    colorIds.forEach(cid => { totalCounts[cid] = (totalCounts[cid] || 0) + 1; });
  });

  // ---------- RENDER KALENDARZA ----------
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const offset = getFirstDayOffset(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d) =>
    d && viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();

  const hasNoteForSelected = selectedDate && notes[selectedDate];

  // ---------- Nieużywane kolory z palety (dla bieżącego miesiąca) ----------
  const unusedColors = MASTER_PALETTE.filter(
    master => !colors.some(active => active.hex === master.hex)
  );

  // Zamknij paletę po kliknięciu poza nią
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

  // ---------- RENDER ----------
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
          {colors.map(c => (
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
          {colors.length < MAX_COLORS && (
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
            const colorHexes = tickColorIds.map(id => colors.find(c => c.id === id)?.hex).filter(Boolean);
            const today_ = isToday(day);
            const colIndex = i % 7;
            const isWeekend = colIndex === 5 || colIndex === 6;
            const hasNote = !!notes[key];
            const isSelected = selectedDate === key;

            const row1 = colorHexes.slice(0, 3);
            const row2 = colorHexes.slice(3, 6);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  border: isSelected
                    ? "2px solid #4D9EFF"
                    : today_ ? "2px solid #f0f0f0" : "2px solid transparent",
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

      {/* Panel notatek + Reset miesiąca */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: "#555",
          letterSpacing: "0.1em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Notatki i zarządzanie miesiącem
        </div>
        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "nowrap",
          width: "100%",
          marginBottom: 12,
        }}>
          {hasNoteForSelected ? (
            <>
              <button onClick={openNoteModal} style={{ ...wideButton, flex: 1 }}>✏️ Edytuj notatkę</button>
              <button onClick={viewNote} style={{ ...wideButton, flex: 1 }}>👁️ Zobacz notatkę</button>
              <button onClick={deleteNote} style={{ ...wideButton, flex: 1, background: "#3a1a1a", borderColor: "#a00" }}>🗑️ Usuń notatkę</button>
            </>
          ) : (
            <button onClick={openNoteModal} style={{ ...wideButton, width: "100%" }}>📝 Dodaj notatkę</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button onClick={resetCurrentMonth} style={{ ...wideButton, flex: 1, background: "#2a2a2a", borderColor: "#a00" }}>
            🔄 Resetuj miesiąc
          </button>
        </div>
        {selectedDate && (
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            Wybrany dzień: {selectedDate}
          </div>
        )}
      </div>

      {/* Lista tasków w bieżącym miesiącu */}
      <div style={{ padding: "0 16px" }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: "#555",
          letterSpacing: "0.1em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Taski w tym miesiącu · Ten miesiąc · Łącznie
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {colors.map(c => (
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
                  onBlur={() => {
                    setLabels(prev => ({ ...prev, [c.id]: labelDraft.trim() }));
                    setEditingLabel(null);
                  }}
                  onKeyDown={e => { if (e.key === "Enter") { setLabels(prev => ({ ...prev, [c.id]: labelDraft.trim() })); setEditingLabel(null); } if (e.key === "Escape") setEditingLabel(null); }}
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
                  onDoubleClick={e => { e.stopPropagation(); setEditingLabel(c.id); setLabelDraft(labels[c.id] || ""); }}
                  title="Kliknij dwukrotnie, aby edytować nazwę taska"
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
                title="Usuń task z tego miesiąca"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* STOPKA – Eksport / Import / Reset globalny */}
      <div style={{
        marginTop: 32,
        borderTop: "1px solid #2a2a2a",
        padding: "16px 16px 24px",
      }}>
        <div style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button onClick={exportData} style={footerButton}>📤 Eksportuj</button>
          <button onClick={() => fileInputRef.current.click()} style={footerButton}>📥 Importuj</button>
          <button onClick={resetAllMonths} style={{ ...footerButton, background: "#2a2a2a", borderColor: "#a00" }}>🔄 Resetuj wszystko</button>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".json" onChange={handleFileSelect} />
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#444", marginTop: 12 }}>
          Backup i przywracanie danych (wszystkie miesiące)
        </div>
      </div>

      {/* MODALE (bez zmian) */}
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

      {viewNoteModal.open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setViewNoteModal({ open: false, noteText: "" })}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 400,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>Treść notatki</h3>
            <div style={{
              background: "#0f0f0f", border: "1px solid #444", borderRadius: 12,
              padding: 12, color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflowY: "auto",
            }}>
              {viewNoteModal.noteText}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setViewNoteModal({ open: false, noteText: "" })} style={{ ...modalButton, background: "#4D9EFF" }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {customModal.open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => {
          if (!customModal.showCancel) setCustomModal({ open: false, title: "", message: "", onConfirm: null, showCancel: false });
        }}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 350,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>{customModal.title}</h3>
            <div style={{ color: "#ddd", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              {customModal.message}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              {customModal.showCancel && (
                <button onClick={() => setCustomModal({ open: false, title: "", message: "", onConfirm: null, showCancel: false })} style={{ ...modalButton, background: "#333" }}>
                  Anuluj
                </button>
              )}
              <button onClick={() => { if (customModal.onConfirm) customModal.onConfirm(); }} style={{ ...modalButton, background: "#4D9EFF" }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- STYLE ----------
const navBtnStyle = {
  background: "none", border: "none", color: "#888", fontSize: 26,
  cursor: "pointer", padding: "0 8px", lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
};

const wideButton = {
  background: "#1a1a1a",
  border: "1px solid #3a3a3a",
  borderRadius: 40,
  padding: "10px 0",
  fontSize: "15px",
  fontWeight: 500,
  color: "#ddd",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  textAlign: "center",
  transition: "background 0.1s",
};

const footerButton = {
  background: "#1a1a1a",
  border: "1px solid #3a3a3a",
  borderRadius: 30,
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: 500,
  color: "#ccc",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  transition: "background 0.1s",
};

const modalButton = {
  border: "none", borderRadius: 30, padding: "8px 20px", color: "#fff",
  fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
