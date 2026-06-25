(function () {
  const slider = document.getElementById("sliderContainer");
  const dots = document.getElementById("paginationContainer");
  const fileInput = document.getElementById("fileInput");
  const deleteBtn = document.getElementById("deleteBtn");

  if (!slider || !dots || !fileInput) return;

  let images = [];

  function updateSlider() {
    slider.innerHTML = "";
    dots.innerHTML = "";
    if (images.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.className =
        "create-task__media-slide create-task__media-slide--placeholder";
      placeholder.innerHTML =
        '<img src="../static/media/sistem-media/Image.png" alt="Заглушка" class="create-task__media-img">';
      slider.appendChild(placeholder);
      const dot = document.createElement("span");
      dot.className = "create-task__media-dot create-task__media-dot--active";
      dots.appendChild(dot);
      return;
    }
    images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "create-task__media-slide";
      const img = document.createElement("img");
      img.src = src;
      img.className = "create-task__media-img";
      slide.appendChild(img);
      slider.appendChild(slide);
      const dot = document.createElement("span");
      dot.className =
        "create-task__media-dot" +
        (i === 0 ? " create-task__media-dot--active" : "");
      dot.dataset.index = i;
      dot.addEventListener("click", () => {
        slider.scrollTo({ left: slider.clientWidth * i, behavior: "smooth" });
      });
      dots.appendChild(dot);
    });
    // синхронизация активной точки при прокрутке
    slider.addEventListener("scroll", () => {
      const index = Math.round(slider.scrollLeft / slider.clientWidth);
      dots.querySelectorAll(".create-task__media-dot").forEach((d, i) => {
        d.classList.toggle("create-task__media-dot--active", i === index);
      });
    });
  }

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        images.push(ev.target.result);
        updateSlider();
      };
      reader.readAsDataURL(file);
    });
    // если нужно очистить input после добавления
    fileInput.value = "";
  });

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (images.length > 0) {
        images.pop();
        updateSlider();
      }
    });
  }

  updateSlider();
})();
