// Ефект Матриці — самодостатній скрипт для консолі
document.querySelectorAll("canvas.matrix-console").forEach(c => c.remove());

// Створюємо canvas
const canvas = document.createElement("canvas");
canvas.className = "matrix-console";
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.zIndex = "2147483647";
canvas.style.pointerEvents = "none";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

// Налаштування за замовчуванням (можна змінювати через глобальні функції)
let SYMBOLS = "01";            // набір символів
let FONT_PX = 18;              // розмір шрифту у px
let DENSITY = 1.6;             // множник кількості колонок (>1 = густіше)
let TRAIL_FADE = 0.06;         // затемнення фону (0..1)
let MIN_SPEED_ROWS = 2;        // мінімальна швидкість (рядків/сек)
let MAX_SPEED_ROWS = 10;       // максимальна швидкість (рядків/сек)
let MIN_TAIL = 6;              // мінімальна довжина хвоста (рядків)
let MAX_TAIL = 28;             // максимальна довжина хвоста (рядків)
let MIN_ALPHA = 0.28;          // мінімальна прозорість хвоста (щоб символи були читабельні)

// Внутрішні змінні
let DPR = window.devicePixelRatio || 1;
let W = window.innerWidth;
let H = window.innerHeight;
let columns = 0;
let rows = 0;
let spacing = FONT_PX;
let cols = [];                // дані по кожній колонці
let gridSeq = [];             // постійні послідовності символів для колонок
let lastTime = performance.now();
let rafId = null;

// Ініціалізація canvas та колонок
function setup() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Обчислюємо кількість колонок так, щоб символи не накладалися горизонтально
  const baseCols = Math.max(2, Math.floor(W / Math.max(8, FONT_PX)));
  columns = Math.max(2, Math.floor(baseCols * DENSITY));
  rows = Math.max(4, Math.floor(H / FONT_PX));
  spacing = W / columns;

  // Ініціалізація даних для колонок та їхніх послідовностей
  cols = new Array(columns);
  gridSeq = new Array(columns);
  for (let c = 0; c < columns; c++) {
    const seqLen = rows + Math.floor(Math.random() * 20);
    const seq = new Array(seqLen);
    for (let i = 0; i < seqLen; i++) seq[i] = SYMBOLS.charAt(Math.floor(Math.random() * SYMBOLS.length));
    gridSeq[c] = seq;

    cols[c] = {
      x: Math.floor(c * spacing + (spacing - FONT_PX) / 2), // позиція по X
      headRow: -Math.random() * rows,                       // стартова позиція голови (вище екрану)
      speed: MIN_SPEED_ROWS + Math.random() * (MAX_SPEED_ROWS - MIN_SPEED_ROWS), // швидкість
      tail: MIN_TAIL + Math.floor(Math.random() * (MAX_TAIL - MIN_TAIL + 1)),    // довжина хвоста
      seqLen: seqLen,
      lastHeadInt: Math.floor(-Math.random() * rows)        // остання ціла позиція голови
    };
  }

  ctx.font = `${FONT_PX}px monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, W, H);
}

// Допоміжна функція: оновити послідовність символів для колонки
function regenSeq(colIndex) {
  const seqLen = rows + Math.floor(Math.random() * 20);
  const seq = new Array(seqLen);
  for (let i = 0; i < seqLen; i++) seq[i] = SYMBOLS.charAt(Math.floor(Math.random() * SYMBOLS.length));
  gridSeq[colIndex] = seq;
  cols[colIndex].seqLen = seqLen;
}

// Малюємо символ (голова яскравіша)
function drawChar(ch, x, y, isHead, alpha, green) {
  ctx.globalAlpha = alpha;
  if (isHead) {
    ctx.fillStyle = "rgb(180,255,180)";
    ctx.shadowColor = "rgba(180,255,180,0.25)";
    ctx.shadowBlur = 6;
    ctx.fillText(ch, x, y);
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(200,255,220,0.06)";
    ctx.fillText(ch, x, y);
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.fillStyle = `rgb(0,${green},0)`;
    ctx.shadowBlur = 0;
    ctx.fillText(ch, x, y);
  }
  ctx.globalAlpha = 1;
}

// Основний цикл анімації
function animate(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Легке затемнення фону для створення сліду
  ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
  ctx.fillRect(0, 0, W, H);

  for (let c = 0; c < columns; c++) {
    const col = cols[c];
    col.headRow += col.speed * dt;
    const headInt = Math.floor(col.headRow);

    if (headInt !== col.lastHeadInt) {
      col.lastHeadInt = headInt;
    }

    // Малюємо хвіст (дискретні рядки, без накладання)
    for (let j = 0; j < col.tail; j++) {
      const rowIndex = headInt - j;
      if (rowIndex < 0 || rowIndex >= rows) continue;
      const y = rowIndex * FONT_PX;
      const seq = gridSeq[c];
      const seqIdx = ((rowIndex % seq.length) + seq.length) % seq.length;
      const ch = seq[seqIdx];
      const t = 1 - j / col.tail;
      const green = Math.max(30, Math.floor(200 * t));
      const alpha = Math.max(MIN_ALPHA, 0.95 * t);
      const isHead = (j === 0);
      drawChar(ch, col.x, y, isHead, alpha, green);
    }

    // Скидання колонки, коли вона пройшла екран
    if (headInt - col.tail > rows + 2) {
      col.headRow = -Math.random() * rows * 0.6;
      col.speed = MIN_SPEED_ROWS + Math.random() * (MAX_SPEED_ROWS - MIN_SPEED_ROWS);
      col.tail = MIN_TAIL + Math.floor(Math.random() * (MAX_TAIL - MIN_TAIL + 1));
      regenSeq(c);
      col.lastHeadInt = Math.floor(col.headRow);
    }
  }

  rafId = requestAnimationFrame(animate);
}

// Запуск
setup();
lastTime = performance.now();
rafId = requestAnimationFrame(animate);

// Обробка зміни розміру
window.addEventListener("resize", () => {
  W = window.innerWidth;
  H = window.innerHeight;
  setup();
});

// Подвійний клік — видалити ефект
canvas.addEventListener("dblclick", () => {
  if (rafId) cancelAnimationFrame(rafId);
  canvas.remove();
});

// ESC — видалити ефект
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (rafId) cancelAnimationFrame(rafId);
    canvas.remove();
  }
});

// Глобальні функції для керування параметрами
window.setMatrixDensity = function(mult) {
  const v = Number(mult);
  if (!isFinite(v) || v <= 0) return;
  DENSITY = Math.max(0.3, Math.min(6, v));
  setup();
};
window.setMatrixFont = function(px) {
  const v = Math.floor(Number(px));
  if (!isFinite(v) || v < 8) return;
  FONT_PX = Math.max(8, Math.min(72, v));
  setup();
};
window.setMatrixSymbols = function(s) {
  if (typeof s === "string" && s.length) {
    SYMBOLS = s;
    for (let c = 0; c < columns; c++) regenSeq(c);
  }
};
