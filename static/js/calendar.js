/**
 * SKILLFORGE — Custom Calendar
 * Attaches to any input[type="date"] with class .task-form__input--date
 * Matches the black/white design system from add_task.css
 */

(function () {
  const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  const MONTHS_RU_GEN = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  let currentYear, currentMonth, selectedDate, activeInput;
  let overlay, popup, gridEl, titleEl, selectedValEl;

  function init() {
    injectCSS();
    buildDOM();
    bindInputs();
  }

  function injectCSS() {
    if (document.getElementById("sf-cal-style")) return;
    const style = document.createElement("style");
    style.id = "sf-cal-style";
    style.textContent = `
      .sf-cal-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,.6);
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease;
      }
      .sf-cal-overlay.sf-cal-overlay--visible {
        opacity: 1;
        pointer-events: all;
      }
      .sf-cal-popup {
        background: #121212;
        border-radius: 18px;
        padding: 22px;
        width: 320px;
        box-shadow: 0 32px 80px rgba(0,0,0,.9);
        transform: translateY(12px) scale(.97);
        transition: transform .22s ease, opacity .22s ease;
        opacity: 0;
        font-family: "Fira Sans", system-ui, -apple-system, sans-serif;
        color: #fff;
        box-sizing: border-box;
      }
      .sf-cal-overlay--visible .sf-cal-popup {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      .sf-cal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .sf-cal-title {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: .02em;
        color: #fff;
      }
      .sf-cal-nav {
        display: flex;
        gap: 6px;
      }
      .sf-cal-nav-btn {
        background: #1c1c1e;
        border: none;
        border-radius: 8px;
        color: #8a8a8e;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
        transition: background .15s, color .15s;
        font-family: inherit;
      }
      .sf-cal-nav-btn:hover {
        background: #2a2a2a;
        color: #fff;
      }
      .sf-cal-dow {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        margin-bottom: 6px;
      }
      .sf-cal-dow span {
        text-align: center;
        font-size: 10px;
        font-weight: 500;
        color: #8a8a8e;
        padding: 4px 0;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .sf-cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
      }
      .sf-cal-day {
        aspect-ratio: 1;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 400;
        color: #fff;
        cursor: pointer;
        border: none;
        background: transparent;
        transition: background .13s, color .13s;
        font-family: inherit;
        position: relative;
      }
      .sf-cal-day:hover:not(.sf-cal-day--empty):not(.sf-cal-day--selected):not(.sf-cal-day--disabled) {
        background: #242424;
      }
      .sf-cal-day--empty { cursor: default; }
      .sf-cal-day--other { color: #3a3a3a; pointer-events: none; }
      .sf-cal-day--disabled { color: #2e2e2e; cursor: not-allowed; pointer-events: none; }
      .sf-cal-day--today {
        font-weight: 600;
        border: 1px solid rgba(255,255,255,.55);
      }
      .sf-cal-day--selected {
        background: #fff !important;
        color: #000 !important;
        font-weight: 600;
      }
      .sf-cal-footer {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #1f1f1f;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .sf-cal-footer-info { display: flex; flex-direction: column; gap: 2px; }
      .sf-cal-label {
        font-size: 10px;
        color: #8a8a8e;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .sf-cal-val {
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        min-height: 18px;
      }
      .sf-cal-footer-btns { display: flex; gap: 8px; }
      .sf-cal-cancel {
        background: #1c1c1e;
        color: #8a8a8e;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        padding: 8px 14px;
        cursor: pointer;
        transition: background .15s, color .15s;
      }
      .sf-cal-cancel:hover { background: #2a2a2a; color: #fff; }
      .sf-cal-confirm {
        background: #fff;
        color: #000;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 18px;
        cursor: pointer;
        transition: background .15s, transform .1s;
      }
      .sf-cal-confirm:hover { background: #e0e0e0; }
      .sf-cal-confirm:active { transform: scale(.97); }
    `;
    document.head.appendChild(style);
  }

  function buildDOM() {
    overlay = document.createElement("div");
    overlay.className = "sf-cal-overlay";
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Выбор даты");

    popup = document.createElement("div");
    popup.className = "sf-cal-popup";

    // Header
    const header = document.createElement("div");
    header.className = "sf-cal-header";

    titleEl = document.createElement("span");
    titleEl.className = "sf-cal-title";

    const nav = document.createElement("div");
    nav.className = "sf-cal-nav";

    const prevBtn = makeNavBtn("‹", () => shiftMonth(-1));
    const nextBtn = makeNavBtn("›", () => shiftMonth(1));
    nav.append(prevBtn, nextBtn);
    header.append(titleEl, nav);

    // Days of week
    const dow = document.createElement("div");
    dow.className = "sf-cal-dow";
    DAYS_SHORT.forEach((d) => {
      const s = document.createElement("span");
      s.textContent = d;
      dow.appendChild(s);
    });

    // Day grid
    gridEl = document.createElement("div");
    gridEl.className = "sf-cal-grid";

    // Footer
    const footer = document.createElement("div");
    footer.className = "sf-cal-footer";

    const info = document.createElement("div");
    info.className = "sf-cal-footer-info";
    const lbl = document.createElement("span");
    lbl.className = "sf-cal-label";
    lbl.textContent = "Выбрано";
    selectedValEl = document.createElement("span");
    selectedValEl.className = "sf-cal-val";
    info.append(lbl, selectedValEl);

    const btns = document.createElement("div");
    btns.className = "sf-cal-footer-btns";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sf-cal-cancel";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Отмена";
    cancelBtn.addEventListener("click", closeCalendar);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "sf-cal-confirm";
    confirmBtn.type = "button";
    confirmBtn.textContent = "Готово";
    confirmBtn.addEventListener("click", confirmDate);

    btns.append(cancelBtn, confirmBtn);
    footer.append(info, btns);

    popup.append(header, dow, gridEl, footer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCalendar();
    });

    // Keyboard navigation
    document.addEventListener("keydown", onKeyDown);
  }

  function makeNavBtn(label, onClick) {
    const btn = document.createElement("button");
    btn.className = "sf-cal-nav-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function bindInputs() {
    document.querySelectorAll("input[type='date'].task-form__input--date").forEach((input) => {
      input.setAttribute("readonly", "true");
      input.addEventListener("click", (e) => {
        e.preventDefault();
        openCalendar(input);
      });
      input.addEventListener("focus", (e) => {
        e.preventDefault();
      });
    });
  }

  function openCalendar(input) {
    activeInput = input;
    const today = new Date();

    if (input.value) {
      const [y, m, d] = input.value.split("-").map(Number);
      selectedDate = new Date(y, m - 1, d);
      currentYear = y;
      currentMonth = m - 1;
    } else {
      selectedDate = null;
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
    }

    renderGrid();
    overlay.classList.add("sf-cal-overlay--visible");

    // Trap focus to popup
    setTimeout(() => popup.querySelector(".sf-cal-nav-btn").focus(), 50);
  }

  function closeCalendar() {
    overlay.classList.remove("sf-cal-overlay--visible");
    if (activeInput) activeInput.focus();
    activeInput = null;
  }

  function confirmDate() {
    if (!selectedDate || !activeInput) { closeCalendar(); return; }

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    activeInput.value = `${y}-${m}-${d}`;
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    closeCalendar();
  }

  function shiftMonth(delta) {
    const today = new Date();
    const minYear = today.getFullYear();
    const minMonth = today.getMonth();

    // Block navigating to past months
    if (delta < 0 && currentYear === minYear && currentMonth === minMonth) return;

    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderGrid();
  }

  function renderGrid() {
    titleEl.textContent = `${MONTHS_RU[currentMonth]} ${currentYear}`;

    // Update footer label
    if (selectedDate) {
      selectedValEl.textContent = `${selectedDate.getDate()} ${MONTHS_RU_GEN[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else {
      selectedValEl.textContent = "—";
    }

    gridEl.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dim the "prev" nav button when already on the current month
    const prevBtn = popup.querySelector(".sf-cal-nav-btn");
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
    prevBtn.style.opacity = isCurrentMonth ? "0.25" : "1";
    prevBtn.style.cursor = isCurrentMonth ? "default" : "pointer";

    const firstDay = new Date(currentYear, currentMonth, 1);
    // Monday-first: 0=Mon … 6=Sun
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sf-cal-day";

      let cellDate;

      if (i < startOffset) {
        // Previous month ghost cells — always disabled
        const day = daysInPrev - startOffset + i + 1;
        cellDate = new Date(currentYear, currentMonth - 1, day);
        btn.textContent = day;
        btn.classList.add("sf-cal-day--other");
      } else if (i < startOffset + daysInMonth) {
        // Current month
        const day = i - startOffset + 1;
        cellDate = new Date(currentYear, currentMonth, day);
        btn.textContent = day;

        const isPast = cellDate.getTime() < today.getTime();
        const isToday = cellDate.getTime() === today.getTime();
        const isSelected = selectedDate && cellDate.getTime() === selectedDate.getTime();

        if (isPast) {
          btn.classList.add("sf-cal-day--disabled");
        } else {
          if (isToday) btn.classList.add("sf-cal-day--today");
          if (isSelected) btn.classList.add("sf-cal-day--selected");
          btn.addEventListener("click", () => selectDay(cellDate));
        }
      } else {
        // Next month ghost cells
        const day = i - startOffset - daysInMonth + 1;
        cellDate = new Date(currentYear, currentMonth + 1, day);
        btn.textContent = day;
        btn.classList.add("sf-cal-day--other");
      }

      gridEl.appendChild(btn);
    }
  }

  function selectDay(date) {
    selectedDate = date;
    renderGrid();
  }

  function onKeyDown(e) {
    if (!overlay.classList.contains("sf-cal-overlay--visible")) return;
    if (e.key === "Escape") closeCalendar();
    if (e.key === "Enter") confirmDate();
  }

  // Auto-init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
