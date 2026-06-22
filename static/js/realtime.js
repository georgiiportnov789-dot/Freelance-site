function realtime() {
  el = document.getElementsByClassName("realtimeTime")[0];
  el.textContent = new Date().toLocaleTimeString("ru-RU");
}
realtime();
setInterval(realtime, 1000);
