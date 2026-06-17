import { useState, useEffect, useRef, useCallback } from "react";

// --------------------------------------------------------------
// BARDZO WYRAZISTE KOLORY (mocno nasycone, żywe)
// --------------------------------------------------------------
const MASTER_PALETTE = [
  { hex: "#FFD700", defaultLabel: "Task " },
  { hex: "#0099FF", defaultLabel: "Task " },
  { hex: "#FF3333", defaultLabel: "Task " },
  { hex: "#33CC33", defaultLabel: "Task " },
  { hex: "#AA33FF", defaultLabel: "Task " },
  { hex: "#FF6600", defaultLabel: "Task " },
  { hex: "#FF3399", defaultLabel: "Task " },
  { hex: "#CC6600", defaultLabel: "Task " },
];

const MAX_COLORS = 6;
const STORAGE_KEY = "tickcal_v8";
const LANG_KEY = "tickcal_lang";

// ---------- TŁUMACZENIA ----------
const translations = {
  pl: {
    months: [
      "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
      "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
    ],
    days: ["Pn","Wt","Śr","Cz","Pt","Sb","Nd"],
    notesManagement: "Notatki i zarządzanie miesiącem",
    tasksHeaderLeft: "Taski w tym miesiącu",
    tasksHeaderRight: "Ten miesiąc · Łącznie",
    transferTasks: "Przenieś taski",
    export: "Eksportuj",
    import: "Importuj",
    resetAll: "Resetuj wszystko",
    backupInfo: "Backup i przywracanie danych (wszystkie miesiące)",
    addNote: "Dodaj notatkę",
    editNote: "Edytuj notatkę",
    viewNote: "Zobacz notatkę",
    deleteNote: "Usuń notatkę",
    resetMonth: "Resetuj miesiąc",
    selectedDay: "Wybrany dzień:",
    noSelection: "Brak wyboru",
    clickDayFirst: "Najpierw kliknij na dowolny dzień w kalendarzu.",
    note: "Notatka",
    noNoteForDay: "Brak notatki dla tego dnia.",
    confirmation: "Potwierdzenie",
    deleteTaskConfirm: "Usunąć \"{taskName}\" z tego miesiąca? Wszystkie jego oznaczenia w tym miesiącu znikną.",
    deleteNoteConfirm: "Czy na pewno usunąć notatkę z tego dnia?",
    limit: "Ograniczenie",
    maxTasks: "Możesz dodać maksymalnie {max} tasków w tym miesiącu.",
    colorAlreadyAdded: "Ten kolor jest już dodany w tym miesiącu.",
    minOneTask: "W tym miesiącu musi pozostać przynajmniej jeden task.",
    resetMonthConfirm: "Czy na pewno chcesz zresetować miesiąc {month} {year}? Wszystkie taski, zaznaczenia i notatki zostaną usunięte, pozostanie tylko jeden task (Task 1).",
    resetAllConfirm: "Czy na pewno chcesz usunąć dane ze wszystkich miesięcy? Zostanie utworzony tylko bieżący miesiąc z jednym taskiem.",
    success: "Sukces",
    dataImported: "Dane zostały zaimportowane.",
    error: "Błąd",
    invalidBackup: "Plik nie jest prawidłowym backupem.",
    invalidFormat: "Nieprawidłowy format",
    invalidBackupFormat: "Nieprawidłowy format pliku backupu.",
    selectSourceMonth: "Wybierz miesiąc źródłowy",
    transfer: "Przenieś",
    cancel: "Anuluj",
    save: "Zapisz",
    ok: "OK",
    noteContent: "Treść notatki",
    noteForDay: "Notatka dla dnia {date}",
    enterNote: "Wpisz treść notatki...",
    doubleClickToRename: "Tapnij/Kliknij x2 aby zmienić nazwę.",
    doubleClickHint: "x2 aby zmienić nazwę",
    doubleClickTitle: "Kliknij dwukrotnie, aby edytować nazwę taska",
    removeTask: "Usuń task z tego miesiąca",
    defaultTaskLabel: "Zadanie",
  },
  en: {
    months: [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ],
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    notesManagement: "Notes & month management",
    tasksHeaderLeft: "Tasks this month",
    tasksHeaderRight: "This month · Total",
    transferTasks: "Transfer tasks",
    export: "Export",
    import: "Import",
    resetAll: "Reset all",
    backupInfo: "Backup & restore (all months)",
    addNote: "Add note",
    editNote: "Edit note",
    viewNote: "View note",
    deleteNote: "Delete note",
    resetMonth: "Reset month",
    selectedDay: "Selected day:",
    noSelection: "No selection",
    clickDayFirst: "First click on any day in the calendar.",
    note: "Note",
    noNoteForDay: "No note for this day.",
    confirmation: "Confirmation",
    deleteTaskConfirm: "Delete \"{taskName}\" from this month? All its marks in this month will disappear.",
    deleteNoteConfirm: "Are you sure you want to delete the note for this day?",
    limit: "Limit",
    maxTasks: "You can add up to {max} tasks in this month.",
    colorAlreadyAdded: "This color is already added in this month.",
    minOneTask: "At least one task must remain in this month.",
    resetMonthConfirm: "Are you sure you want to reset the month {month} {year}? All tasks, marks, and notes will be deleted, leaving only one task (Task 1).",
    resetAllConfirm: "Are you sure you want to delete data from all months? Only the current month with one task will be created.",
    success: "Success",
    dataImported: "Data imported.",
    error: "Error",
    invalidBackup: "File is not a valid backup.",
    invalidFormat: "Invalid format",
    invalidBackupFormat: "Invalid backup file format.",
    selectSourceMonth: "Select source month",
    transfer: "Transfer",
    cancel: "Cancel",
    save: "Save",
    ok: "OK",
    noteContent: "Note content",
    noteForDay: "Note for day {date}",
    enterNote: "Enter note content...",
    doubleClickToRename: "Tap/Double-click to rename.",
    doubleClickHint: "double-click to rename",
    doubleClickTitle: "Double-click to edit task name",
    removeTask: "Remove task from this month",
    defaultTaskLabel: "Task",
  }
};

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

