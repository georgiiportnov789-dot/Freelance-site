(function() {
  const fileInput = document.getElementById('fileInput');
  const slider = document.getElementById('sliderContainer');
  const dots = document.getElementById('paginationContainer');
  const deleteBtn = document.getElementById('deleteBtn');

  if (!fileInput || !slider || !dots) return;

  let currentIndex = 0;

  // Рендеринг слайдера
  function render() {
    const files = fileInput.files;
    slider.innerHTML = '';
    dots.innerHTML = '';

    if (files.length === 0) {
      // Заглушка
      const placeholder = document.createElement('div');
      placeholder.className = 'create-task__media-slide create-task__media-slide--placeholder';
      placeholder.innerHTML = '<img src="../static/media/sistem-media/Image.png" alt="Заглушка" class="create-task__media-img">';
      slider.appendChild(placeholder);
      const dot = document.createElement('span');
      dot.className = 'create-task__media-dot create-task__media-dot--active';
      dots.appendChild(dot);
      return;
    }

    // Создаём слайды и точки
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const slide = document.createElement('div');
      slide.className = 'create-task__media-slide';
      const img = document.createElement('img');
      img.className = 'create-task__media-img';
      img.src = URL.createObjectURL(file);
      slide.appendChild(img);
      slider.appendChild(slide);

      const dot = document.createElement('span');
      dot.className = 'create-task__media-dot' + (i === currentIndex ? ' create-task__media-dot--active' : '');
      dot.dataset.index = i;
      dot.addEventListener('click', function() {
        const slideWidth = slider.clientWidth;
        slider.scrollTo({ left: slideWidth * i, behavior: 'smooth' });
      });
      dots.appendChild(dot);
    }

    if (currentIndex >= files.length) currentIndex = files.length - 1;
    scrollToSlide(currentIndex);

    // Синхронизация точек при прокрутке
    slider.addEventListener('scroll', function() {
      const slideWidth = slider.clientWidth;
      const index = Math.round(slider.scrollLeft / slideWidth);
      if (index !== currentIndex && index < files.length) {
        currentIndex = index;
        updateDots();
      }
    });
  }

  function scrollToSlide(index) {
    const slideWidth = slider.clientWidth;
    slider.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
  }

  function updateDots() {
    const allDots = dots.querySelectorAll('.create-task__media-dot');
    allDots.forEach((dot, i) => {
      dot.classList.toggle('create-task__media-dot--active', i === currentIndex);
    });
  }

  // При выборе файлов – просто перерисовываем
  fileInput.addEventListener('change', render);

  // Удаление текущего файла
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      const files = fileInput.files;
      if (files.length === 0) return;

      // Определяем текущий индекс
      const slideWidth = slider.clientWidth;
      let index = Math.round(slider.scrollLeft / slideWidth);
      if (index >= files.length) index = files.length - 1;

      // Создаём новый FileList без удаляемого файла
      const dt = new DataTransfer();
      const fileArray = Array.from(files);
      fileArray.splice(index, 1);
      fileArray.forEach(f => dt.items.add(f));
      fileInput.files = dt.files;

      // Обновляем индекс
      if (fileInput.files.length === 0) {
        currentIndex = 0;
      } else {
        if (index >= fileInput.files.length) {
          currentIndex = fileInput.files.length - 1;
        } else {
          currentIndex = index;
        }
      }
      render();
    });
  }

  // Инициализация
  render();
})();