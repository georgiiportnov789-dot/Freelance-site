document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("registerModalOverlay");
  const openBtn = document.getElementById("registerOpenBtn");
  const closeBtn = document.getElementById("registerCloseBtn");

  if (!overlay) {
    console.error("registerModalOverlay не найден на странице");
    return;
  }

  function openModal() {
    overlay.classList.add("is-open");
  }

  function closeModal() {
    overlay.classList.remove("is-open");
  }

  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  } else {
    console.error("registerOpenBtn не найден на странице");
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});
