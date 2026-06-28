document.addEventListener("DOMContentLoaded", () => {
  // Оборачиваем новые ссылки соцсетей, добавленные через htmx, в .profile__social-item с крестиком
  document.body.addEventListener("htmx:afterSwap", (e) => {
    if (e.detail.target && e.detail.target.id === "social-links-list") {
      const list = document.getElementById("social-links-list");
      list.querySelectorAll("a.profile__detail-link").forEach((link) => {
        if (!link.closest(".profile__social-item")) {
          const wrapper = document.createElement("div");
          wrapper.className = "profile__social-item";
          link.parentNode.insertBefore(wrapper, link);
          wrapper.appendChild(link);
          const btn = document.createElement("button");
          btn.className = "profile__delete-btn";
          btn.title = "Удалить";
          btn.textContent = "✕";
          btn.addEventListener("click", () => wrapper.remove());
          wrapper.appendChild(btn);
        }
      });
    }
  });

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
