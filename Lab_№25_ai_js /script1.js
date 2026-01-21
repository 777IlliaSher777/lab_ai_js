// Кольоровий Калейдоскоп — самодостатній скрипт для консолі
// Видаляємо попередні canvas
document.querySelectorAll("canvas.kaleido-circle-2").forEach(c => c.remove());

// Створюємо canvas
const canvas = document.createElement("canvas");
canvas.className = "kaleido-circle-2";
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.zIndex = "2147483647";
canvas.style.pointerEvents = "none";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

// Параметри (можна змінювати через глобальні функції)
let DPR = window.devicePixelRatio || 1;
let W = window.innerWidth;
let H = window.innerHeight;
let CX = W / 2;
let CY = H / 2;
let RADIUS = Math.min(W, H) * 0.45; // радіус кола
let SEGMENTS = 12;                  // кількість сегментів симетрії
let ROT_SPEED = 0.02;               // швидкість обертання (рад/сек)
let TRANSITION_DURATION = 2000;     // мс для плавного переходу між картинками
let PALETTES = [
  ["#2b2d42","#8d99ae","#ef233c","#ffd166","#06d6a0"],
  ["#0f172a","#1e293b","#7c3aed","#60a5fa","#f472b6"],
  ["#061826","#0ea5a4","#34d399","#facc15","#fb7185"]
];
let CURRENT_PALETTE_INDEX = 0;
let PETAL_COUNT = 18;               // кількість базових пелюсток
let HEAVY_ELEMENTS = 6;             // кількість елементів
let TRAIL_ALPHA = 0.04;             // затемнення для сліду (маленьке, щоб було плавно)
let BASE_OPACITY = 1.0;             // загальна непрозорість

// Два offscreen canvas для плавного кросфейду
const offA = document.createElement("canvas");
const offB = document.createElement("canvas");
const gA = offA.getContext("2d");
const gB = offB.getContext("2d");

// Внутрішній стан
let lastTime = performance.now();
let angle = 0;
let transitionStart = null;
let transitioning = false;
let transitionFrom = 0; // 0 -> A, 1 -> B
let rafId = null;

// Налаштування розміру та HiDPI
function resize() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  CX = W / 2;
  CY = H / 2;
  RADIUS = Math.min(W, H) * 0.45;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  offA.width = Math.floor(W * DPR);
  offA.height = Math.floor(H * DPR);
  offA.style.width = W + "px";
  offA.style.height = H + "px";
  gA.setTransform(DPR, 0, 0, DPR, 0, 0);

  offB.width = Math.floor(W * DPR);
  offB.height = Math.floor(H * DPR);
  offB.style.width = W + "px";
  offB.style.height = H + "px";
  gB.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Малюємо початкові зображення
  drawPatternTo(gA, CURRENT_PALETTE_INDEX, 0);
  drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, 12345);
}
resize();
window.addEventListener("resize", resize);

