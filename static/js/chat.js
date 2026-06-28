/* =====================================================================
   chat.js  —  <chat-component>  веб-компонент для SKILLFORGE
   ===================================================================== */

class ChatComponent extends HTMLElement {
  constructor() {
    super();
    this._open = false;
    this._activeChat = null;
    this._myId = null;
    this._ws = null;
    this._messages = [];
    this._chats = [];
    this._searchTimeout = null;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
    this._fetchMyId();
  }

  _render() {
    this.innerHTML = `
      <!-- FAB кнопка -->
      <button class="chat-fab" id="chatFab" aria-label="Открыть чат">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                fill="currentColor"/>
        </svg>
      </button>

      <div class="chat-overlay" id="chatOverlay" style="display:none">
        <div class="chat-modal" id="chatModal">

          <!-- Левая панель -->
          <aside class="chat-sidebar">
            <div class="chat-sidebar__search-wrap">
              <input class="chat-sidebar__search" id="chatSearch"
                     placeholder="Поиск..." autocomplete="off"/>
            </div>
            <ul class="chat-list" id="chatList">
              <li class="chat-list__loading">Загрузка...</li>
            </ul>
          </aside>

          <!-- Правая панель -->
          <section class="chat-body">
            <div class="chat-placeholder" id="chatPlaceholder">
              <span>Выберите чат</span>
            </div>

            <header class="chat-header" id="chatHeader" style="display:none">
              <div class="chat-avatar" id="chatHeaderAvatar"></div>
              <span class="chat-header__name" id="chatHeaderName"></span>
            </header>

            <div class="chat-messages" id="chatMessages" style="display:none"></div>

            <div class="chat-input-row" id="chatInputRow" style="display:none">
              <textarea class="chat-input" id="chatInput"
                        placeholder="Написать сообщение..." rows="1"></textarea>
              <button class="chat-send-btn" id="chatSendBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </section>

          <!-- Кнопка закрытия -->
          <button class="chat-close-btn" id="chatCloseBtn" aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round"/>
            </svg>
          </button>

        </div>
      </div>
    `;
    this._injectStyles();
  }

  /* ── Получить свой ID ── */
  async _fetchMyId() {
    try {
      const res = await fetch('/me');
      if (res.ok) {
        const data = await res.json();
        this._myId = data.id;
        this._connectWS();
      }
    } catch (e) {}
  }

  /* ── Загрузить список чатов ── */
  async _loadChats() {
    try {
      const res = await fetch('/chats');
      if (!res.ok) return;
      this._chats = await res.json();
      this._renderChatList(this._chats);
    } catch (e) {}
  }

  /* ── Рендер списка ── */
  _renderChatList(items) {
    const list = document.getElementById('chatList');
    if (!items.length) {
      list.innerHTML = `<li class="chat-list__empty">Нет диалогов</li>`;
      return;
    }
    list.innerHTML = items.map(c => `
      <li class="chat-list__item ${this._activeChat?.id === c.id ? 'chat-list__item--active' : ''}"
          data-id="${c.id}" data-name="${c.name}" data-initials="${c.initials || '?'}">
        <div class="chat-avatar">${c.initials || '?'}</div>
        <div class="chat-list__info">
          <span class="chat-list__name">${c.name}</span>
          <span class="chat-list__last">${c.last_message || 'Нажми, чтобы открыть'}</span>
        </div>
        ${c.unread ? `<span class="chat-list__badge">${c.unread}</span>` : ''}
      </li>
    `).join('');

    list.querySelectorAll('.chat-list__item').forEach(el => {
      el.addEventListener('click', () => {
        this._openChat({ id: el.dataset.id, name: el.dataset.name, initials: el.dataset.initials });
      });
    });
  }

  /* ── Открыть чат ── */
  async _openChat(chat) {
    this._activeChat = chat;

    document.querySelectorAll('.chat-list__item').forEach(el => {
      el.classList.toggle('chat-list__item--active', el.dataset.id === chat.id);
    });

    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatHeaderAvatar').textContent = chat.initials;
    document.getElementById('chatHeaderName').textContent = chat.name;
    document.getElementById('chatPlaceholder').style.display = 'none';
    document.getElementById('chatMessages').style.display = 'flex';
    document.getElementById('chatInputRow').style.display = 'flex';

    await this._loadMessages(chat.id);
  }

