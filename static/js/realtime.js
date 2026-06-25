(function () {
  function updateTime() {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    const elements = document.querySelectorAll(".time__value");
    elements.forEach((el) => (el.textContent = timeStr));
  }
  updateTime();
  setInterval(updateTime, 1000);
})();
