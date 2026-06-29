// static/js/task_slider.js
function initTaskSlider(containerId, paginationId, images) {
  const container = document.getElementById(containerId);
  const pagination = document.getElementById(paginationId);
  if (!container || !pagination) return;

  container.innerHTML = "";
  pagination.innerHTML = "";

  if (!images || images.length === 0) {
    container.innerHTML =
      '<div style="background:#222;height:100%;display:flex;align-items:center;justify-content:center;color:#666;">Нет изображений</div>';
    return;
  }

  images.forEach((src, index) => {
    const slide = document.createElement("div");
    slide.className = "create-task__media-slide";
    const img = document.createElement("img");
    img.src = src;
    img.className = "create-task__media-img";
    img.alt = "Фото задачи";
    slide.appendChild(img);
    container.appendChild(slide);

    const dot = document.createElement("span");
    dot.className =
      "create-task__media-dot" +
      (index === 0 ? " create-task__media-dot--active" : "");
    dot.dataset.index = index;
    dot.addEventListener("click", function () {
      const slideWidth = container.clientWidth;
      container.scrollTo({ left: slideWidth * index, behavior: "smooth" });
    });
    pagination.appendChild(dot);
  });

  container.addEventListener("scroll", function () {
    const slideWidth = container.clientWidth;
    const currentIndex = Math.round(container.scrollLeft / slideWidth);
    const dots = pagination.querySelectorAll(".create-task__media-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle(
        "create-task__media-dot--active",
        i === currentIndex,
      );
    });
  });
}

// Делаем функцию глобальной
window.initTaskSlider = initTaskSlider;