// Допоміжні функції
function hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
function rand(seed) {
  // простий псевдовипадковий генератор на основі seed
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Малюємо елементи (великі, з прозорістю і блиском)
function drawHeavyElements(g, palette, seed = 0) {
  for (let i = 0; i < HEAVY_ELEMENTS; i++) {
    const a = (i / HEAVY_ELEMENTS) * Math.PI * 2 + (seed % 1) * 2;
    const dist = RADIUS * (0.15 + Math.random() * 0.55);
    const x = CX + Math.cos(a) * dist;
    const y = CY + Math.sin(a) * dist;
    const w = RADIUS * (0.18 + Math.random() * 0.28);
    const h = RADIUS * (0.12 + Math.random() * 0.28);
    const rot = Math.random() * Math.PI * 2;
    const col = palette[Math.floor(Math.random() * palette.length)];

    g.save();
    g.translate(x, y);
    g.rotate(rot);
    // основна форма — великий еліпс/пелюстка з градієнтом
    const grad = g.createLinearGradient(-w, -h, w, h);
    grad.addColorStop(0, hexToRgba(col, 0.85));
    grad.addColorStop(0.5, hexToRgba(col, 0.18));
    grad.addColorStop(1, hexToRgba("#000000", 0.02));
    g.fillStyle = grad;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    g.fill();

    // внутрішня пляма
    g.globalAlpha = 0.18 + Math.random() * 0.18;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(-w * 0.15, -h * 0.25, w * 0.45, h * 0.18, Math.random() * 0.6, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // тонка обводка для ваги
    g.strokeStyle = hexToRgba("#000000", 0.08);
    g.lineWidth = 1.5;
    g.stroke();

    // невеликий блиск
    g.globalAlpha = 0.08 + Math.random() * 0.12;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(w * 0.35, -h * 0.35, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    g.restore();
  }
}

// Малюємо базовий шар пелюсток/елементів у offscreen
function drawPatternTo(g, paletteIndex = 0, seed = 0) {
  const palette = PALETTES[paletteIndex % PALETTES.length];
  g.clearRect(0, 0, W, H);

  // фон — м'який радіальний градієнт
  const bg = g.createRadialGradient(CX, CY, RADIUS * 0.02, CX, CY, RADIUS * 1.2);
  bg.addColorStop(0, hexToRgba(palette[0], 0.06));
  bg.addColorStop(1, hexToRgba("#000000", 0.06));
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Центр — концентричні кільця для глибини
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(CX, CY, RADIUS * (0.05 + i * 0.06), 0, Math.PI * 2);
    g.fillStyle = hexToRgba(palette[(i + 1) % palette.length], 0.06 + 0.02 * Math.random());
    g.fill();
  }

  // Великий кількість пелюсток/елементів, що заповнюють круг
  for (let i = 0; i < PETAL_COUNT; i++) {
    const a = (i / PETAL_COUNT) * Math.PI * 2 + (seed % 1) * 0.5;
    const len = RADIUS * (0.35 + Math.random() * 0.6);
    const w = RADIUS * (0.08 + Math.random() * 0.18);
    const col = palette[Math.floor(Math.random() * palette.length)];

    g.save();
    g.translate(CX, CY);
    g.rotate(a);

    // пелюстка як еліпс з градієнтом
    const grad = g.createLinearGradient(0, -w, 0, len);
    grad.addColorStop(0, hexToRgba(col, 0.9));
    grad.addColorStop(0.5, hexToRgba(col, 0.22));
    grad.addColorStop(1, hexToRgba("#000000", 0.02));
    g.fillStyle = grad;
    g.globalAlpha = 0.95;
    g.beginPath();
    g.ellipse(0, len * 0.45, w, len * 0.6, Math.PI / 12, 0, Math.PI * 2);
    g.fill();

    // внутрішній блиск
    g.globalAlpha = 0.12 + Math.random() * 0.18;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(0, len * 0.25, w * 0.5, len * 0.18, Math.PI / 12, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // тонкі лінії для структури
    g.strokeStyle = hexToRgba("#000000", 0.06);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(0, len * 0.05);
    g.lineTo(0, len * 0.9);
    g.stroke();

    g.restore();
  }

  // Додаємо елементи всередині (великі блоки)
  drawHeavyElements(g, palette, seed);

  // Додаємо тонкі промені від центру для структури
  g.globalAlpha = 0.06;
  for (let i = 0; i < 48; i++) {
    g.strokeStyle = palette[i % palette.length];
    g.lineWidth = 1;
    g.beginPath();
    const a = (i / 48) * Math.PI * 2 + (seed % 1) * 0.2;
    g.moveTo(CX, CY);
    g.lineTo(CX + Math.cos(a) * RADIUS * (0.9 + Math.random() * 0.12), CY + Math.sin(a) * RADIUS * (0.9 + Math.random() * 0.12));
    g.stroke();
  }
  g.globalAlpha = 1;
}

// Рендер кола з відзеркалюванням сегментів.
function renderFrame(dt) {
  // обертання
  angle += dt * ROT_SPEED;

  // легке затемнення для сліду
  ctx.fillStyle = `rgba(0,0,0,${TRAIL_ALPHA})`;
  ctx.fillRect(0, 0, W, H);

  // малюємо круглу маску
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // кількість сегментів і кут
  const seg = Math.max(3, Math.floor(SEGMENTS));
  const theta = (Math.PI * 2) / seg;

  // визначаємо альфа для кросфейду між offA і offB
  let t = 0;
  if (transitioning && transitionStart !== null) {
    const elapsed = performance.now() - transitionStart;
    t = Math.min(1, elapsed / TRANSITION_DURATION);
    if (elapsed >= TRANSITION_DURATION) {
      // завершили перехід: перемикаємо полотна
      transitioning = false;
      transitionStart = null;
      // після завершення оновлюємо offA як поточний
      if (transitionFrom === 0) {
        // A -> B, тепер B стає A
        copyCanvas(offB, offA);
        CURRENT_PALETTE_INDEX = (CURRENT_PALETTE_INDEX + 1) % PALETTES.length;
        // підготуємо новий offB
        drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
      } else {
        // B -> A
        copyCanvas(offA, offB);
        CURRENT_PALETTE_INDEX = (CURRENT_PALETTE_INDEX + 1) % PALETTES.length;
        drawPatternTo(gA, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
      }
      t = 0;
    }
  }

  // Якщо не в переході — просто малюємо offA (або offB залежно від transitionFrom)
  // Ми робимо кросфейд: alphaA = 1 - t, alphaB = t
  const alphaA = 1 - t;
  const alphaB = t;

  // Малюємо сегменти, беручи пікселі з offA та offB, комбінуючи їх
  for (let i = 0; i < seg; i++) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle + i * theta);

    // маска сектору
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-theta / 2) * RADIUS * 1.2, Math.sin(-theta / 2) * RADIUS * 1.2);
    ctx.arc(0, 0, RADIUS * 1.2, -theta / 2, theta / 2);
    ctx.closePath();
    ctx.clip();

    // дзеркалимо кожен другий сегмент
    const mirror = (i % 2 === 1);

    // малюємо offA
    ctx.save();
    ctx.globalAlpha = alphaA * BASE_OPACITY;
    ctx.scale(mirror ? -1 : 1, 1);
    if (mirror) ctx.rotate(Math.PI);
    ctx.drawImage(offA, -CX, -CY, W, H);
    ctx.restore();

    // малюємо offB зверху
    if (alphaB > 0) {
      ctx.save();
      ctx.globalAlpha = alphaB * BASE_OPACITY;
      ctx.scale(mirror ? -1 : 1, 1);
      if (mirror) ctx.rotate(Math.PI);
      ctx.drawImage(offB, -CX, -CY, W, H);
      ctx.restore();
    }

    ctx.restore();
  }

  // кілька тонких концентричних кілець для структури
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(-angle * 0.4);
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS * (0.18 + r * 0.18), 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(PALETTES[CURRENT_PALETTE_INDEX % PALETTES.length][r % 5], 0.06);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // знімаємо круглу маску
}

