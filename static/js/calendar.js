(function () {
  const dateInput = document.querySelector(".create-task__input--date");
  if (!dateInput) return;

  const overlay = document.createElement("div");
  overlay.className = "cal-overlay";
  overlay.innerHTML = `
    <div class="cal-popup">
      <div class="cal-header">
        <span class="cal-title">Выберите дату</span>
        <div class="cal-nav"><button type="button" class="cal-nav-btn" data-dir="-1">←</button><button type="button" class="cal-nav-btn" data-dir="1">→</button></div>
      </div>
      <div class="cal-dow"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>
      <div class="cal-grid"></div>
      <div class="cal-footer">
        <div class="cal-footer-info"><span class="cal-selected-label">Выбрано</span><span class="cal-selected-val">—</span></div>
        <div class="cal-footer-btns"><button type="button" class="cal-cancel-btn">Отмена</button><button type="button" class="cal-confirm-btn">OK</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let currentDate = new Date();
  let selectedDate = null;
  const grid = overlay.querySelector(".cal-grid");
  const selectedVal = overlay.querySelector(".cal-selected-val");
  const cancelBtn = overlay.querySelector(".cal-cancel-btn");
  const confirmBtn = overlay.querySelector(".cal-confirm-btn");
  const navBtns = overlay.querySelectorAll(".cal-nav-btn");

  function render() {
    grid.innerHTML = "";
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startDay; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-day cal-day--disabled";
      grid.appendChild(cell);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "cal-day";
      cell.textContent = d;
      if (
        selectedDate &&
        d === selectedDate.getDate() &&
        month === selectedDate.getMonth() &&
        year === selectedDate.getFullYear()
      ) {
        cell.classList.add("cal-day--selected");
      }
      cell.addEventListener("click", () => {
        if (cell.classList.contains("cal-day--disabled")) return;
        selectedDate = new Date(year, month, d);
        render();
        selectedVal.textContent = selectedDate.toLocaleDateString("ru-RU");
      });
      grid.appendChild(cell);
    }
    overlay.querySelector(".cal-title").textContent =
      `${currentDate.toLocaleString("ru-RU", { month: "long", year: "numeric" })}`;
  }

  function open() {
    overlay.classList.add("cal-overlay--visible");
    render();
  }

  function close() {
    overlay.classList.remove("cal-overlay--visible");
  }

  dateInput.addEventListener("click", open);

  cancelBtn.addEventListener("click", close);
  confirmBtn.addEventListener("click", () => {
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      dateInput.value = `${y}-${m}-${d}`;
    }
    close();
  });

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = parseInt(btn.dataset.dir);
      currentDate.setMonth(currentDate.getMonth() + dir);
      render();
    });
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
})();

// Логика управления модальным окном
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("createTaskModal");
  const openBtn = document.getElementById("openTaskModalBtn");
  const closeBtn = document.getElementById("closeTaskModalBtn");

  if (modal && openBtn && closeBtn) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    });

    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  }
});