function migrateData(data) {
  if (!data || !data.monthsData) return data;

  const newMonthsData = {};
  for (const [monthKey, monthData] of Object.entries(data.monthsData)) {
    const newTicks = {};
    if (monthData.ticks) {
      for (const [dateKey, value] of Object.entries(monthData.ticks)) {
        const parts = dateKey.split("-");
        if (parts.length === 3) {
          const newKey = `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
          newTicks[newKey] = value;
        } else {
          newTicks[dateKey] = value;
        }
      }
    }

    const newNotes = {};
    if (monthData.notes) {
      for (const [dateKey, value] of Object.entries(monthData.notes)) {
        const parts = dateKey.split("-");
        if (parts.length === 3) {
          const newKey = `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
          newNotes[newKey] = value;
        } else {
          newNotes[dateKey] = value;
        }
      }
    }

    newMonthsData[monthKey] = {
      ...monthData,
      ticks: newTicks,
      notes: newNotes,
    };
  }

  return { ...data, monthsData: newMonthsData };
}

function getDefaultMonthData(lang) {
  const label = lang === 'pl' ? 'Zadanie 1' : 'Task 1';
  const defaultColor = {
    id: Date.now() + Math.random(),
    hex: MASTER_PALETTE[0].hex,
    defaultLabel: label,
  };
  return {
    colors: [defaultColor],
    ticks: {},
    labels: { [defaultColor.id]: label },
    notes: {},
    activeColorId: defaultColor.id,
  };
}

function getInheritedMonthData(sourceData) {
  return {
    colors: sourceData.colors.map(c => ({ ...c })),
    ticks: {},
    labels: { ...sourceData.labels },
    notes: {},
    activeColorId: sourceData.activeColorId,
  };
}

