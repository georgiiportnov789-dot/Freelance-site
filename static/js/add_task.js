document.addEventListener("DOMContentLoaded", () => {
  /* ───────────────────────────────────────────
     СЛАЙДЕР МЕДИА
  ─────────────────────────────────────────── */
  const fileInput = document.getElementById("fileInput");
  const sliderContainer = document.getElementById("sliderContainer");
  const paginationContainer = document.getElementById("paginationContainer");
  const deleteBtn = document.getElementById("deleteBtn");

  let currentFiles = [];
  let currentSlideIndex = 0;
  let isScrolling = false;

  fileInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      currentFiles = [...currentFiles, ...newFiles];
      updateSystem();
    }
  });

  function updateSystem() {
    const dt = new DataTransfer();
    currentFiles.forEach((file) => dt.items.add(file));
    fileInput.files = dt.files;
    renderSlider();
  }

  function renderSlider() {
    sliderContainer.innerHTML = "";
    paginationContainer.innerHTML = "";

    if (currentFiles.length === 0) {
      sliderContainer.innerHTML = `
        <div class="task-media__slide">
          <img src="../static/media/sistem-media/Image.png" alt="Заглушка" class="task-media__image" />
        </div>
      `;
      paginationContainer.innerHTML =
        '<span class="task-media__dot task-media__dot--active"></span>';
      return;
    }

    currentFiles.forEach((file, index) => {
      const slide = document.createElement("div");
      slide.className = "task-media__slide";

      const img = document.createElement("img");
      img.className = "task-media__image";
      img.src = URL.createObjectURL(file);

      slide.appendChild(img);
      sliderContainer.appendChild(slide);

      const dot = document.createElement("span");
      dot.className = `task-media__dot ${index === currentSlideIndex ? "task-media__dot--active" : ""}`;
      dot.addEventListener("click", () => scrollToSlide(index));
      paginationContainer.appendChild(dot);
    });

    if (currentSlideIndex >= currentFiles.length) {
      currentSlideIndex = Math.max(0, currentFiles.length - 1);
    }
    scrollToSlide(currentSlideIndex);
  }

  function scrollToSlide(index) {
    if (currentFiles.length === 0) return;
    currentSlideIndex = index;
    const slideWidth = sliderContainer.clientWidth;
    sliderContainer.scrollTo({ left: slideWidth * index, behavior: "smooth" });
    updateDots();
  }

  function updateDots() {
    const dots = document.querySelectorAll(".task-media__dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("task-media__dot--active", i === currentSlideIndex);
    });
  }

  sliderContainer.addEventListener("scroll", () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        if (currentFiles.length === 0) return;
        const slideWidth = sliderContainer.clientWidth;
        const newIndex = Math.round(sliderContainer.scrollLeft / slideWidth);
        if (newIndex !== currentSlideIndex && newIndex < currentFiles.length) {
          currentSlideIndex = newIndex;
          updateDots();
        }
        isScrolling = false;
      });
      isScrolling = true;
    }
  });

  // Прокрутка колёсиком
  sliderContainer.addEventListener("wheel", (e) => {
    if (currentFiles.length === 0) return;
    e.preventDefault();
    if (e.deltaY > 0 || e.deltaX > 0) {
      scrollToSlide(Math.min(currentFiles.length - 1, currentSlideIndex + 1));
    } else {
      scrollToSlide(Math.max(0, currentSlideIndex - 1));
    }
  }, { passive: false });

  // Перетаскивание мышью
  let isDragging = false;
  let dragStartX = 0;
  let scrollStartLeft = 0;

  sliderContainer.addEventListener("mousedown", (e) => {
    if (currentFiles.length === 0) return;
    isDragging = true;
    dragStartX = e.clientX;
    scrollStartLeft = sliderContainer.scrollLeft;
    sliderContainer.style.cursor = "grabbing";
    sliderContainer.style.scrollBehavior = "auto";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.clientX;
    sliderContainer.scrollLeft = scrollStartLeft + dx;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    sliderContainer.style.cursor = "grab";
    sliderContainer.style.scrollBehavior = "smooth";
    // Доводим до ближайшего слайда
    const slideWidth = sliderContainer.clientWidth;
    const nearest = Math.round(sliderContainer.scrollLeft / slideWidth);
    scrollToSlide(Math.max(0, Math.min(currentFiles.length - 1, nearest)));
  });

  document.addEventListener("keydown", (e) => {
    if (currentFiles.length === 0) return;
    const activeElement = document.activeElement.tagName;
    if (activeElement === "INPUT" || activeElement === "TEXTAREA") return;
    if (e.key === "ArrowLeft") scrollToSlide(Math.max(0, currentSlideIndex - 1));
    else if (e.key === "ArrowRight") scrollToSlide(Math.min(currentFiles.length - 1, currentSlideIndex + 1));
  });

  deleteBtn.addEventListener("click", () => {
    if (currentFiles.length === 0) return;
    currentFiles.splice(currentSlideIndex, 1);
    if (currentSlideIndex >= currentFiles.length) {
      currentSlideIndex = Math.max(0, currentFiles.length - 1);
    }
    updateSystem();
  });

  /* ───────────────────────────────────────────
     КАСТОМНЫЙ КАЛЕНДАРЬ
  ─────────────────────────────────────────── */

  const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  const MONTHS_GEN = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];

  const dateInput   = document.getElementById("deadlineInput");
  const calOverlay  = document.getElementById("calOverlay");
  const calTitle    = document.getElementById("calTitle");
  const calGrid     = document.getElementById("calGrid");
  const calSelVal   = document.getElementById("calSelectedVal");
  const prevBtn     = document.getElementById("calPrevBtn");
  const nextBtn     = document.getElementById("calNextBtn");
  const confirmBtn  = document.getElementById("calConfirmBtn");
  const cancelBtn   = document.getElementById("calCancelBtn");

  const today = new Date();
  let viewYear  = today.getFullYear();
  let viewMonth = today.getMonth();
  let selected  = null; // { d, m, y }

  function openCalendar() {
    // Если в поле уже есть значение — начать с него
    if (dateInput.dataset.isoDate) {
      const d = new Date(dateInput.dataset.isoDate);
      viewYear  = d.getFullYear();
      viewMonth = d.getMonth();
      selected  = { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
    } else {
      viewYear  = today.getFullYear();
      viewMonth = today.getMonth();
      selected  = null;
    }
    renderCalendar();
    calOverlay.classList.add("cal-overlay--visible");
  }

  function closeCalendar() {
    calOverlay.classList.remove("cal-overlay--visible");
  }

  function renderCalendar() {
    calTitle.textContent = MONTHS_RU[viewMonth] + " " + viewYear;
    calGrid.innerHTML = "";

    const first = new Date(viewYear, viewMonth, 1);
    let startDow = first.getDay();
    if (startDow === 0) startDow = 7; // Понедельник = 1

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Пустые ячейки до начала месяца
    for (let i = 1; i < startDow; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-day cal-day--empty";
      calGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = d;

      const isToday =
        d === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear();

      if (isToday) btn.classList.add("cal-day--today");

      if (
        selected &&
        d === selected.d &&
        viewMonth === selected.m &&
        viewYear === selected.y
      ) {
        btn.classList.add("cal-day--selected");
      }

      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPast = new Date(viewYear, viewMonth, d) < todayMidnight;

      if (isPast) {
        btn.classList.add("cal-day--disabled");
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => {
          selected = { d, m: viewMonth, y: viewYear };
          updateFooter();
          renderCalendar();
        });
      }

      calGrid.appendChild(btn);
    }

    updateFooter();
  }

  function updateFooter() {
    if (!selected) {
      calSelVal.textContent = "—";
      return;
    }
    calSelVal.textContent =
      selected.d + " " + MONTHS_GEN[selected.m] + " " + selected.y;
  }

  function applyDate() {
    if (!selected) return;
    // Отображаем красиво в поле
    dateInput.value =
      selected.d + " " + MONTHS_GEN[selected.m] + " " + selected.y;
    // Сохраняем ISO-формат для сервера в data-атрибуте и скрытом поле
    const mm = String(selected.m + 1).padStart(2, "0");
    const dd = String(selected.d).padStart(2, "0");
    const iso = `${selected.y}-${mm}-${dd}`;
    dateInput.dataset.isoDate = iso;
    document.getElementById("deadlineHidden").value = iso;
    closeCalendar();
  }

  // Открыть по клику на поле
  dateInput.addEventListener("click", openCalendar);
  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCalendar();
    }
  });

  // Навигация по месяцам
  prevBtn.addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  nextBtn.addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  confirmBtn.addEventListener("click", applyDate);
  cancelBtn.addEventListener("click", closeCalendar);

  // Закрыть по клику на оверлей (вне попапа)
  calOverlay.addEventListener("click", (e) => {
    if (e.target === calOverlay) closeCalendar();
  });

  // Закрыть по Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCalendar();
  });
});
