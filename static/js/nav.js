class NavbarComponent extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("data-title") || "Задания";
    const subtitle = this.getAttribute("data-subtitle") || "Меню";
    if (!document.querySelector('link[href="../static/css/nav.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "../static/css/nav.css";
      document.head.appendChild(link);
    }

    this.innerHTML = `
            <nav class="nav">
                <div class="nav__brand">
                    <div class="nav__logo">
                        <div class="nav__logo-dot"></div><div class="nav__logo-dot"></div>
                        <div class="nav__logo-dot"></div><div class="nav__logo-dot"></div>
                    </div>
                    <div class="nav__brand-text">
                        <span class="nav__brand-line">${title}</span>
                        <span class="nav__brand-line">${subtitle}</span>
                    </div>
                </div>
                <ul class="nav__list">
                    <li class="nav__item"><a class="nav__link" href="/main"><span class="nav__link-text">Основное</span><img class="nav__link-icon" src="../static/media/navbar/Основное.png" alt=""></a></li>
                    <li class="nav__item"><a class="nav__link" href="/orders"><span class="nav__link-text">Заказы</span><img class="nav__link-icon" src="../static/media/navbar/Заказы.png" alt=""></a></li>
                    <li class="nav__item"><a class="nav__link" href="/applications"><span class="nav__link-text">Заявки</span><img class="nav__link-icon" src="../static/media/navbar/Заявки.png" alt=""></a></li>
                    <li class="nav__item"><a class="nav__link" href="/my_profile"><span class="nav__link-text">Мой профиль</span><img class="nav__link-icon" src="../static/media/navbar/Мой профиль.png" alt=""></a></li>
                    <li class="nav__item"><a class="nav__link" href="/about"><span class="nav__link-text">О нас</span><img class="nav__link-icon" src="../static/media/navbar/О нас.png" alt=""></a></li>
                </ul>
            </nav>
        `;
  }
}
customElements.define("navbar-component", NavbarComponent);
