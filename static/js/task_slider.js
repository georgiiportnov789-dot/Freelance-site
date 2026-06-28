// static/js/task_slider.js

function initTaskSlider(containerId, paginationId, images) {
    const container = document.getElementById(containerId);
    const pagination = document.getElementById(paginationId);
    if (!container || !pagination || !images || !images.length) return;

    let currentIndex = 0;
    let isScrolling = false;
    let isDragging = false;
    let dragStartX = 0;
    let scrollStartLeft = 0;
    let resizeTimeout = null;

    // Надёжное получение ширины контейнера
    function getContainerWidth() {
        return container.clientWidth || container.getBoundingClientRect().width || 1;
    }

    function render() {
        container.innerHTML = '';
        pagination.innerHTML = '';

        images.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = 'create-task__media-slide';
            const img = document.createElement('img');
            img.className = 'create-task__media-img';
            img.src = url;
            img.alt = 'Изображение задачи';
            slide.appendChild(img);
            container.appendChild(slide);

            const dot = document.createElement('span');
            dot.className = 'create-task__media-dot' + (i === currentIndex ? ' create-task__media-dot--active' : '');
            dot.dataset.index = i;
            dot.addEventListener('click', function() {
                scrollToSlide(parseInt(this.dataset.index));
            });
            pagination.appendChild(dot);
        });

        // Синхронизация точек при прокрутке
        container.addEventListener('scroll', function() {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    if (images.length === 0) return;
                    const slideWidth = getContainerWidth();
                    const newIndex = Math.round(container.scrollLeft / slideWidth);
                    if (newIndex !== currentIndex && newIndex < images.length) {
                        currentIndex = newIndex;
                        updateDots();
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });

        // Дожидаемся отрисовки и прокручиваем к текущему индексу
        requestAnimationFrame(() => {
            scrollToSlide(currentIndex);
        });
    }

    function scrollToSlide(index) {
        if (index < 0 || index >= images.length) return;
        currentIndex = index;
        const slideWidth = getContainerWidth();
        container.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
        updateDots();
    }

    function updateDots() {
        const dots = pagination.querySelectorAll('.create-task__media-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('create-task__media-dot--active', i === currentIndex);
        });
    }

    render();

    // Перерасчёт при изменении размера окна (debounce)
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            scrollToSlide(currentIndex);
        }, 100);
    });

    // Прокрутка колёсиком
    container.addEventListener('wheel', function(e) {
        if (images.length === 0) return;
        e.preventDefault();
        const dir = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
        const newIndex = Math.min(Math.max(0, currentIndex + dir), images.length - 1);
        if (newIndex !== currentIndex) {
            scrollToSlide(newIndex);
        }
    }, { passive: false });

    // Перетаскивание мышью
    container.addEventListener('mousedown', function(e) {
        if (images.length === 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        scrollStartLeft = container.scrollLeft;
        container.style.cursor = 'grabbing';
        container.style.scrollBehavior = 'auto';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const dx = dragStartX - e.clientX;
        container.scrollLeft = scrollStartLeft + dx;
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        container.style.cursor = 'grab';
        container.style.scrollBehavior = 'smooth';
        if (images.length > 0) {
            const slideWidth = getContainerWidth();
            const nearest = Math.round(container.scrollLeft / slideWidth);
            const newIndex = Math.max(0, Math.min(images.length - 1, nearest));
            scrollToSlide(newIndex);
        }
    });

    // Клавиши ← →
    document.addEventListener('keydown', function(e) {
        if (images.length === 0) return;
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToSlide(Math.max(0, currentIndex - 1));
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToSlide(Math.min(images.length - 1, currentIndex + 1));
        }
    });
}