// Копіює вміст src в dst canvas
function copyCanvas(src, dst) {
  const g = dst.getContext("2d");
  g.clearRect(0, 0, dst.width, dst.height);
  g.drawImage(src, 0, 0, dst.width / DPR, dst.height / DPR);
}

// Запускаємо перехід на наступну палітру
function startTransition() {
  if (transitioning) return;
  transitioning = true;
  transitionStart = performance.now();
  transitionFrom = 0; // завжди A->B логіка (ми підготуємо B заздалегідь)
  // Підготуємо offB як наступну картинку
  drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
}

// Головний цикл
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  renderFrame(dt);

  rafId = requestAnimationFrame(loop);
}

// Ініціалізація: малюємо offA і offB
drawPatternTo(gA, CURRENT_PALETTE_INDEX, 0);
drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, 12345);
lastTime = performance.now();
rafId = requestAnimationFrame(loop);

// Періодично запускаємо перехід (плавний кросфейд)
let autoTransitionInterval = setInterval(() => {
  startTransition();
}, 5000); // кожні 5 секунд — змінюємо картинку

// Подвійний клік — видалити ефект
canvas.addEventListener("dblclick", () => {
  if (rafId) cancelAnimationFrame(rafId);
  if (autoTransitionInterval) clearInterval(autoTransitionInterval);
  canvas.remove();
});

// ESC — видалити ефект
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (rafId) cancelAnimationFrame(rafId);
    if (autoTransitionInterval) clearInterval(autoTransitionInterval);
    canvas.remove();
  }
});

// Глобальні функції для налаштування з консолі
window.kaleidoSetSegments = function(n) {
  SEGMENTS = Math.max(3, Math.floor(Number(n) || SEGMENTS));
  drawPatternTo(gA, CURRENT_PALETTE_INDEX, Math.random() * 1000);
  drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
};
window.kaleidoSetRotation = function(speed) {
  if (isFinite(speed)) ROT_SPEED = Number(speed);
};
window.kaleidoSetPalette = function(index) {
  const i = Math.floor(Number(index));
  if (i >= 0 && i < PALETTES.length) {
    CURRENT_PALETTE_INDEX = i;
    drawPatternTo(gA, CURRENT_PALETTE_INDEX, Math.random() * 1000);
    drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
  }
};
window.kaleidoNextPalette = function() {
  CURRENT_PALETTE_INDEX = (CURRENT_PALETTE_INDEX + 1) % PALETTES.length;
  drawPatternTo(gA, CURRENT_PALETTE_INDEX, Math.random() * 1000);
  drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
};
window.kaleidoSetTransitionDuration = function(ms) {
  const v = Number(ms);
  if (isFinite(v) && v >= 200) TRANSITION_DURATION = v;
};
window.kaleidoSetHeavyCount = function(n) {
  const v = Math.max(0, Math.floor(Number(n) || HEAVY_ELEMENTS));
  HEAVY_ELEMENTS = v;
  drawPatternTo(gA, CURRENT_PALETTE_INDEX, Math.random() * 1000);
  drawPatternTo(gB, (CURRENT_PALETTE_INDEX + 1) % PALETTES.length, Math.random() * 1000);
};


// Порада: викличте window.kaleidoNextPalette() або змініть параметри з консолі для тестування
