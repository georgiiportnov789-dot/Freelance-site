let flag = 0;
function fl1() {
  flag = 1;
}
function fl0() {
  flag = 0;
}
let oldcordx = 0;
let oldcordy = 0;
document.addEventListener("mousemove", (e) => {
  if (flag == 0) {
    return;
  }
  let cordx = e.clientX;
  let cordy = e.clientY;
  len = Math.sqrt(
    (cordy - oldcordy) * (cordy - oldcordy) +
      (cordx - oldcordx) * (cordx - oldcordx),
  );
  if (len > 20) {
    let img = document.createElement("img");
    img.src = `../static/media/shleif_foto/${Math.floor(Math.random() * 13) + 1}.png`;
    img.classList.add("spawned-photo");
    img.style.left = cordx + "px";
    img.style.top = cordy + "px";
    document.body.appendChild(img);
    setTimeout(() => {
      img.remove();
    }, 2000);
    oldcordx = cordx;
    oldcordy = cordy;
  }
});
