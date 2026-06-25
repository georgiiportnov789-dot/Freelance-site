class ChatComponent extends HTMLElement {
  connectedCallback() {
    const cssPath = "../static/css/chat.css"; // Убедитесь, что путь верный
    if (!document.querySelector(`link[href="${cssPath}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = cssPath;
      document.head.appendChild(link);
    }
    this.innerHTML = `
        <button class="chat-trigger-btn" id="openChatBtn">
          <svg class = "chat-trigger-btn__img"width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <div class="chat-modal-overlay" id="chatModal">
          <div class="chat-modal-content">
            <button class="chat-modal-close" id="closeChatBtn">✕</button>

            <div class="chat-app">
              <aside class="chat-sidebar">
                <div class="chat-sidebar__header">
                  <input type="text" class="chat-sidebar__search" placeholder="Поиск...">
                </div>
                <div class="chat-sidebar__list">
                  {% for chat in chats %}
                  <div class="chat-sidebar__item" hx-get="{% url 'load_chat' chat.id %}" hx-trigger="click" hx-target="#chat-messages-container" hx-swap="innerHTML">
                    <div class="chat-avatar">{{ chat.initials }}</div>
                    <div class="chat-item__info">
                      <div class="chat-item__header"><span class="chat-item__name">{{ chat.name }}</span></div>
                      <div class="chat-item__preview">Нажми, чтобы открыть</div>
                    </div>
                  </div>
                  {% endfor %}
                </div>
              </aside>
              <main class="chat-main">
                <div id="chat-messages-container" class="chat-messages">
                  <div style="text-align: center; margin-top: 50px; color: gray">Выберите чат</div>
                </div>
                <form class="chat-input" hx-post="{% url 'send_message' %}" hx-target="#chat-messages-container" hx-swap="beforeend" hx-on::after-request="this.reset()">
                  <input type="hidden" name="chat_id" id="current-chat-id" value="">
                  <input type="text" name="text" class="chat-input__field" placeholder="Сообщение..." required>
                  <button type="submit" class="chat-input__send">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </form>
              </main>
            </div>
          </div>
        </div>
      `;

    const modal = this.querySelector("#chatModal");
    const openBtn = this.querySelector("#openChatBtn");
    const closeBtn = this.querySelector("#closeChatBtn");

    openBtn.addEventListener("click", () => modal.classList.add("active"));
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }
}
customElements.define("chat-component", ChatComponent);