function getMostRecentMonthData(monthsData) {
  const keys = Object.keys(monthsData).sort();
  if (keys.length === 0) return null;
  return monthsData[keys[keys.length - 1]];
}

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

  const [monthsData, setMonthsData] = useState(null);
  const [currentMonthKey, setCurrentMonthKey] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Język
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' ? 'en' : 'pl';
  });
  const tr = translations[lang];

  // Pomocnicza funkcja tłumacząca
  const tt = useCallback((key, vars = {}) => {
    let str = translations[lang][key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }, [lang]);

  // Zapis języka przy zmianie
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Animacja slajdu – przesuwa CAŁY widok miesiąca
  const [slide, setSlide] = useState({
    active: false,
    targetYear: null,
    targetMonth: null,
    swap: false,
  });
  const isSlidingRef = useRef(false);
  const slideContainerRef = useRef(null);

  const [colors, setColors] = useState([]);
  const [ticks, setTicks] = useState({});
  const [labels, setLabels] = useState({});
  const [notes, setNotes] = useState({});
  const [activeColorId, setActiveColorId] = useState(null);

  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [showAddPalette, setShowAddPalette] = useState(false);
  const addButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const [customModal, setCustomModal] = useState({ open: false, title: "", message: "", onConfirm: null, showCancel: false });
  const [viewNoteModal, setViewNoteModal] = useState({ open: false, noteText: "" });

  // Przenoszenie tasków
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceKey, setTransferSourceKey] = useState("");

  // ---------- NAWIGACJA Z ANIMACJĄ ----------
  const navigateMonth = useCallback(
    (direction) => {
      if (isSlidingRef.current) return;
      isSlidingRef.current = true;

      let newYear = viewYear;
      let newMonth = viewMonth;

      if (direction === 1) {
        if (viewMonth === 11) { newYear++; newMonth = 0; }
        else newMonth++;
      } else {
        if (viewMonth === 0) { newYear--; newMonth = 11; }
        else newMonth--;
      }

      const swap = direction === -1;
      const startTranslate = swap ? -100 : 0;
      const endTranslate = swap ? 0 : -100;

      setSlide({
        active: true,
        targetYear: newYear,
        targetMonth: newMonth,
        swap,
      });

      requestAnimationFrame(() => {
        const container = slideContainerRef.current;
        if (!container) return;
        container.style.transition = "none";
        container.style.transform = `translateX(${startTranslate}%)`;
        container.offsetHeight;
        container.style.transition = "transform 0.4s ease";
        container.style.transform = `translateX(${endTranslate}%)`;

        setTimeout(() => {
          setViewYear(newYear);
          setViewMonth(newMonth);
          setSlide({
            active: false,
            targetYear: null,
            targetMonth: null,
            swap: false,
          });
          isSlidingRef.current = false;
          if (slideContainerRef.current) {
            slideContainerRef.current.style.transition = "none";
            slideContainerRef.current.style.transform = "translateX(0%)";
          }
        }, 400);
      });
    },
    [viewYear, viewMonth]
  );

  function prevMonth() { navigateMonth(-1); }
  function nextMonth() { navigateMonth(1); }

  // ---------- SWIPE ----------
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const SWIPE_THRESHOLD = 60;
  const SWIPE_MAX_Y = 100;
  const SWIPE_MAX_TIME = 400;

  useEffect(() => {
    function onTouchStart(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || e.target.closest('button')) return;
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartY.current = e.changedTouches[0].screenY;
      touchStartTime.current = Date.now();
    }
    function onTouchMove(e) {
      if (touchStartX.current === null) return;
      const diffX = Math.abs(touchStartX.current - e.changedTouches[0].screenX);
      const diffY = Math.abs(touchStartY.current - e.changedTouches[0].screenY);
      if (diffX > 15 && diffX > diffY * 1.5) e.preventDefault?.();
    }
    function onTouchEnd(e) {
      if (touchStartX.current === null) return;
      const endX = e.changedTouches[0].screenX;
      const endY = e.changedTouches[0].screenY;
      const diffX = touchStartX.current - endX;
      const diffY = touchStartY.current - endY;
      const elapsed = Date.now() - touchStartTime.current;
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
      if (elapsed > SWIPE_MAX_TIME || Math.abs(diffY) > SWIPE_MAX_Y || Math.abs(diffX) < SWIPE_THRESHOLD) return;
      if (diffX > 0) navigateMonth(1);
      else navigateMonth(-1);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [viewYear, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- INICJALIZACJA DANYCH ----------
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.monthsData) {
      const migrated = migrateData(saved);
      setMonthsData(migrated.monthsData);
    } else {
      const defaultKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
      setMonthsData({ [defaultKey]: getDefaultMonthData(lang) });
    }
    setIsDataLoaded(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!isDataLoaded || monthsData === null) return;
    if (Object.keys(monthsData).length > 0) saveState({ version: 8, monthsData });
  }, [monthsData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded || monthsData === null) return;
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    setCurrentMonthKey(key);
    let data = monthsData[key];
    if (!data) {
      const recentData = getMostRecentMonthData(monthsData);
      data = recentData ? getInheritedMonthData(recentData) : getDefaultMonthData(lang);
      setMonthsData(prev => ({ ...prev, [key]: data }));
    }
    setColors(data.colors);
    setTicks(data.ticks);
    setLabels(data.labels);
    setNotes(data.notes);
    setActiveColorId(data.activeColorId);
  }, [monthsData, viewYear, viewMonth, isDataLoaded, lang]);

  useEffect(() => {
    if (!currentMonthKey || !isDataLoaded || monthsData === null) return;
    setMonthsData(prev => ({ ...prev, [currentMonthKey]: { colors, ticks, labels, notes, activeColorId } }));
  }, [colors, ticks, labels, notes, activeColorId, currentMonthKey, isDataLoaded]);

  // ---------- HANDLERY ----------
  function getTaskNumberFromLabel(label) {
    const match = label.match(/(?:Task|Zadanie) (\d+)/);
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

  function handleDayClick(day) {
    const key = dateKey(day);
    if (selectedDate === key) {
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
      setSelectedDate(key);
    }
  }

  function addColorFromPalette(paletteColor) {
    if (colors.length >= MAX_COLORS) {
      showCustomAlert(tt('limit'), tt('maxTasks', { max: MAX_COLORS }));
      setShowAddPalette(false);
      return;
    }
    if (colors.some(c => c.hex === paletteColor.hex)) {
      showCustomAlert(tt('limit'), tt('colorAlreadyAdded'));
      setShowAddPalette(false);
      return;
    }
    const newId = Date.now() + Math.random();
    const nextNumber = getNextTaskNumber();
    const newLabel = lang === 'pl' ? `Zadanie ${nextNumber}` : `Task ${nextNumber}`;
    const newColor = { ...paletteColor, id: newId, defaultLabel: newLabel };
    setColors(prev => [...prev, newColor]);
    setLabels(prev => ({ ...prev, [newId]: newLabel }));
    setActiveColorId(newId);
    setShowAddPalette(false);
  }

  function deleteColor(colorId) {
    if (colors.length <= 1) {
      showCustomAlert(tt('limit'), tt('minOneTask'));
      return;
    }
    const taskName = getLabel(colorId);
    setCustomModal({
      open: true,
      title: tt('confirmation'),
      message: tt('deleteTaskConfirm', { taskName }),
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
        setCustomModal({ open: false });
      },
      showCancel: true,
    });
  }

  function resetCurrentMonth() {
    if (!currentMonthKey) return;
    setCustomModal({
      open: true,
      title: tt('resetMonth'),
      message: tt('resetMonthConfirm', { month: tr.months[viewMonth], year: viewYear }),
      onConfirm: () => {
        setMonthsData(prev => ({ ...prev, [currentMonthKey]: getDefaultMonthData(lang) }));
        setCustomModal({ open: false });
      },
      showCancel: true,
    });
  }

  // ---------- NOTATKI ----------
  function openNoteModal() {
    if (!selectedDate) {
      showCustomAlert(tt('noSelection'), tt('clickDayFirst'));
      return;
    }
    setNoteDraft(notes[selectedDate] || "");
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
      showCustomAlert(tt('noSelection'), tt('clickDayFirst'));
      return;
    }
    const note = notes[selectedDate];
    if (!note) showCustomAlert(tt('note'), tt('noNoteForDay'));
    else setViewNoteModal({ open: true, noteText: note });
  }
  function deleteNote() {
    if (!selectedDate) {
      showCustomAlert(tt('noSelection'), tt('clickDayFirst'));
      return;
    }
    if (!notes[selectedDate]) {
      showCustomAlert(tt('note'), tt('noNoteForDay'));
      return;
    }
    setCustomModal({
      open: true,
      title: tt('confirmation'),
      message: tt('deleteNoteConfirm'),
      onConfirm: () => {
        setNotes(prev => {
          const { [selectedDate]: _, ...rest } = prev;
          return rest;
        });
        setCustomModal({ open: false });
      },
      showCancel: true,
    });
  }
  function showCustomAlert(title, message) {
    setCustomModal({
      open: true,
      title,
      message,
      onConfirm: () => setCustomModal({ open: false }),
      showCancel: false,
    });
  }

  // ---------- EKSPORT / IMPORT ----------
  function exportData() {
    const dataStr = JSON.stringify({ version: 8, monthsData }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickcal_backup_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== "object") throw new Error(tt('invalidFormat'));
        if (imported.version >= 6 && imported.monthsData) {
          setMonthsData(migrateData(imported).monthsData);
          showCustomAlert(tt('success'), tt('dataImported'));
        } else {
          throw new Error(tt('invalidBackupFormat'));
        }
      } catch (err) {
        showCustomAlert(tt('error'), tt('invalidBackup'));
      }
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e) {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = null;
  }

  function resetAllMonths() {
    setCustomModal({
      open: true,
      title: tt('resetAll'),
      message: tt('resetAllConfirm'),
      onConfirm: () => {
        const defaultKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        setMonthsData({ [defaultKey]: getDefaultMonthData(lang) });
        setCustomModal({ open: false });
      },
      showCancel: true,
    });
  }

  // ---------- LICZNIKI ----------
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

  // ---------- TRANSFER TASKÓW ----------
  const handleTransferTasks = () => {
    if (!transferSourceKey || !monthsData[transferSourceKey]) return;
    const sourceData = monthsData[transferSourceKey];
    const newColors = [];
    const newLabels = {};
    sourceData.colors.forEach((srcColor) => {
      const newId = Date.now() + Math.random();
      newColors.push({ ...srcColor, id: newId });
      newLabels[newId] = sourceData.labels[srcColor.id] || srcColor.defaultLabel;
    });
    setColors(newColors);
    setLabels(newLabels);
    setActiveColorId(newColors.length > 0 ? newColors[0].id : null);
    setTransferModalOpen(false);
    setTransferSourceKey("");
  };

  // ---------- RENDEROWANIE STRONY MIESIĄCA ----------
  const renderMonthPage = (year, month, isInteractive) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthData = monthsData?.[monthKey] || { ticks: {}, notes: {} };
    const monthTicks = monthData.ticks || {};
    const monthNotes = monthData.notes || {};

    const daysInMonth = getDaysInMonth(year, month);
    const offset = getFirstDayOffset(year, month);
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const isToday = (d) =>
      d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();

    const unusedColors = MASTER_PALETTE.filter(
      master => !colors.some(active => active.hex === master.hex)
    );

    return (
      <div style={{ width: "100%", paddingBottom: 0 }}>
        {/* Nagłówek */}
        <div style={{
          background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "20px 20px 16px",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={isInteractive ? prevMonth : undefined} style={navBtnStyle} disabled={!isInteractive}>‹</button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500 }}>
              {tr.months[month]} {year}
            </span>
            <button onClick={isInteractive ? nextMonth : undefined} style={navBtnStyle} disabled={!isInteractive}>›</button>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center", position: "relative" }}>
            {colors.map(c => (
              <button
                key={c.id}
                onClick={() => isInteractive && setActiveColorId(c.id)}
                title={getLabel(c.id)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", background: c.hex,
                  border: activeColorId === c.id ? "3px solid #fff" : "3px solid transparent",
                  outline: activeColorId === c.id ? `2px solid ${c.hex}` : "none",
                  cursor: isInteractive ? "pointer" : "default",
                  transform: activeColorId === c.id ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s, outline 0.15s",
                }}
              />
            ))}
            {isInteractive && colors.length < MAX_COLORS && (
              <button
                ref={addButtonRef}
                onClick={() => setShowAddPalette(prev => !prev)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#2a2a2a",
                  border: "2px solid #444", cursor: "pointer", fontSize: 20,
                  fontWeight: "bold", color: "#aaa", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                +
              </button>
            )}
            {showAddPalette && isInteractive && unusedColors.length > 0 && (
              <div
                id="add-palette-panel"
                style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  marginTop: 12, background: "#1e1e1e", borderRadius: 20, padding: "12px 16px",
                  display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
                  border: "1px solid #333", boxShadow: "0 8px 20px rgba(0,0,0,0.5)", zIndex: 20, minWidth: 200,
                }}
              >
                {unusedColors.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => addColorFromPalette(color)}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: color.hex, border: "2px solid #fff", cursor: "pointer" }}
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
            {tr.days.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: 11, fontWeight: 500,
                color: d === "Sb" || d === "Nd" || d === "Sat" || d === "Sun" ? "#888" : "#666",
                padding: "6px 0", fontFamily: "'DM Mono', monospace",
              }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const tickColorIds = monthTicks[key] || [];
              const colorHexes = tickColorIds.map(id => colors.find(c => c.id === id)?.hex).filter(Boolean);
              const today_ = isToday(day);
              const colIndex = i % 7;
              const isWeekend = colIndex === 5 || colIndex === 6;
              const hasNote = !!monthNotes[key];
              const isSelected = selectedDate === key && isInteractive;

              const row1 = colorHexes.slice(0, 3);
              const row2 = colorHexes.slice(3, 6);

              return (
                <button
                  key={day}
                  onClick={isInteractive ? () => handleDayClick(day) : undefined}
                  style={{
                    aspectRatio: "1", borderRadius: 10,
                    border: isSelected ? "2px solid #4D9EFF" : today_ ? "2px solid #f0f0f0" : "2px solid transparent",
                    background: colorHexes.length > 0 ? "#1f1f1f" : "#1a1a1a",
                    cursor: isInteractive ? "pointer" : "default",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    position: "relative", transition: "background 0.12s, transform 0.1s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onTouchStart={isInteractive ? e => e.currentTarget.style.transform = "scale(0.93)" : undefined}
                  onTouchEnd={isInteractive ? e => e.currentTarget.style.transform = "scale(1)" : undefined}
                  onMouseDown={isInteractive ? e => e.currentTarget.style.transform = "scale(0.93)" : undefined}
                  onMouseUp={isInteractive ? e => e.currentTarget.style.transform = "scale(1)" : undefined}
                >
                  {hasNote && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: 4,
                      backgroundColor: "#ff4d4d", borderTopLeftRadius: 8, borderTopRightRadius: 8,
                    }} />
                  )}
                  <span style={{
                    fontSize: 14, fontWeight: today_ ? 600 : 400,
                    color: isWeekend ? "#888" : (today_ ? "#fff" : "#d0d0d0"),
                    fontFamily: "'DM Mono', monospace", lineHeight: 1,
                  }}>{day}</span>
                  {colorHexes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                      {row1.length > 0 && (
                        <div style={{ display: "flex", gap: 3 }}>
                          {row1.map((hex, idx) => (
                            <div key={idx} style={{ width: 9, height: 9, borderRadius: "50%", background: hex }} />
                          ))}
                        </div>
                      )}
                      {row2.length > 0 && (
                        <div style={{ display: "flex", gap: 3 }}>
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

        {/* Panel notatek + Reset */}
        {isInteractive && (
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555",
              letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase",
            }}>
              {tt('notesManagement')}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", width: "100%", marginBottom: 12 }}>
              {selectedDate && notes[selectedDate] ? (
                <>
                  <button onClick={openNoteModal} style={{ ...wideButton, flex: 1 }}>✏️ {tt('editNote')}</button>
                  <button onClick={viewNote} style={{ ...wideButton, flex: 1 }}>👁️ {tt('viewNote')}</button>
                  <button onClick={deleteNote} style={{ ...wideButton, flex: 1, background: "#3a1a1a", borderColor: "#a00" }}>🗑️ {tt('deleteNote')}</button>
                </>
              ) : (
                <button onClick={openNoteModal} style={{ ...wideButton, width: "100%" }}>📝 {tt('addNote')}</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <button onClick={resetCurrentMonth} style={{ ...wideButton, flex: 1, background: "#2a2a2a", borderColor: "#a00" }}>
                🔄 {tt('resetMonth')}
              </button>
            </div>
            {selectedDate && (
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                {tt('selectedDay')} {selectedDate}
              </div>
            )}
          </div>
        )}

        {/* Lista tasków */}
        {isInteractive && (
          <div style={{ padding: "0 16px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: "#555",
              letterSpacing: "0.1em",
              marginBottom: 10,
              textTransform: "uppercase",
            }}>
              <span>{tt('tasksHeaderLeft')}</span>
              <span>{tt('tasksHeaderRight')}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {colors.map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "#1a1a1a", borderRadius: 12,
                  border: activeColorId === c.id ? `1px solid ${c.hex}66` : "1px solid #2a2a2a",
                  cursor: "pointer",
                }} onClick={() => setActiveColorId(c.id)}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.hex, flexShrink: 0 }} />
                  {editingLabel === c.id ? (
                    <input
                      autoFocus
                      value={labelDraft}
                      onChange={e => setLabelDraft(e.target.value)}
                      onBlur={() => { setLabels(prev => ({ ...prev, [c.id]: labelDraft.trim() })); setEditingLabel(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { setLabels(prev => ({ ...prev, [c.id]: labelDraft.trim() })); setEditingLabel(null); } if (e.key === "Escape") setEditingLabel(null); }}
                      onClick={e => e.stopPropagation()}
                      placeholder={c.defaultLabel}
                      style={{
                        flex: 1, background: "transparent", border: "none",
                        borderBottom: `1px solid ${c.hex}`, outline: "none",
                        color: "#f0f0f0", fontSize: 14, padding: "2px 0",
                      }}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 14, color: "#c0c0c0" }}
                      onDoubleClick={e => { e.stopPropagation(); setEditingLabel(c.id); setLabelDraft(labels[c.id] || ""); }}
                      title={tt('doubleClickTitle')}
                    >
                      {getLabel(c.id)}
                      <span style={{ fontSize: 10, color: "#444", marginLeft: 6 }}>{tt('doubleClickHint')}</span>
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
                    onClick={e => { e.stopPropagation(); deleteColor(c.id); }}
                    style={{
                      background: "none", border: "none", color: "#666", fontSize: 16, cursor: "pointer",
                      padding: "0 4px", borderRadius: 20, transition: "color 0.1s", fontWeight: "bold",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ff8888"}
                    onMouseLeave={e => e.currentTarget.style.color = "#666"}
                    title={tt('removeTask')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setTransferModalOpen(true)}
                style={{ ...wideButton, width: "100%", background: "#2a2a2a", borderColor: "#4D9EFF" }}
              >
                📂 {tt('transferTasks')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };


  // ---------- RENDER GŁÓWNY ----------
  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      minHeight: "100vh",                 // 👈 pełna wysokość ekranu
      display: "flex",
      flexDirection: "column",
      touchAction: "pan-y",
    }}>
      {/* Zawartość slajdu – rośnie, wypychając stopkę na dół */}
      <div style={{ flex: 1, overflow: "hidden", width: "100%" }}>
        <div ref={slideContainerRef} style={{ display: "flex", width: "200%" }}>
          {slide.active && slide.swap ? (
            <>
              <div style={{ width: "50%", flexShrink: 0 }}>
                {renderMonthPage(slide.targetYear, slide.targetMonth, false)}
              </div>
              <div style={{ width: "50%", flexShrink: 0 }}>
                {renderMonthPage(viewYear, viewMonth, false)}
              </div>
            </>
          ) : (
            <>
              <div style={{ width: "50%", flexShrink: 0 }}>
                {renderMonthPage(viewYear, viewMonth, !slide.active)}
              </div>
              {slide.active && (
                <div style={{ width: "50%", flexShrink: 0 }}>
                  {renderMonthPage(slide.targetYear, slide.targetMonth, false)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  
      {/* STOPKA – ZAWSZE NA DOLE (poza slajdem) */}
      {!slide.active && (
        <div style={{
          borderTop: "1px solid #2a2a2a",
          padding: "16px 16px 24px",
          background: "#1a1a1a",
        }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={exportData} style={footerButton}>📤 {tt('export')}</button>
            <button onClick={() => fileInputRef.current.click()} style={footerButton}>📥 {tt('import')}</button>
            <button onClick={resetAllMonths} style={{ ...footerButton, background: "#2a2a2a", borderColor: "#a00" }}>🔄 {tt('resetAll')}</button>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".json" onChange={handleFileSelect} />
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#444", marginTop: 12 }}>
            {tt('backupInfo')}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 12, marginTop: 12 }}>
            <button
              onClick={() => setLang(prev => prev === 'pl' ? 'en' : 'pl')}
              style={{
                background: "none", border: "none", fontSize: 22, cursor: "pointer",
                filter: lang === 'pl' ? "grayscale(0)" : "grayscale(1)",
                opacity: lang === 'pl' ? 1 : 0.5,
              }}
              title="Polski"
            >
              🇵🇱
            </button>
            <button
              onClick={() => setLang(prev => prev === 'en' ? 'pl' : 'en')}
              style={{
                background: "none", border: "none", fontSize: 22, cursor: "pointer",
                filter: lang === 'en' ? "grayscale(0)" : "grayscale(1)",
                opacity: lang === 'en' ? 1 : 0.5,
              }}
              title="English"
            >
              🇬🇧
            </button>
          </div>
        </div>
      )}
      
      {/* Modale */}
      {showNoteModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowNoteModal(false)}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 400,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>
              {tt('noteForDay', { date: selectedDate })}
            </h3>
            <textarea
              autoFocus
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder={tt('enterNote')}
              rows={5}
              style={{
                width: "100%", background: "#0f0f0f", border: "1px solid #444", borderRadius: 12,
                padding: 12, color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowNoteModal(false)} style={{ ...modalButton, background: "#333" }}>
                {tt('cancel')}
              </button>
              <button onClick={saveNote} style={{ ...modalButton, background: "#4D9EFF" }}>
                {tt('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewNoteModal.open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setViewNoteModal({ open: false, noteText: "" })}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 400,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>{tt('noteContent')}</h3>
            <div style={{
              background: "#0f0f0f", border: "1px solid #444", borderRadius: 12,
              padding: 12, color: "#f0f0f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflowY: "auto",
            }}>
              {viewNoteModal.noteText}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setViewNoteModal({ open: false, noteText: "" })} style={{ ...modalButton, background: "#4D9EFF" }}>
                {tt('ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {customModal.open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => {
          if (!customModal.showCancel) setCustomModal({ open: false });
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
                <button onClick={() => setCustomModal({ open: false })} style={{ ...modalButton, background: "#333" }}>
                  {tt('cancel')}
                </button>
              )}
              <button onClick={() => { if (customModal.onConfirm) customModal.onConfirm(); }} style={{ ...modalButton, background: "#4D9EFF" }}>
                {tt('ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setTransferModalOpen(false)}>
          <div style={{
            background: "#1e1e1e", borderRadius: 24, padding: 24, width: "90%", maxWidth: 400,
            border: "1px solid #333", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#fff" }}>
              {tt('selectSourceMonth')}
            </h3>
            <select
              value={transferSourceKey}
              onChange={(e) => setTransferSourceKey(e.target.value)}
              style={{
                width: "100%", background: "#0f0f0f", border: "1px solid #444",
                borderRadius: 12, padding: 12, color: "#f0f0f0", fontSize: 14,
                marginBottom: 20,
              }}
            >
              <option value="">-- {tt('selectSourceMonth')} --</option>
              {Object.keys(monthsData)
                .sort()
                .filter(key => key !== currentMonthKey)
                .map(key => {
                  const [y, m] = key.split("-");
                  return (
                    <option key={key} value={key}>
                      {tr.months[parseInt(m, 10) - 1]} {y}
                    </option>
                  );
                })}
            </select>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setTransferModalOpen(false)} style={{ ...modalButton, background: "#333" }}>
                {tt('cancel')}
              </button>
              <button
                onClick={handleTransferTasks}
                disabled={!transferSourceKey}
                style={{
                  ...modalButton,
                  background: "#4D9EFF",
                  opacity: transferSourceKey ? 1 : 0.5,
                }}
              >
                {tt('transfer')}
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
  background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 40, padding: "10px 0",
  fontSize: "15px", fontWeight: 500, color: "#ddd", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", textAlign: "center", transition: "background 0.1s",
};
const footerButton = {
  background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 30, padding: "8px 16px",
  fontSize: "14px", fontWeight: 500, color: "#ccc", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", transition: "background 0.1s",
};
const modalButton = {
  border: "none", borderRadius: 30, padding: "8px 20px", color: "#fff",
  fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
