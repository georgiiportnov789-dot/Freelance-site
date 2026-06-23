document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const sliderContainer = document.getElementById('sliderContainer');
  const paginationContainer = document.getElementById('paginationContainer');
  const deleteBtn = document.getElementById('deleteBtn');

  let selectedFiles = []; 
  let currentIndex = 0;   
  let isThrottled = false;

  fileInput.addEventListener('change', (event) => {
    const newFiles = Array.from(event.target.files);
    selectedFiles = selectedFiles.concat(newFiles);
    
    updateFileInput(); 
    renderSlider();
  });

  function updateFileInput() {
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
  }

  function renderSlider() {
    sliderContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    if (selectedFiles.length === 0) {
      sliderContainer.innerHTML = `
        <div class="task-media__slide task-media__slide--placeholder">
          <img src="../static/media/sistem-media/Image.png" alt="Заглушка" class="task-media__image" />
        </div>`;
      paginationContainer.innerHTML = `<span class="task-media__dot task-media__dot--active"></span>`;
      currentIndex = 0;
      return;
    }

    if (currentIndex >= selectedFiles.length) {
      currentIndex = selectedFiles.length - 1;
    }

    selectedFiles.forEach((file, index) => {
      const slide = document.createElement('div');
      slide.className = 'task-media__slide';
      slide.style.display = index === currentIndex ? 'block' : 'none'; 

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file); 
      img.className = 'task-media__image';
      
      slide.appendChild(img);
      sliderContainer.appendChild(slide);

      const dot = document.createElement('span');
      dot.className = `task-media__dot ${index === currentIndex ? 'task-media__dot--active' : ''}`;
      dot.addEventListener('click', () => {
        currentIndex = index;
        renderSlider();
      });
      paginationContainer.appendChild(dot);
    });
  }

  // --- БЛОК ПРОКРУТКИ КОЛЁСИКОМ МЫШИ ---
  sliderContainer.addEventListener('wheel', (event) => {
    if (selectedFiles.length <= 1) return; 

    event.preventDefault(); 

    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => { isThrottled = false; }, 200); 

    if (event.deltaY > 0) {
      if (currentIndex < selectedFiles.length - 1) {
        currentIndex++;
        renderSlider();
      }
    } else if (event.deltaY < 0) {
      if (currentIndex > 0) {
        currentIndex--;
        renderSlider();
      }
    }
  }, { passive: false }); 
  

  deleteBtn.addEventListener('click', () => {
    if (selectedFiles.length > 0) {
      selectedFiles.splice(currentIndex, 1);
      updateFileInput(); 
      renderSlider();    
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.querySelector('.task-form__input--date');
  
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; 
    let dd = today.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const minDate = `${yyyy}-${mm}-${dd}`;
    
    dateInput.setAttribute('min', minDate);
  }

});