  /* ── История сообщений ── */
  async _loadMessages(uid) {
    const box = document.getElementById('chatMessages');
    box.innerHTML = '<div class="chat-msg-hint">Загрузка...</div>';
    try {
      const res = await fetch(`/messages/${uid}`);
      this._messages = res.ok ? await res.json() : [];
    } catch { this._messages = []; }
    this._renderMessages();
  }

  _renderMessages() {
    const box = document.getElementById('chatMessages');
    if (!this._messages.length) {
      box.innerHTML = '<div class="chat-msg-hint">Начните диалог</div>';
      return;
    }
    box.innerHTML = this._messages.map(m => {
      const mine = m.sender_id === this._myId;
      const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return `<div class="chat-msg ${mine ? 'chat-msg--out' : 'chat-msg--in'}">
        <div class="chat-msg__bubble">${this._esc(m.text)}</div>
        <span class="chat-msg__time">${time}</span>
      </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  _appendMessage(msg) {
    this._messages.push(msg);
    const box = document.getElementById('chatMessages');
    const mine = msg.sender_id === this._myId;
    const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const hint = box.querySelector('.chat-msg-hint');
    if (hint) hint.remove();
    const div = document.createElement('div');
    div.className = `chat-msg ${mine ? 'chat-msg--out' : 'chat-msg--in'}`;
    div.innerHTML = `<div class="chat-msg__bubble">${this._esc(msg.text)}</div>
      <span class="chat-msg__time">${time}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  /* ── WebSocket + polling fallback ── */
  _connectWS() {
    if (!this._myId) return;
    // Polling всегда работает как основа
    this._startPolling();

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    try {
      this._ws = new WebSocket(`${proto}://${location.host}/ws/${this._myId}`);

      this._ws.onopen = () => {
        // WS подключился — polling продолжает работать параллельно
        console.debug('[chat] WS connected');
      };

      this._ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          // Если чат с этим собеседником открыт — добавляем сообщение
          if (this._activeChat) {
            const inActiveChat =
              msg.sender_id === this._activeChat.id ||
              msg.receiver_id === this._activeChat.id;
            if (inActiveChat) {
              this._appendMessage(msg);
            }
          }
          this._loadChats();
        } catch {}
      };

      this._ws.onclose = () => {
        // WS упал — запускаем polling каждые 3 сек как запасной вариант
        this._startPolling();
        setTimeout(() => this._connectWS(), 4000);
      };

      this._ws.onerror = () => {
        this._startPolling();
      };

    } catch {
      this._startPolling();
    }
  }

  /* ── Polling: проверяем новые сообщения каждые 2 сек ── */
  _startPolling() {
    if (this._pollInterval) return;

    this._pollInterval = setInterval(async () => {
      // Всегда обновляем активный чат
      if (this._activeChat) {
        try {
          const res = await fetch(`/messages/${this._activeChat.id}`);
          if (!res.ok) return;
          const msgs = await res.json();
          // Просто сравниваем количество — если больше, добавляем новые
          if (msgs.length > this._messages.length) {
            const newMsgs = msgs.slice(this._messages.length);
            newMsgs.forEach(m => this._appendMessage(m));
          }
        } catch {}
      }
      // Обновляем список чатов слева
      this._loadChats();
    }, 2000);
  }

  /* ── Отправка ── */
  _send() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !this._activeChat) return;

    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ receiver_id: this._activeChat.id, text }));
    } else {
      fetch('/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: this._activeChat.id, text }),
      }).then(() => this._loadMessages(this._activeChat.id));
    }
    input.value = '';
    input.style.height = 'auto';
  }

  /* ── Поиск ── */
  _search(q) {
    clearTimeout(this._searchTimeout);
    if (!q.trim()) {
      this._renderChatList(this._chats);
      return;
    }
    this._searchTimeout = setTimeout(async () => {
      const list = document.getElementById('chatList');
      list.innerHTML = `<li class="chat-list__loading">Поиск...</li>`;
      try {
        const res = await fetch(`/search-users?q=${encodeURIComponent(q)}`);
        if (!res.ok) { list.innerHTML = `<li class="chat-list__empty">Ошибка поиска</li>`; return; }
        const users = await res.json();
        if (!users.length) {
          list.innerHTML = `<li class="chat-list__empty">Никого не найдено</li>`;
          return;
        }
        list.innerHTML = users.map(u => `
          <li class="chat-list__item" data-id="${u.id}" data-name="${u.name}" data-initials="${u.initials || '?'}">
            <div class="chat-avatar">${u.initials || '?'}</div>
            <div class="chat-list__info">
              <span class="chat-list__name">${u.name}</span>
              <span class="chat-list__last">Начать диалог</span>
            </div>
          </li>
        `).join('');
        list.querySelectorAll('.chat-list__item').forEach(el => {
          el.addEventListener('click', () => {
            document.getElementById('chatSearch').value = '';
            this._openChat({ id: el.dataset.id, name: el.dataset.name, initials: el.dataset.initials });
            this._renderChatList(this._chats);
          });
        });
      } catch {
        list.innerHTML = `<li class="chat-list__empty">Ошибка поиска</li>`;
      }
    }, 350);
  }

  /* ── Открыть / закрыть ── */
  open() {
    document.getElementById('chatOverlay').style.display = 'flex';
    this._open = true;
    if (this._myId) this._loadChats();
  }
  close() {
    document.getElementById('chatOverlay').style.display = 'none';
    this._open = false;
  }

  /* ── События ── */
  _bindEvents() {
    this.addEventListener('click', e => {
      if (e.target.closest('#chatFab')) this.open();
      if (e.target.closest('#chatCloseBtn')) this.close();
      if (e.target.closest('#chatSendBtn')) this._send();
      if (e.target.id === 'chatOverlay') this.close();
    });
    this.addEventListener('input', e => {
      if (e.target.id === 'chatSearch') this._search(e.target.value);
      if (e.target.id === 'chatInput') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      }
    });
    this.addEventListener('keydown', e => {
      if (e.target.id === 'chatInput' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });
  }

  _esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  /* ── Стили ── */
  _injectStyles() {
    if (document.getElementById('_chat_styles')) return;
    const s = document.createElement('style');
    s.id = '_chat_styles';
    s.textContent = `
      /* FAB */
      .chat-fab {
        position: fixed; bottom: 28px; right: 28px; z-index: 1000;
        width: 52px; height: 52px; border-radius: 50%;
        background: #fff; color: #000; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,.5);
        transition: transform .2s, box-shadow .2s;
      }
      .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,.7); }

      .chat-overlay {
        position: fixed; inset: 0; z-index: 1000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.55);
      }

      .chat-modal {
        position: relative;
        width: calc(100vw - 80px); height: calc(100vh - 80px);
        max-width: 1400px; max-height: 900px;
        background: #0d0d0d; border: 1px solid #1e1e1e; border-radius: 14px;
        display: flex; overflow: hidden;
        box-shadow: 0 24px 80px rgba(0,0,0,.8);
      }

      /* sidebar */
      .chat-sidebar {
        width: 320px; flex-shrink: 0;
        border-right: 1px solid #1a1a1a;
        display: flex; flex-direction: column;
        background: #0a0a0a;
      }
      .chat-sidebar__search-wrap {
        padding: 16px 14px;
        border-bottom: 1px solid #1a1a1a;
      }
      .chat-sidebar__search {
        width: 100%; padding: 9px 14px; border-radius: 8px;
        background: #141414; border: 1px solid #252525;
        color: #ccc; font-size: 13px; outline: none;
        box-sizing: border-box;
      }
      .chat-sidebar__search::placeholder { color: #3a3a3a; }

      /* list */
      .chat-list {
        list-style: none; margin: 0; padding: 8px 0;
        overflow-y: auto; flex: 1;
      }
      .chat-list__loading,
      .chat-list__empty {
        padding: 28px 16px; color: #333; font-size: 13px; text-align: center;
      }
      .chat-list__item {
        display: flex; align-items: center; gap: 12px;
        padding: 11px 16px; cursor: pointer;
        border-bottom: 1px solid #111;
        transition: background .15s;
      }
      .chat-list__item:hover        { background: #111; }
      .chat-list__item--active      { background: #141414; }
      .chat-list__info { flex: 1; min-width: 0; }
      .chat-list__name {
        display: block; font-size: 13px; font-weight: 600; color: #ddd;
        margin-bottom: 2px;
      }
      .chat-list__last {
        display: block; font-size: 12px; color: #3a3a3a;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .chat-list__badge {
        min-width: 18px; height: 18px; border-radius: 9px;
        background: #fff; color: #000; font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center; padding: 0 5px;
      }

      /* avatar */
      .chat-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: #1a1a1a; border: 1px solid #2a2a2a;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: 700; color: #888; flex-shrink: 0;
      }

      /* body */
      .chat-body {
        flex: 1; display: flex; flex-direction: column; min-width: 0;
      }
      .chat-placeholder {
        flex: 1; display: flex; align-items: center; justify-content: center;
        color: #2a2a2a; font-size: 15px;
      }
      .chat-header {
        padding: 14px 20px; border-bottom: 1px solid #1a1a1a;
        display: flex; align-items: center; gap: 12px; flex-shrink: 0;
      }
      .chat-header__name { font-size: 14px; font-weight: 600; color: #ccc; }

      /* messages */
      .chat-messages {
        flex: 1; overflow-y: auto; padding: 20px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .chat-msg-hint {
        color: #2a2a2a; font-size: 13px; text-align: center; margin: auto;
      }
      .chat-msg { display: flex; flex-direction: column; max-width: 68%; }
      .chat-msg--out { align-self: flex-end; align-items: flex-end; }
      .chat-msg--in  { align-self: flex-start; align-items: flex-start; }
      .chat-msg__bubble {
        padding: 10px 14px; border-radius: 14px;
        font-size: 13px; line-height: 1.5; word-break: break-word;
      }
      .chat-msg--out .chat-msg__bubble {
        background: #fff; color: #000; border-bottom-right-radius: 3px;
      }
      .chat-msg--in .chat-msg__bubble {
        background: #1a1a1a; color: #ccc; border-bottom-left-radius: 3px;
      }
      .chat-msg__time { font-size: 10px; color: #333; margin-top: 4px; }

      /* input */
      .chat-input-row {
        padding: 12px 16px; border-top: 1px solid #1a1a1a;
        display: flex; align-items: flex-end; gap: 10px; flex-shrink: 0;
      }
      .chat-input {
        flex: 1; padding: 10px 14px; border-radius: 10px;
        background: #111; border: 1px solid #1e1e1e;
        color: #ddd; font-size: 13px; outline: none; resize: none;
        line-height: 1.45; min-height: 40px; max-height: 120px;
        font-family: inherit;
      }
      .chat-input::placeholder { color: #2e2e2e; }
      .chat-send-btn {
        width: 40px; height: 40px; border-radius: 10px;
        background: #fff; color: #000; border: none;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; transition: opacity .15s;
      }
      .chat-send-btn:hover { opacity: .85; }

      /* close */
      .chat-close-btn {
        position: absolute; top: 14px; right: 14px;
        width: 34px; height: 34px; border-radius: 50%;
        background: #1a1a1a; border: 1px solid #2a2a2a;
        color: #888; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, color .15s; z-index: 10;
      }
      .chat-close-btn:hover { background: #222; color: #fff; }

      /* scrollbar */
      .chat-messages::-webkit-scrollbar,
      .chat-list::-webkit-scrollbar { width: 3px; }
      .chat-messages::-webkit-scrollbar-thumb,
      .chat-list::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }

      @media (max-width: 600px) {
        .chat-modal { width: 100vw; height: 100vh; border-radius: 0; }
        .chat-sidebar { width: 240px; }
      }
    `;
    document.head.appendChild(s);
  }
}

customElements.define('chat-component', ChatComponent);

/* ── Глобальная функция открытия (вызывать из nav.js или кнопки) ── */
window.openChat = function () {
  document.querySelector('chat-component')?.open();
};