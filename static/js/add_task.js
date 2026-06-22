document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const sliderContainer = document.getElementById("sliderContainer");
  const paginationContainer = document.getElementById("paginationContainer");
  const deleteBtn = document.getElementById("deleteBtn");

  let currentFiles = [];
  let currentSlideIndex = 0;
  let isScrolling = false; // Блокиратор спама событиями при прокрутке

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

      dot.addEventListener("click", () => {
        scrollToSlide(index);
      });

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

  // Обновление точек при скролле (свайпе тачпадом)
  sliderContainer.addEventListener("scroll", () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        if (currentFiles.length === 0) return;
        const slideWidth = sliderContainer.clientWidth;
        // Используем Math.round, чтобы точка переключалась, когда слайд прокручен наполовину
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

  // Переключение по стрелочкам (Влево/Вправо)
  document.addEventListener("keydown", (e) => {
    if (currentFiles.length === 0) return;

    // Проверяем, не пишет ли пользователь текст в данный момент
    const activeElement = document.activeElement.tagName;
    if (activeElement === "INPUT" || activeElement === "TEXTAREA") return;

    if (e.key === "ArrowLeft") {
      scrollToSlide(Math.max(0, currentSlideIndex - 1));
    } else if (e.key === "ArrowRight") {
      scrollToSlide(Math.min(currentFiles.length - 1, currentSlideIndex + 1));
    }
  });

  deleteBtn.addEventListener("click", () => {
    if (currentFiles.length === 0) return;

    currentFiles.splice(currentSlideIndex, 1);

    if (currentSlideIndex >= currentFiles.length) {
      currentSlideIndex = Math.max(0, currentFiles.length - 1);
    }

    updateSystem();
  });
});
