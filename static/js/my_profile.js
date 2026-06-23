document.addEventListener("DOMContentLoaded", () => {
  const addSocialBtn = document.getElementById("add-social-btn");
  const modal = document.getElementById("social-modal");
  const closeBtn = document.getElementById("close-social-modal");

  if (addSocialBtn && modal && closeBtn) {
    addSocialBtn.addEventListener("click", () => {
      modal.classList.add("active");
    });

    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  }
});
