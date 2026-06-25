document.addEventListener("DOMContentLoaded", () => {
  // Модалка соцсетей
  const addSocialBtn = document.getElementById("add-social-btn");
  const socialModal = document.getElementById("social-modal");
  const closeSocialBtn = document.getElementById("close-social-modal");
  if (addSocialBtn && socialModal && closeSocialBtn) {
    addSocialBtn.addEventListener("click", () =>
      socialModal.classList.add("active"),
    );
    closeSocialBtn.addEventListener("click", () =>
      socialModal.classList.remove("active"),
    );
    socialModal.addEventListener("click", (e) => {
      if (e.target === socialModal) socialModal.classList.remove("active");
    });
  }

  // Модалка редактирования профиля
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const editModal = document.getElementById("edit-profile-modal");
  const closeEditBtn = document.getElementById("close-edit-profile-modal");
  if (editProfileBtn && editModal && closeEditBtn) {
    editProfileBtn.addEventListener("click", () =>
      editModal.classList.add("active"),
    );
    closeEditBtn.addEventListener("click", () =>
      editModal.classList.remove("active"),
    );
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) editModal.classList.remove("active");
    });
  }

  // Модалка телефона
  const addPhoneBtn = document.getElementById("add-phone-btn");
  const phoneModal = document.getElementById("phone-modal");
  const closePhoneBtn = document.getElementById("close-phone-modal");
  if (addPhoneBtn && phoneModal && closePhoneBtn) {
    addPhoneBtn.addEventListener("click", () =>
      phoneModal.classList.add("active"),
    );
    closePhoneBtn.addEventListener("click", () =>
      phoneModal.classList.remove("active"),
    );
    phoneModal.addEventListener("click", (e) => {
      if (e.target === phoneModal) phoneModal.classList.remove("active");
    });
  }
});
