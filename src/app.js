"use strict";
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LEVELS = DATA.levels, IVS = DATA.interview;
const STAGES = ["Урок", "Интерактив", "Задания", "Тест"];
const TIMES = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)", "O(n·k)", "O(n⁴)", "O(k)"];
const today = () => Math.floor(Date.now() / 86400000);

/* ---------- inline markdown for task texts ---------- */
function md(s) {
  return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
}
/* ---------- Python highlighter ---------- */
const KW = new Set("def return if elif else for while in not and or is None True False import from as class pass break continue lambda global nonlocal try except finally with yield del assert raise".split(" "));
const BI = new Set("len range enumerate min max sum sorted set dict list tuple print abs float int str zip isinstance any all map reversed".split(" "));
function hlLine(line) {
  let out = "", i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "#") { out += `<span class="c">${esc(line.slice(i))}</span>`; break; }
    if (ch === "'" || ch === '"') {
      let j = i + 1; while (j < line.length && line[j] !== ch) { if (line[j] === "\\") j++; j++; }
      out += `<span class="s">${esc(line.slice(i, j + 1))}</span>`; i = j + 1; continue;
    }
    if (/[0-9]/.test(ch) && !/[A-Za-z_]/.test(line[i - 1] || "")) {
      let j = i; while (j < line.length && /[0-9_.]/.test(line[j])) j++;
      out += `<span class="n">${esc(line.slice(i, j))}</span>`; i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const w = line.slice(i, j);
      out += KW.has(w) ? `<span class="k">${w}</span>` : BI.has(w) ? `<span class="f">${w}</span>` : esc(w);
      i = j; continue;
    }
    out += esc(ch); i++;
  }
  return out;
}
const hl = code => code.split("\n").map(hlLine).join("\n");
function highlightIn(root) {
  root.querySelectorAll("pre > code.language-python").forEach(c => { c.innerHTML = hl(c.textContent.replace(/\n$/, "")); });
}

/* ---------- state ---------- */
const blankLevel = () => ({ stage: 0, card: 0, seen: 0, viz: false, tasks: {}, tries: 0, stars: 0, day: 0, hints: 0 });
function freshState() { return { v: 1, lv: LEVELS.map(blankLevel), iv: [], code: {} }; }
let S = freshState();
function load() {
  try { const raw = localStorage.getItem("algoquest-v1"); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1 && Array.isArray(o.lv)) { S = o; while (S.lv.length < LEVELS.length) S.lv.push(blankLevel()); } } } catch (e) {}
}
function save() { try { localStorage.setItem("algoquest-v1", JSON.stringify(S)); } catch (e) {} }

/* ---------- save code ---------- */
function crc32(str) { let c, crc = 0xFFFFFFFF; for (let i = 0; i < str.length; i++) { c = (crc ^ str.charCodeAt(i)) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4))));
function makeCode() {
  const base = today();
  const lv = S.lv.map((l, i) => {
    const ids = LEVELS[i].tasks.map(t => t.id);
    let mask = 0; ids.forEach((id, j) => { if (l.tasks[id] && l.tasks[id].done) mask |= 1 << j; });
    return [l.stage, l.seen, l.viz ? 1 : 0, mask, l.hints, l.tries, l.stars, l.day ? base - l.day : -1];
  });
  const payload = JSON.stringify({ d: base, l: lv, i: S.iv.length });
  const body = b64u(payload), sum = crc32(body).toString(36).padStart(7, "0").slice(-4);
  return ("AQ1" + body + sum).match(/.{1,6}/g).join("-");
}
function readCode(txt) {
  const raw = txt.replace(/[\s-]/g, "");
  if (!raw.startsWith("AQ1") || raw.length < 12) throw new Error("Это не код Algo Quest: он должен начинаться с AQ1.");
  const body = raw.slice(3, -4), sum = raw.slice(-4);
  if (crc32(body).toString(36).padStart(7, "0").slice(-4) !== sum) throw new Error("Код повреждён: проверь, что он скопирован полностью и без опечаток.");
  const p = JSON.parse(unb64u(body)), st = freshState();
  p.l.forEach((a, i) => {
    if (!st.lv[i]) return;
    const l = st.lv[i]; [l.stage, l.seen, , , l.hints, l.tries, l.stars] = a; l.viz = !!a[2]; l.card = 0;
    LEVELS[i].tasks.forEach((t, j) => { if (a[3] & (1 << j)) l.tasks[t.id] = { done: true, h: 0 }; });
    l.day = a[7] >= 0 ? p.d - a[7] : 0;
  });
  st.iv = Array.from({ length: p.i || 0 }, () => ({ day: p.d, imported: true }));
  return st;
}

/* ---------- helpers ---------- */
const levelDone = i => S.lv[i].stage >= 4;
const levelOpen = i => i === 0 || levelDone(i - 1);
const allDone = () => S.lv.every((l, i) => levelDone(i));
const doneCount = () => S.lv.filter((l, i) => levelDone(i)).length;
function stars(n) { return `<span class="stars" aria-label="${n} из 3">${"★".repeat(n)}<span class="off">${"★".repeat(3 - n)}</span></span>`; }
function setCrumbs(t) { $("#crumbs").textContent = t || ""; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function modal(html) {
  const root = $("#modal-root"); root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="panel">${html}</div></div>`;
  const m = root.firstChild; m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  return m;
}
const closeModal = () => { $("#modal-root").innerHTML = ""; };
const app = () => $("#app");
let VIEW = { name: "home" };
let cleanup = null;
function go(v) { if (cleanup) { cleanup(); cleanup = null; } VIEW = v; render(); window.scrollTo(0, 0); }
function render() {
  if (VIEW.name === "home") return renderHome();
  if (VIEW.name === "level") return renderLevel();
  if (VIEW.name === "iv") return renderInterview();
}

/* ---------- HOME ---------- */
function renderHome() {
  setCrumbs("");
  const dc = doneCount(), open = allDone();
  const cur = S.lv.findIndex((l, i) => !levelDone(i));
  const nodeHtml = (L, i) => {
    const l = S.lv[i], dn = levelDone(i), op = levelOpen(i);
    const stg = dn ? "Пройдено" : op ? `Этап: ${STAGES[Math.min(l.stage, 3)]}` : "Откроется после главы " + i;
    const rep = dn && l.day && today() - l.day >= 3 ? ` <span class="pill warn">Повтори</span>` : "";
    return `<button class="node ${dn ? "done" : ""} ${i === cur ? "cur" : ""}" data-lv="${i}" ${op ? "" : "disabled"}>
      <span class="num">${dn ? "✓" : i + 1}</span>
      <span class="t">${esc(L.short)}</span><span class="s">${stg}${rep}</span>${dn ? stars(l.stars) : ""}</button>`;
  };
  const parts = []; LEVELS.forEach((L, i) => { if (!parts.length || parts[parts.length - 1].name !== L.part) parts.push({ name: L.part, items: [] }); parts[parts.length - 1].items.push(i); });
  const nodes = parts.map(p => `<div class="eyebrow" style="margin:18px 0 8px">${esc(p.name)} · ${p.items.filter(levelDone).length} из ${p.items.length}</div><div class="path">${p.items.map(i => nodeHtml(LEVELS[i], i)).join("")}</div>`).join("");
  const ivHist = S.iv.filter(x => !x.imported).slice(-3).reverse().map(x => `<li>${new Date(x.day * 86400000).toLocaleDateString("ru-RU")}: ${x.verdict === "hire" ? "<span class='pill ok'>hire</span>" : "<span class='pill bad'>no hire</span>"} ${esc(x.titles.join(", "))}</li>`).join("");
  app().innerHTML = `
  <section class="hero">
    <div>
      <div class="eyebrow">Серия Quest · алгоритмы</div>
      <h1>Подготовка к алгоритмическому собеседованию</h1>
      <p class="lead">Сначала изучи ${LEVELS.length} глав методички: урок, пошаговый визуализатор, задания с подсказками и итоговый тест. Когда все главы пройдены, открывается алгособес — 45 минут, две задачи и разбор по критериям интервьюера.</p>
      <div class="row" style="margin-top:18px">
        <button class="btn primary" id="continue">${dc === 0 ? "Начать с главы 1" : open ? "К алгособесу" : "Продолжить: глава " + (cur + 1)}</button>
        <button class="btn" id="enter-code">Ввести код сохранения</button>
      </div>
    </div>
    <div class="trace" aria-label="Пример трассировки из главы 5">
      <div class="eyebrow" style="margin-bottom:6px">Трассировка · subarray_sum([1, 2, 1, 2, 1], k = 3)</div>
      <table><tr><th>x</th><th>pref</th><th>pref − k</th><th>найдено</th><th>ans</th></tr>
      <tr><td>1</td><td>1</td><td>−2</td><td>0</td><td>0</td></tr><tr><td>2</td><td>3</td><td>0</td><td>1</td><td>1</td></tr>
      <tr class="cur"><td>1</td><td>4</td><td>1</td><td>1</td><td>2</td></tr><tr><td>2</td><td>6</td><td>3</td><td>1</td><td>3</td></tr><tr><td>1</td><td>7</td><td>4</td><td>1</td><td>4</td></tr></table>
    </div>
  </section>
  <section class="track">
    <div class="track-head"><div><div class="eyebrow">Этап 1</div><h2>Изучение алгоритмов</h2></div>
      <div style="min-width:220px"><div class="muted" style="font-size:14px;margin-bottom:6px">Пройдено глав: ${dc} из ${LEVELS.length}</div><div class="progressbar"><span style="width:${dc / LEVELS.length * 100}%"></span></div></div></div>
    ${nodes}
  </section>
  <section class="track" style="margin-top:28px">
    <div class="track-head"><div><div class="eyebrow">Этап 2</div><h2>Алгособес</h2></div></div>
    <div class="iv-card ${open ? "open" : ""}">
      <div><p style="margin:0 0 6px"><b>${open ? "Открыт." : `Откроется, когда пройдены все ${LEVELS.length} глав.`}</b> Сессия идёт 45 минут: одна easy и одна medium задача, которые не встречались в заданиях. Решаешь по фреймворку из главы 1: уточняешь условие, разбираешь пример, называешь брутфорс и оптимальную технику, пишешь код, проверяешь. В конце — отчёт по 4 критериям и вердикт hire / no hire.</p>
      ${ivHist ? `<ul class="muted" style="margin:8px 0 0;padding-left:18px;font-size:14px">${ivHist}</ul>` : ""}</div>
      <button class="btn ${open ? "primary" : ""}" id="start-iv" ${open ? "" : "disabled"}>${open ? "Начать собеседование" : "Закрыто: " + dc + " / " + LEVELS.length}</button>
    </div>
  </section>`;
  app().querySelectorAll(".node").forEach(b => b.onclick = () => go({ name: "level", i: +b.dataset.lv }));
  $("#continue").onclick = () => open ? go({ name: "iv" }) : go({ name: "level", i: Math.max(0, cur) });
  $("#enter-code").onclick = openCodeDialog;
  $("#start-iv").onclick = () => { if (open) go({ name: "iv" }); };
}

/* ---------- save dialog ---------- */
function openCodeDialog() {
  const code = makeCode();
  const m = modal(`<h2>Код сохранения</h2>
    <p class="muted">Прогресс хранится в этом браузере. Чтобы продолжить на другом устройстве или после очистки браузера, сохрани код и введи его там.</p>
    <div class="lbl">Твой код</div><div class="codebox" id="mycode">${code}</div>
    <div class="row" style="margin:10px 0 18px"><button class="btn small" id="copy">Скопировать</button><span class="muted" id="copied" style="font-size:14px"></span></div>
    <label class="lbl" for="incode">Ввести код</label>
    <textarea id="incode" rows="3" style="width:100%;margin-top:4px;font-family:var(--f-mono)" placeholder="AQ1…"></textarea>
    <div id="code-err"></div>
    <div class="row" style="margin-top:10px;justify-content:space-between"><button class="btn primary" id="apply">Загрузить прогресс</button><button class="btn ghost" id="close">Закрыть</button></div>`);
  $("#copy", m).onclick = () => {
    navigator.clipboard.writeText(code).then(() => $("#copied", m).textContent = "Скопировано", () => {
      const r = document.createRange(); r.selectNodeContents($("#mycode", m)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#copied", m).textContent = "Выделено — нажми Ctrl+C";
    });
  };
  $("#apply", m).onclick = () => {
    try { S = readCode($("#incode", m).value); save(); closeModal(); go({ name: "home" }); }
    catch (e) { $("#code-err", m).innerHTML = `<div class="fb bad">${esc(e.message)}</div>`; }
  };
  $("#close", m).onclick = closeModal;
}

/* ---------- LEVEL ---------- */
function renderLevel() {
  const i = VIEW.i, L = LEVELS[i], l = S.lv[i];
  if (!levelOpen(i)) return go({ name: "home" });
  if (VIEW.stage === undefined) VIEW.stage = Math.min(l.stage, 3);
  setCrumbs(L.title);
  const tabs = STAGES.map((n, k) => {
    const unlocked = k <= l.stage, done = k < l.stage;
    return `<button class="stage ${k === VIEW.stage ? "on" : ""} ${done ? "done" : ""}" data-st="${k}" ${unlocked ? "" : "disabled"}><b>${k + 1}</b>${n}${done ? " ✓" : ""}</button>`;
  }).join("");
  app().innerHTML = `<div class="eyebrow">${esc(L.part)} · глава ${i + 1} из ${LEVELS.length}</div>
    <h1>${esc(L.short)}</h1>
    <div class="stages" role="tablist">${tabs}${levelDone(i) ? `<span class="pill ok" style="margin-left:auto">Глава пройдена ${stars(l.stars)}</span>` : ""}</div>
    <div id="stage"></div>`;
  app().querySelectorAll(".stage").forEach(b => b.onclick = () => { VIEW.stage = +b.dataset.st; if (cleanup) { cleanup(); cleanup = null; } renderLevel(); });
  [renderLesson, renderViz, renderTasks, renderTest][VIEW.stage](i);
}
function advance(i, toStage) {
  const l = S.lv[i];
  if (l.stage < toStage) { l.stage = toStage; save(); }
}

/* lesson */
function renderLesson(i) {
  const L = LEVELS[i], l = S.lv[i], cards = L.cards;
  let c = VIEW.card !== undefined ? VIEW.card : Math.min(l.card, cards.length - 1);
  const draw = () => {
    VIEW.card = c; l.card = c; l.seen = Math.max(l.seen, c); save();
    const card = cards[c], last = c === cards.length - 1;
    $("#stage").innerHTML = `<div class="lesson">
      <nav class="toc" aria-label="Карточки урока">${cards.map((k, j) => `<button data-c="${j}" class="${j === c ? "on" : ""} ${j <= l.seen && j !== c ? "seen" : ""}" ${j > l.seen + 1 && l.stage === 0 ? "disabled" : ""}>${esc(k.title)}</button>`).join("")}</nav>
      <article class="card"><div class="eyebrow">Карточка ${c + 1} из ${cards.length}</div><h2>${esc(card.title)}</h2>
        <div class="prose">${card.html}</div>
        <div class="card-nav"><button class="btn" id="prev" ${c === 0 ? "disabled" : ""}>← Назад</button>
        ${last ? `<button class="btn primary" id="finish">${l.stage > 0 ? "К интерактиву →" : "Урок прочитан — к интерактиву →"}</button>` : `<button class="btn primary" id="next">Дальше →</button>`}</div>
      </article></div>`;
    highlightIn($("#stage"));
    $("#stage").querySelectorAll(".toc button").forEach(b => b.onclick = () => { c = +b.dataset.c; draw(); window.scrollTo(0, 0); });
    $("#prev").onclick = () => { c--; draw(); window.scrollTo(0, 0); };
    if (last) $("#finish").onclick = () => { advance(i, 1); VIEW.stage = 1; VIEW.card = c; renderLevel(); window.scrollTo(0, 0); };
    else $("#next").onclick = () => { c++; draw(); window.scrollTo(0, 0); };
  };
  draw();
}

/* ---------- VISUALIZER ---------- */
const VIZ = {};
function F(o) { return o; }
function parseList(s, isStr) {
  s = s.trim();
  if (isStr) { if (s.length < 1 || s.length > 20) throw new Error("Введи строку от 1 до 20 символов."); return s.split(""); }
  const arr = s.replace(/[\[\]]/g, "").split(/[\s,]+/).filter(Boolean).map(Number);
  if (!arr.length || arr.some(x => !Number.isInteger(x))) throw new Error("Введи целые числа через запятую, например: 3, 1, 4");
  if (arr.length > 20) throw new Error("Не больше 20 чисел — иначе шаги не поместятся.");
  return arr;
}
VIZ.profit = {
  title: "max_profit: минимум слева", input: "7, 1, 5, 3, 6, 4", hint: "Цены через запятую",
  code: ["def max_profit(prices):", "    min_price = float('inf')", "    best = 0", "    for i, p in enumerate(prices):", "        min_price = min(min_price, p)", "        best = max(best, p - min_price)", "    return best"],
  frames(s) {
    const a = parseList(s), fr = []; let mn = Infinity, best = 0;
    fr.push(F({ arr: a, line: 2, vars: { min_price: "inf", best: 0 }, note: "Минимум ещё не известен, прибыль 0." }));
    a.forEach((p, i) => {
      mn = Math.min(mn, p);
      fr.push(F({ arr: a, ptr: { i }, mark: [a.indexOf(mn, 0) <= i ? a.lastIndexOf(mn, i) : i], line: 4, vars: { p, min_price: mn, best }, note: `День ${i}: самая низкая цена до сегодняшнего дня включительно — ${mn}.` }));
      const pr = p - mn; best = Math.max(best, pr);
      fr.push(F({ arr: a, ptr: { i }, mark: [a.lastIndexOf(mn, i)], line: 5, vars: { p, min_price: mn, "p − min": pr, best }, note: `Продать сегодня: ${p} − ${mn} = ${pr}. Лучшая прибыль: ${best}.` }));
    });
    fr.push(F({ arr: a, line: 6, vars: { best }, note: `Ответ: ${best}. Один проход — O(n), память O(1).` }));
    return fr;
  }
};
VIZ.growth = {
  title: "Рост числа операций", input: "6", hint: "Максимальная степень десяти: от 1 до 6",
  code: ["# Сколько операций сделает алгоритм при n = 10^k", "# и сколько это секунд при ~10^7 операций в секунду"],
  frames(s) {
    const K = parseInt(s, 10); if (!(K >= 1 && K <= 6)) throw new Error("Введи число от 1 до 6.");
    const out = [];
    for (let k = 1; k <= K; k++) {
      const n = 10 ** k, lg = Math.log2(n);
      const rows = [["O(log n)", lg], ["O(n)", n], ["O(n log n)", n * lg], ["O(n²)", n * n], ["O(2ⁿ)", n <= 60 ? 2 ** n : Infinity]];
      out.push(F({ growth: rows, line: 0, vars: { n: n.toLocaleString("ru-RU") }, note: `n = ${n.toLocaleString("ru-RU")}. ${n * n / 1e7 > 60 ? "O(n²) уже не укладывается в минуту." : "Пока все классы, кроме экспоненты, быстрые."}` }));
    }
    return out;
  }
};
VIZ.heap = {
  title: "heappush: всплытие", input: "5, 1, 8, 3, 2", hint: "Числа, которые вставляем по очереди",
  code: ["def heappush(h, x):", "    h.append(x)", "    i = len(h) - 1", "    while i > 0 and h[(i - 1) // 2] > h[i]:", "        p = (i - 1) // 2", "        h[i], h[p] = h[p], h[i]", "        i = p"],
  frames(s) {
    const xs = parseList(s); if (xs.length > 15) throw new Error("Не больше 15 чисел для кучи."); const h = [], fr = [];
    xs.forEach(x => {
      h.push(x); let i = h.length - 1;
      fr.push(F({ arr: h.slice(), heap: true, mark: [i], line: 1, vars: { x }, note: `Кладём ${x} в конец списка (индекс ${i}).` }));
      while (i > 0 && h[(i - 1) >> 1] > h[i]) {
        const p = (i - 1) >> 1;
        fr.push(F({ arr: h.slice(), heap: true, mark: [i, p], line: 3, vars: { i, p, "h[p]": h[p], "h[i]": h[i] }, note: `Родитель ${h[p]} больше ${h[i]} — меняем местами.` }));
        [h[i], h[p]] = [h[p], h[i]]; i = p;
        fr.push(F({ arr: h.slice(), heap: true, mark: [i], line: 5, vars: { i }, note: `После обмена элемент на индексе ${i}.` }));
      }
      fr.push(F({ arr: h.slice(), heap: true, mark: [i], line: 3, vars: { i }, note: i === 0 ? "Дошли до корня — стоп." : `Родитель ${h[(i - 1) >> 1]} не больше — стоп. Минимум в h[0] = ${h[0]}.` }));
    });
    return fr;
  }
};
VIZ.stack = {
  title: "Стек вызовов factorial", input: "4", hint: "n от 1 до 8",
  code: ["def factorial(n):", "    if n <= 1:", "        return 1", "    return n * factorial(n - 1)"],
  frames(s) {
    const n = parseInt(s, 10); if (!(n >= 1 && n <= 8)) throw new Error("Введи n от 1 до 8.");
    const fr = [], st = [];
    for (let k = n; k >= 1; k--) {
      st.push(`factorial(${k})`);
      fr.push(F({ stack: st.slice(), line: k > 1 ? 3 : 1, vars: { n: k }, note: k > 1 ? `factorial(${k}) ждёт ответа от factorial(${k - 1}). Глубина стека: ${st.length}.` : "Базовый случай: n ≤ 1." }));
    }
    let val = 1;
    fr.push(F({ stack: st.slice(), line: 2, vars: { n: 1, "вернёт": 1 }, note: "factorial(1) возвращает 1 — ответы начинают всплывать." }));
    st.pop();
    for (let k = 2; k <= n; k++) {
      const prev = val; val *= k;
      fr.push(F({ stack: st.slice(), line: 3, vars: { n: k, "вернёт": val }, note: `${k} · ${prev} = ${val}. Кадр factorial(${k}) снимается со стека.` }));
      st.pop();
    }
    fr.push(F({ stack: [], line: 3, vars: { "ответ": val }, note: `Ответ ${val}. Максимальная глубина стека ${n} — память O(n).` }));
    return fr;
  }
};
VIZ.prefix = {
  title: "subarray_sum: префиксы + словарь", input: "1, 2, 1, 2, 1 | 3", hint: "Числа, затем | и k",
  code: ["def subarray_sum(nums, k):", "    seen = {0: 1}", "    pref = ans = 0", "    for x in nums:", "        pref += x", "        ans += seen.get(pref - k, 0)", "        seen[pref] = seen.get(pref, 0) + 1", "    return ans"],
  frames(s) {
    const [a1, k1] = s.split("|"); const a = parseList(a1); const k = parseInt((k1 || "").trim(), 10);
    if (!Number.isInteger(k)) throw new Error("После | укажи целое k, например: 1, 2, 3 | 3");
    const seen = new Map([[0, 1]]), fr = []; let pref = 0, ans = 0;
    const m = () => Object.fromEntries([...seen.entries()].map(([x, y]) => [x, y]));
    fr.push(F({ arr: a, line: 1, map: m(), vars: { pref, ans, k }, note: "seen = {0: 1}: «пустой префикс» до начала массива." }));
    a.forEach((x, i) => {
      pref += x;
      fr.push(F({ arr: a, ptr: { i }, range: [0, i], line: 4, map: m(), vars: { x, pref, ans }, note: `pref = сумма a[0..${i}] = ${pref}.` }));
      const f = seen.get(pref - k) || 0; ans += f;
      fr.push(F({ arr: a, ptr: { i }, line: 5, map: m(), hlKey: pref - k, vars: { pref, "pref − k": pref - k, "найдено": f, ans }, note: f ? `Префикс ${pref - k} встречался ${f} раз — столько подмассивов с суммой ${k} заканчиваются здесь.` : `Префикса ${pref - k} ещё не было.` }));
      seen.set(pref, (seen.get(pref) || 0) + 1);
      fr.push(F({ arr: a, ptr: { i }, line: 6, map: m(), hlKey: pref, vars: { pref, ans }, note: `Записываем текущий префикс ${pref} — уже после поиска.` }));
    });
    fr.push(F({ arr: a, line: 7, map: m(), vars: { ans }, note: `Ответ: ${ans}. O(n) времени и памяти.` }));
    return fr;
  }
};
VIZ.twoptr = {
  title: "Встречные указатели", input: "1, 3, 4, 6, 8, 11 | 10", hint: "Отсортированные числа, затем | и target",
  code: ["def two_sum_sorted(a, target):", "    l, r = 0, len(a) - 1", "    while l < r:", "        s = a[l] + a[r]", "        if s == target:", "            return l, r", "        if s < target:", "            l += 1", "        else:", "            r -= 1"],
  frames(s) {
    const [a1, t1] = s.split("|"); const a = parseList(a1); const t = parseInt((t1 || "").trim(), 10);
    if (!Number.isInteger(t)) throw new Error("После | укажи target, например: 1, 3, 4 | 7");
    for (let j = 1; j < a.length; j++) if (a[j] < a[j - 1]) throw new Error("Массив должен быть отсортирован по неубыванию.");
    let l = 0, r = a.length - 1; const fr = [F({ arr: a, ptr: { l, r }, line: 1, vars: { target: t }, note: "Начинаем с самой широкой пары." })];
    while (l < r) {
      const sm = a[l] + a[r];
      if (sm === t) { fr.push(F({ arr: a, ptr: { l, r }, mark: [l, r], line: 5, vars: { s: sm }, note: `${a[l]} + ${a[r]} = ${t} — нашли пару (${l}, ${r}).` })); return fr; }
      if (sm < t) { fr.push(F({ arr: a, ptr: { l, r }, mark: [l], line: 7, vars: { s: sm }, note: `${sm} < ${t}: даже с самым большим a[r] сумма мала — a[l] не нужен, l += 1.` })); l++; }
      else { fr.push(F({ arr: a, ptr: { l, r }, mark: [r], line: 9, vars: { s: sm }, note: `${sm} > ${t}: даже с самым маленьким a[l] много — a[r] не нужен, r −= 1.` })); r--; }
    }
    fr.push(F({ arr: a, ptr: { l, r }, line: 2, vars: {}, note: "Указатели встретились — пары нет." }));
    return fr;
  }
};
VIZ.window = {
  title: "Окно без повторов", input: "pwwkew", hint: "Строка до 20 символов",
  code: ["def length_of_longest_substring(s):", "    window = set()", "    l = best = 0", "    for r, ch in enumerate(s):", "        while ch in window:", "            window.remove(s[l])", "            l += 1", "        window.add(ch)", "        best = max(best, r - l + 1)", "    return best"],
  frames(s) {
    const a = parseList(s, true), w = new Set(), fr = []; let l = 0, best = 0;
    const st = () => "{" + [...w].map(x => `'${x}'`).join(", ") + "}";
    a.forEach((ch, r) => {
      fr.push(F({ arr: a, ptr: { l, r }, range: r > l ? [l, r - 1] : null, line: 3, vars: { ch, window: st(), best }, note: `Голова r = ${r} берёт '${ch}'.` }));
      while (w.has(ch)) {
        w.delete(a[l]);
        fr.push(F({ arr: a, ptr: { l, r }, mark: [l], line: 5, vars: { window: st() }, note: `'${ch}' уже в окне — выбрасываем '${a[l]}' слева.` }));
        l++;
      }
      w.add(ch); best = Math.max(best, r - l + 1);
      fr.push(F({ arr: a, ptr: { l, r }, range: [l, r], line: 8, vars: { window: st(), "длина": r - l + 1, best }, note: `Окно s[${l}..${r}] без повторов, длина ${r - l + 1}.` }));
    });
    fr.push(F({ arr: a, line: 9, vars: { best }, note: `Ответ: ${best}. Каждый символ вошёл и вышел не больше раза — O(n).` }));
    return fr;
  }
};
VIZ.twosum = {
  title: "Two Sum: словарь прошлых значений", input: "3, 2, 4 | 6", hint: "Числа, затем | и target",
  code: ["def two_sum(nums, target):", "    seen = {}", "    for i, x in enumerate(nums):", "        need = target - x", "        if need in seen:", "            return [seen[need], i]", "        seen[x] = i"],
  frames(s) {
    const [a1, t1] = s.split("|"); const a = parseList(a1); const t = parseInt((t1 || "").trim(), 10);
    if (!Number.isInteger(t)) throw new Error("После | укажи target.");
    const seen = new Map(), fr = [], m = () => Object.fromEntries(seen);
    fr.push(F({ arr: a, line: 1, map: m(), vars: { target: t }, note: "Словарь «значение → индекс» пуст." }));
    for (let i = 0; i < a.length; i++) {
      const x = a[i], need = t - x;
      fr.push(F({ arr: a, ptr: { i }, line: 3, map: m(), hlKey: need, vars: { x, need }, note: `Ищем ${need} среди прошлых значений.` }));
      if (seen.has(need)) { fr.push(F({ arr: a, ptr: { i }, mark: [seen.get(need), i], line: 5, map: m(), hlKey: need, vars: { "ответ": `[${seen.get(need)}, ${i}]` }, note: `Нашли: ${need} был на индексе ${seen.get(need)}.` })); return fr; }
      seen.set(x, i);
      fr.push(F({ arr: a, ptr: { i }, line: 6, map: m(), hlKey: x, vars: { x }, note: `Не нашли — записываем ${x} → ${i}. Запись после проверки: число не найдёт само себя.` }));
    }
    fr.push(F({ arr: a, line: 2, map: m(), vars: {}, note: "Пары не нашлось." }));
    return fr;
  }
};

VIZ.partition = {
  title: "Разбиение Ломуто", input: "7, 2, 9, 1, 5", hint: "Числа; pivot — последнее",
  code: ["def partition(a, lo, hi):", "    pivot = a[hi]", "    i = lo", "    for j in range(lo, hi):", "        if a[j] < pivot:", "            a[i], a[j] = a[j], a[i]", "            i += 1", "    a[i], a[hi] = a[hi], a[i]", "    return i"],
  frames(s) {
    const a = parseList(s); if (a.length < 2) throw new Error("Нужно хотя бы 2 числа.");
    const hi = a.length - 1, pv = a[hi], fr = []; let i = 0;
    fr.push(F({ arr: a.slice(), ptr: { i, pivot: hi }, mark: [hi], line: 1, vars: { pivot: pv }, note: `Опорный — последний элемент, ${pv}. Слева от i будут элементы меньше ${pv}.` }));
    for (let j = 0; j < hi; j++) {
      if (a[j] < pv) {
        [a[i], a[j]] = [a[j], a[i]];
        fr.push(F({ arr: a.slice(), ptr: { i, j }, range: [0, i], mark: [hi], line: 5, vars: { "a[j]": a[i], pivot: pv }, note: `${a[i]} < ${pv}: меняем a[${i}] и a[${j}], граница i растёт.` }));
        i++;
      } else fr.push(F({ arr: a.slice(), ptr: { i, j }, range: i > 0 ? [0, i - 1] : null, mark: [hi], line: 4, vars: { "a[j]": a[j], pivot: pv }, note: `${a[j]} ≥ ${pv}: оставляем на месте.` }));
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    fr.push(F({ arr: a.slice(), ptr: { i }, mark: [i], line: 7, vars: { "pivot на индексе": i }, note: `Pivot ${pv} встал на индекс ${i} — это его место в отсортированном массиве. Слева меньшие, справа не меньшие.` }));
    return fr;
  }
};
VIZ.binsearch = {
  title: "Бинарный поиск: первый a[i] ≥ x", input: "1, 2, 2, 2, 5, 7, 9 | 2", hint: "Отсортированные числа, затем | и x",
  code: ["lo, hi = 0, len(a)", "while lo < hi:", "    mid = (lo + hi) // 2", "    if a[mid] >= x:", "        hi = mid", "    else:", "        lo = mid + 1", "return lo"],
  frames(s) {
    const [a1, x1] = s.split("|"); const a = parseList(a1); const x = parseInt((x1 || "").trim(), 10);
    if (!Number.isInteger(x)) throw new Error("После | укажи x, например: 1, 3, 5 | 4");
    for (let j = 1; j < a.length; j++) if (a[j] < a[j - 1]) throw new Error("Массив должен быть отсортирован.");
    let lo = 0, hi = a.length; const fr = [F({ arr: a, range: [lo, hi - 1], ptr: { lo }, line: 0, vars: { lo, hi, x }, note: `Ищем первый индекс, где a[i] ≥ ${x}. Кандидаты — [${lo}, ${hi}).` })];
    while (lo < hi) {
      const mid = (lo + hi) >> 1, ok = a[mid] >= x;
      fr.push(F({ arr: a, range: [lo, hi - 1], ptr: { lo, mid }, mark: [mid], line: 3, vars: { lo, hi, mid, "a[mid]": a[mid] }, note: `a[${mid}] = ${a[mid]} ${ok ? "≥" : "<"} ${x}: ${ok ? "ответ mid или левее" : "ответ строго правее"}.` }));
      if (ok) hi = mid; else lo = mid + 1;
      fr.push(F({ arr: a, range: lo < hi ? [lo, hi - 1] : null, ptr: { lo }, line: ok ? 4 : 6, vars: { lo, hi }, note: `Осталось кандидатов: ${hi - lo}.` }));
    }
    fr.push(F({ arr: a, ptr: { lo }, mark: lo < a.length ? [lo] : [], line: 7, vars: { "ответ": lo }, note: lo < a.length ? `Ответ ${lo}: первый a[i] ≥ ${x}. Шагов — около log₂ n.` : `Все элементы меньше ${x} — ответ ${lo} (за концом массива).` }));
    return fr;
  }
};
VIZ.intervals = {
  title: "Слияние интервалов", input: "1-3, 8-10, 2-6, 15-18, 9-12", hint: "Интервалы вида начало-конец через запятую",
  code: ["intervals.sort()", "res = []", "for s, e in intervals:", "    if res and s <= res[-1][1]:", "        res[-1][1] = max(res[-1][1], e)", "    else:", "        res.append([s, e])"],
  frames(s) {
    const iv = s.split(",").map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(-?\d+)\s*-\s*(-?\d+)$/); if (!m || +m[1] > +m[2]) throw new Error("Формат: начало-конец, например 1-3, 2-6"); return [+m[1], +m[2]]; });
    if (!iv.length || iv.length > 12) throw new Error("Введи от 1 до 12 интервалов.");
    const sorted = iv.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]), res = [], fr = [];
    fr.push(F({ ivals: sorted, res: [], line: 0, vars: { "интервалов": sorted.length }, note: "Сортируем по началу. Теперь новый интервал может пересечься только с последним в ответе." }));
    sorted.forEach(([a, b], k) => {
      const last = res[res.length - 1];
      if (last && a <= last[1]) { const old = last[1]; last[1] = Math.max(last[1], b); fr.push(F({ ivals: sorted, cur: k, res: res.map(x => x.slice()), line: 4, vars: { s: a, e: b }, note: `${a} ≤ ${old}: пересекается с последним — конец становится max(${old}, ${b}) = ${last[1]}.` })); }
      else { res.push([a, b]); fr.push(F({ ivals: sorted, cur: k, res: res.map(x => x.slice()), line: 6, vars: { s: a, e: b }, note: last ? `${a} > ${last[1]}: не пересекается — новый интервал в ответе.` : "Первый интервал — сразу в ответ." })); }
    });
    fr.push(F({ ivals: sorted, res: res.map(x => x.slice()), line: 2, vars: { "в ответе": res.length }, note: `Готово: ${res.map(x => `[${x[0]}, ${x[1]}]`).join(", ")}. O(n log n) из-за сортировки.` }));
    return fr;
  }
};

function renderFrame(f, sc) {
  let h = "";
  if (f.growth) {
    const mx = Math.log10(1e12);
    h += `<div class="tw"><table><tr><th>Класс</th><th>Операций</th><th>Время при 10⁷/с</th><th style="width:40%">Масштаб (лог)</th></tr>${f.growth.map(([n, v]) => {
      const sec = v / 1e7, t = !isFinite(v) ? "дольше жизни Вселенной" : sec < 0.001 ? "мгновенно" : sec < 60 ? sec.toFixed(sec < 1 ? 3 : 1) + " с" : sec < 3600 ? (sec / 60).toFixed(0) + " мин" : sec < 86400 * 365 ? (sec / 3600).toFixed(0) + " ч" : "годы";
      const w = !isFinite(v) ? 100 : Math.max(2, Math.min(100, Math.log10(Math.max(v, 1)) / mx * 100));
      return `<tr><td><code>${n}</code></td><td>${isFinite(v) ? (v >= 1e6 ? v.toExponential(1).replace("e+", "·10^") : Math.round(v).toLocaleString("ru-RU")) : "—"}</td><td>${t}</td><td><div class="progressbar"><span style="width:${w}%;background:${w > 80 ? "var(--bad)" : "var(--accent)"}"></span></div></td></tr>`;
    }).join("")}</table></div>`;
  }
  if (f.ivals) {
    const all = f.ivals.concat(f.res || []), mn = Math.min(...all.map(x => x[0])), mx = Math.max(...all.map(x => x[1])), span = Math.max(1, mx - mn);
    const W = 460, X = v => 10 + (v - mn) / span * (W - 20), rowH = 22;
    const bars = (list, y0, hlIdx, color) => list.map(([a, b], k) => `<rect x="${X(a)}" y="${y0 + k * rowH}" width="${Math.max(4, X(b) - X(a))}" height="14" rx="4" fill="${k === hlIdx ? "var(--mark)" : color}"/><text x="${X(b) + 6}" y="${y0 + k * rowH + 11}" font-size="11" font-family="var(--f-mono)" fill="var(--muted)">[${a}, ${b}]</text>`).join("");
    const H1 = f.ivals.length * rowH, H2 = Math.max(1, (f.res || []).length) * rowH;
    h += `<div class="lbl">${f.ivLabel || "Отсортированные интервалы"}</div><svg viewBox="0 0 ${W + 60} ${H1}" style="width:100%;max-width:${W + 60}px;height:auto">${bars(f.ivals, 2, f.cur, "var(--accent)")}</svg>`;
    h += `<div class="lbl">${f.resLabel || "Ответ"}</div><svg viewBox="0 0 ${W + 60} ${H2}" style="width:100%;max-width:${W + 60}px;height:auto">${bars(f.res || [], 2, -1, "var(--ok)")}</svg>`;
  }
  if (f.arr && !f.heap) {
    const ptr = f.ptr || {}, at = {};
    Object.entries(ptr).forEach(([k, v]) => { (at[v] = at[v] || []).push(k); });
    h += `<div class="cells">${f.arr.map((v, j) => {
      const inR = f.range && j >= f.range[0] && j <= f.range[1], mk = (f.mark || []).includes(j);
      return `<div class="cell ${inR ? "in" : ""} ${mk ? "mk" : ""}"><span class="ix">${j}</span>${esc(v)}${at[j] ? `<span class="pt">${at[j].join(",")}</span>` : ""}</div>`;
    }).join("")}</div>`;
  }
  if (f.heap) {
    const a = f.arr, n = a.length, W = 420, depth = Math.max(1, Math.ceil(Math.log2(n + 1))), H = depth * 58 + 10;
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto" role="img" aria-label="Куча деревом">`;
    const pos = j => { const d = Math.floor(Math.log2(j + 1)), k = j - (2 ** d - 1), cnt = 2 ** d; return [W * (k + 0.5) / cnt, 26 + d * 58]; };
    for (let j = 1; j < n; j++) { const [x1, y1] = pos(j), [x2, y2] = pos((j - 1) >> 1); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)" stroke-width="2"/>`; }
    for (let j = 0; j < n; j++) { const [x, y] = pos(j), mk = (f.mark || []).includes(j); svg += `<circle cx="${x}" cy="${y}" r="18" fill="${mk ? "var(--mark-soft)" : "var(--surface)"}" stroke="${mk ? "var(--mark)" : "var(--accent)"}" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="var(--f-mono)" font-size="14" fill="var(--ink)">${a[j]}</text>`; }
    svg += "</svg>";
    h += `<div class="lbl">Дерево</div>${svg}<div class="lbl">Список</div><div class="cells">${a.map((v, j) => `<div class="cell ${(f.mark || []).includes(j) ? "mk" : ""}"><span class="ix">${j}</span>${v}</div>`).join("")}</div>`;
  }
  if (f.stack) h += `<div class="lbl">Стек вызовов (верх — сверху)</div><div class="frames">${f.stack.length ? f.stack.map((x, j) => `<div class="frame ${j === f.stack.length - 1 ? "top" : ""}">${esc(x)}</div>`).join("") : `<div class="muted">пусто</div>`}</div>`;
  h += renderExtra(f);
  if (f.vars && Object.keys(f.vars).length) h += `<div class="vars">${Object.entries(f.vars).map(([k, v]) => `<span class="var">${esc(k)} = <b>${esc(v)}</b></span>`).join("")}</div>`;
  if (f.map) {
    const keys = Object.keys(f.map);
    h += `<div><div class="lbl">Словарь</div><table class="kv"><tr><th>ключ</th><th>значение</th></tr>${keys.length ? keys.map(k => `<tr class="${String(f.hlKey) === k ? "hl" : ""}"><td>${esc(k)}</td><td>${esc(f.map[k])}</td></tr>`).join("") : `<tr><td colspan="2" class="muted">пусто</td></tr>`}</table></div>`;
  }
  return h;
}
function vizWidget(host, key, onEnd) {
  const sc = VIZ[key]; let frames = [], k = 0, timer = null;
  host.innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 style="margin:0">${esc(sc.title)}</h3>
    <div class="row"><label class="lbl" for="viz-in">${esc(sc.hint)}</label><input type="text" id="viz-in" value="${esc(sc.input)}" style="width:210px"><button class="btn small" id="viz-apply">Применить</button></div></div>
    <div id="viz-err"></div>
    <div class="viz"><pre class="codeview" id="viz-code"></pre><div class="viz-data"><div class="note" id="viz-note"></div><div id="viz-data"></div></div></div>
    <div class="controls" style="margin-top:14px"><button class="btn small" id="v-prev" aria-label="Шаг назад">← Шаг</button><button class="btn small primary" id="v-play">▶ Авто</button><button class="btn small" id="v-next" aria-label="Шаг вперёд">Шаг →</button><button class="btn small ghost" id="v-reset">Сначала</button>
    <input type="range" id="v-range" min="0" value="0" aria-label="Шаг"><span class="lbl" id="v-pos"></span></div></div>`;
  const show = () => {
    const f = frames[k];
    $("#viz-code", host).innerHTML = sc.code.map((ln, j) => `<span class="ln ${j === f.line ? "hl" : ""}">${hlLine(ln) || " "}</span>`).join("");
    $("#viz-note", host).textContent = f.note || "";
    $("#viz-data", host).innerHTML = renderFrame(f, sc);
    $("#v-range", host).max = frames.length - 1; $("#v-range", host).value = k;
    $("#v-pos", host).textContent = `${k + 1} / ${frames.length}`;
    if (k === frames.length - 1 && onEnd) onEnd();
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; $("#v-play", host).textContent = "▶ Авто"; } };
  const build = s => { try { frames = sc.frames(s); k = 0; $("#viz-err", host).innerHTML = ""; show(); } catch (e) { $("#viz-err", host).innerHTML = `<div class="fb bad">${esc(e.message)}</div>`; } };
  $("#v-next", host).onclick = () => { stop(); if (k < frames.length - 1) { k++; show(); } };
  $("#v-prev", host).onclick = () => { stop(); if (k > 0) { k--; show(); } };
  $("#v-reset", host).onclick = () => { stop(); k = 0; show(); };
  $("#v-range", host).oninput = e => { stop(); k = +e.target.value; show(); };
  $("#v-play", host).onclick = () => {
    if (timer) return stop();
    if (k === frames.length - 1) k = 0;
    $("#v-play", host).textContent = "❚❚ Пауза";
    timer = setInterval(() => { if (k < frames.length - 1) { k++; show(); } else stop(); }, 1100);
  };
  $("#viz-apply", host).onclick = () => { stop(); build($("#viz-in", host).value); };
  const onKey = e => { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; if (e.key === "ArrowRight") $("#v-next", host).click(); if (e.key === "ArrowLeft") $("#v-prev", host).click(); };
  document.addEventListener("keydown", onKey);
  build(sc.input);
  return () => { stop(); document.removeEventListener("keydown", onKey); };
}
function renderViz(i) {
  const L = LEVELS[i], l = S.lv[i];
  $("#stage").innerHTML = `<p class="muted" style="margin-top:0">Прокрути алгоритм до конца хотя бы один раз — шагами (← →) или автовоспроизведением. Затем введи свои данные и посмотри, как меняется ход.</p><div id="vz"></div>
    <div class="card-nav"><span class="muted" id="viz-status">${l.stage > 1 ? "Интерактив пройден." : "Дойди до последнего шага, чтобы открыть задания."}</span><button class="btn primary" id="to-tasks" ${l.stage > 1 ? "" : "disabled"}>К заданиям →</button></div>`;
  cleanup = vizWidget($("#vz"), L.viz, () => {
    if (l.stage < 2) { l.viz = true; advance(i, 2); $("#to-tasks").disabled = false; $("#viz-status").textContent = "Интерактив пройден."; const tabs = app().querySelectorAll(".stage"); tabs[2].disabled = false; tabs[1].classList.add("done"); }
  });
  $("#to-tasks").onclick = () => { VIEW.stage = 2; if (cleanup) { cleanup(); cleanup = null; } renderLevel(); };
}

/* ---------- PYODIDE RUNNER ---------- */
const HARNESS = String.raw`
import json, sys, io, time, math, copy, traceback
def _norm(v, mode):
    if mode == "sorted": return sorted(v)
    if mode == "groups": return sorted(sorted(g) for g in v)
    return v
def _eq(a, b, mode):
    if mode == "float_list":
        try: return len(a) == len(b) and all(math.isclose(float(x), float(y), rel_tol=1e-6, abs_tol=1e-9) for x, y in zip(a, b))
        except Exception: return False
    if mode == "float":
        try: return math.isclose(float(a), float(b), rel_tol=1e-6, abs_tol=1e-9)
        except Exception: return False
    try: return _norm(a, mode) == _norm(b, mode)
    except Exception: return False
_SRC = [""]
def _fmt():
    et, ev, tb = sys.exc_info()
    src = _SRC[0].split("\n")
    lines = []
    for fr in traceback.extract_tb(tb):
        if fr.filename == "<решение>":
            code = src[fr.lineno - 1].strip() if 0 < fr.lineno <= len(src) else ""
            lines.append("  строка %d: %s" % (fr.lineno, code))
    hint = ""
    if et is RecursionError: hint = "\nПодсказка: слишком глубокая рекурсия — проверь базовый случай или перепиши на явный стек."
    return "\n".join(lines + ["%s: %s" % (et.__name__, ev)]) + hint
def _load(src, fn):
    _SRC[0] = src
    g = {"__name__": "__main__"}
    exec(compile(src, "<решение>", "exec"), g)
    f = g.get(fn)
    if not callable(f): raise NameError("не найдена функция %s — проверь её имя" % fn)
    return f
def run_tests(src, fn, tests_json, mode):
    tests = json.loads(tests_json)
    out = io.StringIO(); old = sys.stdout; sys.stdout = out
    try:
        try: f = _load(src, fn)
        except Exception: return json.dumps({"error": _fmt(), "stdout": out.getvalue()[:10000]})
        res = []
        for t in tests:
            try:
                got = f(*copy.deepcopy(t["args"]))
                res.append({"ok": _eq(got, t["exp"], mode), "got": repr(got)})
            except Exception:
                res.append({"ok": False, "err": _fmt()})
        return json.dumps({"results": res, "stdout": out.getvalue()[:10000]})
    finally:
        sys.stdout = old
def run_custom(src, fn, args_json):
    out = io.StringIO(); old = sys.stdout; sys.stdout = out
    try:
        try:
            f = _load(src, fn)
            got = f(*json.loads(args_json))
            return json.dumps({"got": repr(got), "stdout": out.getvalue()[:10000]})
        except Exception: return json.dumps({"error": _fmt(), "stdout": out.getvalue()[:10000]})
    finally:
        sys.stdout = old
def time_call(src, fn, gen, repeat=1):
    g = {}; exec(gen, g); args = g["ARGS"]
    old = sys.stdout; sys.stdout = io.StringIO()
    try:
        try: f = _load(src, fn)
        except Exception: return json.dumps({"error": _fmt()})
        t0 = time.perf_counter()
        try:
            for _ in range(repeat): f(*args)
        except Exception: return json.dumps({"error": _fmt()})
        return json.dumps({"t": time.perf_counter() - t0})
    finally:
        sys.stdout = old
`;
const WORKER_SRC = `
let py = null;
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.kind === "init") {
      importScripts(m.base + "pyodide.js");
      const r = await fetch(m.base + "python_stdlib.zip.txt");
      if (!r.ok) throw new Error("стандартная библиотека не загрузилась (" + r.status + ")");
      const b64 = (await r.text()).trim(), bin = new Uint8Array(b64.length * 3 / 4 - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0));
      const raw = atob(b64); for (let i = 0; i < bin.length; i++) bin[i] = raw.charCodeAt(i);
      const realFetch = self.fetch.bind(self);
      self.fetch = (u, ...a) => String(u).includes("python_stdlib.zip") && !String(u).endsWith(".txt") ? Promise.resolve(new Response(bin, { headers: { "Content-Type": "application/zip" } })) : realFetch(u, ...a);
      py = await loadPyodide({ indexURL: m.base });
      py.runPython(m.harness);
      self.postMessage({ id: m.id, ok: true }); return;
    }
    const fn = py.globals.get(m.call);
    const r = fn(...m.args);
    self.postMessage({ id: m.id, ok: true, data: JSON.parse(r) });
  } catch (err) { self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) }); }
};`;
const PY = {
  w: null, ready: null, seq: 0, pending: new Map(), status: "idle",
  base() { return new URL("py/", location.href).href; },
  start() {
    if (this.ready) return this.ready;
    this.status = "loading";
    this.ready = new Promise((res, rej) => {
      try {
        const blob = new Blob([WORKER_SRC], { type: "text/javascript" });
        this.w = new Worker(URL.createObjectURL(blob));
      } catch (e) { this.ready = null; this.status = "error"; return rej(new Error("Браузер не дал запустить фоновый поток для Python.")); }
      this.w.onmessage = ev => { const p = this.pending.get(ev.data.id); if (p) { this.pending.delete(ev.data.id); clearTimeout(p.t); ev.data.ok ? p.res(ev.data.data) : p.rej(new Error(ev.data.error)); } };
      this.w.onerror = ev => { ev.preventDefault && ev.preventDefault(); };
      this.call("init", [], 120000, { kind: "init", base: this.base(), harness: HARNESS })
        .then(() => { this.status = "ready"; res(); }, e => { this.status = "error"; this.ready = null; this.kill(); rej(new Error("Не удалось загрузить Python (Pyodide). Проверь подключение к интернету и обнови страницу. " + e.message)); });
    });
    return this.ready;
  },
  call(name, args, timeout, raw) {
    const id = ++this.seq;
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.pending.delete(id); this.kill(); rej(Object.assign(new Error("timeout"), { timeout: true })); }, timeout);
      this.pending.set(id, { res, rej, t });
      this.w.postMessage(raw ? { ...raw, id } : { id, call: name, args });
    });
  },
  kill() { if (this.w) this.w.terminate(); this.w = null; this.ready = null; this.status = "idle"; this.pending.forEach(p => { clearTimeout(p.t); p.rej(new Error("остановлено")); }); this.pending.clear(); },
  async run(name, args, timeout = 5000) { await this.start(); return this.call(name, args, timeout); }
};

/* code runner UI shared by tasks and interview */
function codeRunner(host, task, opts) {
  const key = (opts.prefix || "") + task.id;
  const initial = S.code[key] || (task.type === "gap" ? "" : task.starter);
  const isGap = task.type === "gap";
  host.innerHTML = `${isGap ? `<pre class="codeview">${task.template.split("\n").map(l => `<span class="ln">${l.includes("____") ? `<b style="color:var(--mark)">${esc(l)}</b>` : hlLine(l) || " "}</span>`).join("")}</pre>
      <label class="lbl" for="gap-in">Строка вместо ____ (без отступа)</label><input type="text" id="gap-in" style="width:100%;font-family:var(--f-mono)" value="${esc(initial)}" spellcheck="false" autocomplete="off">`
    : `<label class="lbl" for="ed">Решение на Python 3 — функция <code>${esc(task.fn)}</code></label><textarea class="editor" id="ed" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(initial)}</textarea>`}
    <div class="row" style="margin-top:10px"><button class="btn" id="run">▶ Запустить на примерах</button><button class="btn primary" id="submit">Отправить</button><span id="py-st" class="muted" style="font-size:14px"></span></div>
    <details style="margin-top:10px"><summary class="lbl" style="cursor:pointer">Свой ввод</summary><div class="row" style="margin-top:6px"><input type="text" id="cust" style="flex:1;min-width:200px;font-family:var(--f-mono)" placeholder='Аргументы как список JSON, например: [[1, 2, 3], 3]'><button class="btn small" id="cust-run">Выполнить</button></div></details>
    <div class="results" id="res"></div>`;
  const ed = $("#ed", host), gi = $("#gap-in", host);
  const src = () => isGap ? task.template.replace(/^(\s*)____/m, (m, ind) => ind + gi.value.trim()) : ed.value;
  const persist = () => { S.code[key] = isGap ? gi.value : ed.value; save(); };
  if (ed) {
    ed.addEventListener("keydown", e => {
      if (e.key === "Tab") { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText("    ", s, ed.selectionEnd, "end"); }
      if (e.key === "Enter") {
        e.preventDefault(); const s = ed.selectionStart, line = ed.value.slice(0, s).split("\n").pop();
        let ind = (line.match(/^\s*/) || [""])[0]; if (/:\s*$/.test(line)) ind += "    ";
        ed.setRangeText("\n" + ind, s, ed.selectionEnd, "end");
      }
    });
    ed.addEventListener("input", persist);
  } else gi.addEventListener("input", persist);
  const st = $("#py-st", host), res = $("#res", host);
  const busy = on => { $("#run", host).disabled = on; $("#submit", host).disabled = on; };
  const loadMsg = () => { if (PY.status !== "ready") st.innerHTML = `<span class="spin"></span> Загружаю Python в браузере (~13 МБ, один раз)…`; };
  const showErr = e => {
    st.textContent = "";
    res.innerHTML = e.timeout ? `<div class="res bad"><b>Превышено время (5 с).</b> Возможно, бесконечный цикл. Python перезапущен.</div>` : `<div class="res bad">${esc(e.message)}</div>`;
  };
  const showResults = (r, tests, all) => {
    if (r.error) { res.innerHTML = `<div class="res bad"><b>Ошибка в коде</b><pre>${esc(r.error)}</pre></div>`; return false; }
    let html = "", okAll = true;
    r.results.forEach((x, j) => {
      const t = tests[j]; okAll = okAll && x.ok;
      if (t.hidden) html += `<div class="res ${x.ok ? "ok" : "bad"}">Скрытый тест ${j + 1}${t.case ? ` (${esc(t.case)})` : ""}: ${x.ok ? "пройден" : x.err ? "ошибка выполнения" : "неверный ответ"}</div>`;
      else html += `<div class="res ${x.ok ? "ok" : "bad"}">${x.ok ? "✓" : "✗"} ${esc(task.fn)}(${t.args.map(a => JSON.stringify(a)).join(", ")})<br>ожидалось: ${esc(JSON.stringify(t.exp))}${x.err ? `<pre>${esc(x.err)}</pre>` : `, получено: ${esc(x.got)}`}</div>`;
    });
    if (r.stdout) html += `<div class="res"><b>print:</b><pre>${esc(r.stdout)}</pre></div>`;
    res.innerHTML = html; return okAll;
  };
  $("#run", host).onclick = async () => {
    persist(); busy(true); loadMsg();
    const tests = task.tests.filter(t => !t.hidden);
    try { const r = await PY.run("run_tests", [src(), task.fn, JSON.stringify(tests.map(t => ({ args: t.args, exp: t.exp }))), task.compare || "exact"]); st.textContent = ""; showResults(r, tests); }
    catch (e) { showErr(e); } finally { busy(false); }
  };
  $("#cust-run", host).onclick = async () => {
    persist(); let args;
    try { args = JSON.parse($("#cust", host).value); if (!Array.isArray(args)) throw 0; } catch (e) { res.innerHTML = `<div class="res bad">Аргументы — это JSON-список, например <code>[[1, 2, 3], 3]</code> для двух аргументов.</div>`; return; }
    busy(true); loadMsg();
    try { const r = await PY.run("run_custom", [src(), task.fn, JSON.stringify(args)]); st.textContent = ""; res.innerHTML = r.error ? `<div class="res bad"><pre>${esc(r.error)}</pre></div>` : `<div class="res">Результат: ${esc(r.got)}${r.stdout ? `<pre>${esc(r.stdout)}</pre>` : ""}</div>`; }
    catch (e) { showErr(e); } finally { busy(false); }
  };
  $("#submit", host).onclick = async () => {
    persist(); busy(true); loadMsg(); opts.onSubmit && opts.onSubmit();
    try {
      const r = await PY.run("run_tests", [src(), task.fn, JSON.stringify(task.tests.map(t => ({ args: t.args, exp: t.exp }))), task.compare || "exact"]);
      st.textContent = "";
      const ok = showResults(r, task.tests, true);
      if (!ok) { opts.onFail && opts.onFail(); return; }
      if (task.speed) {
        st.innerHTML = `<span class="spin"></span> Тест на скорость…`;
        const ref = await PY.run("time_call", [task.ref, task.fn, task.speed.gen, task.speed.repeat || 1], 30000);
        const limit = Math.max(1, 20 * (ref.t || 0.05));
        let mine;
        try { mine = await PY.run("time_call", [src(), task.fn, task.speed.gen, task.speed.repeat || 1], Math.ceil(limit * 1000) + 1500); }
        catch (e) { if (!e.timeout) throw e; mine = { t: Infinity }; }
        st.textContent = "";
        if (mine.error) { res.insertAdjacentHTML("beforeend", `<div class="res bad"><b>Тест на скорость: ошибка</b><pre>${esc(mine.error)}</pre></div>`); opts.onFail && opts.onFail(); return; }
        if (!(mine.t <= limit)) {
          res.insertAdjacentHTML("beforeend", `<div class="res bad"><b>Ответы верные, но решение слишком медленное</b> на большом входе (эталон: ${ref.t.toFixed(3)} с, лимит ${limit.toFixed(1)} с). Похоже на лишний внутренний цикл — подумай, какую работу ты делаешь повторно. <button class="btn small" id="again">Повторить замер</button></div>`);
          const again = $("#again", host); if (again) again.onclick = () => $("#submit", host).click();
          opts.onSlow && opts.onSlow(); opts.onFail && opts.onFail(); return;
        }
        res.insertAdjacentHTML("beforeend", `<div class="res ok">✓ Тест на скорость: ${mine.t.toFixed(3)} с (лимит ${limit.toFixed(1)} с)</div>`);
      }
      opts.onPass && opts.onPass();
    } catch (e) { showErr(e); opts.onFail && opts.onFail(); } finally { busy(false); }
  };
}

/* ---------- TASKS ---------- */
const TYPE_RU = { choice: "выбор", complexity: "сложность", predict: "что выведет", bug: "найди баг", order: "порядок", trace: "трассировка", code: "код", gap: "пропуск в коде" };
function taskState(i, id) { const l = S.lv[i]; return l.tasks[id] || (l.tasks[id] = { done: false, h: 0, g: false, t0: Date.now() }); }
function renderTasks(i) {
  const L = LEVELS[i], l = S.lv[i];
  let cur = VIEW.task !== undefined ? VIEW.task : Math.max(0, L.tasks.findIndex(t => !(l.tasks[t.id] && l.tasks[t.id].done)));
  const draw = () => {
    VIEW.task = cur;
    const nDone = L.tasks.filter(t => l.tasks[t.id] && l.tasks[t.id].done).length;
    $("#stage").innerHTML = `<div class="task-layout"><div style="min-width:0"><div class="muted" style="font-size:13px;margin-bottom:6px">Решено ${nDone} из ${L.tasks.length}</div><nav class="tlist" aria-label="Задания">
      ${L.tasks.map((t, j) => { const s = l.tasks[t.id]; return `<button data-t="${j}" class="${j === cur ? "on" : ""}"><span class="ic ${s && s.done ? "ok" : ""}">${s && s.done ? "✓" : j + 1}</span>${esc(t.title)}</button>`; }).join("")}
      </nav>${nDone === L.tasks.length ? `<button class="btn primary" id="to-test" style="margin-top:10px;width:100%">К итоговому тесту →</button>` : ""}</div>
      <article class="card" id="task"></article></div>`;
    $("#stage").querySelectorAll(".tlist button[data-t]").forEach(b => b.onclick = () => { cur = +b.dataset.t; draw(); });
    const tt = $("#to-test"); if (tt) tt.onclick = () => { advance(i, 3); VIEW.stage = 3; renderLevel(); };
    renderTask($("#task"), L.tasks[cur], taskState(i, L.tasks[cur].id), {
      onSolved: () => {
        const allDoneNow = L.tasks.every(t => l.tasks[t.id] && l.tasks[t.id].done);
        if (allDoneNow) advance(i, 3);
        save(); const keep = cur; draw(); cur = keep;
      },
      onHint: () => { l.hints++; save(); },
      next: () => { if (cur < L.tasks.length - 1) { cur++; draw(); window.scrollTo(0, 0); } }
    });
  };
  draw();
}
function renderTask(host, t, st, cb) {
  host.innerHTML = `<div class="type">${TYPE_RU[t.type]}${t.leetcode ? ` · LeetCode ${t.leetcode}` : ""}</div><h2>${esc(t.title)}</h2>
    <p>${md(t.q)}</p><div id="tbody"></div><div id="tfb"></div>
    <div class="row" style="margin-top:6px"><button class="btn small" id="hint-btn">Подсказка (${st.h} из 5)</button><button class="btn small ghost" id="giveup" hidden>Сдаюсь — показать разбор</button>${st.done ? `<button class="btn small primary" id="nxt">Следующее задание →</button>` : ""}</div>
    <div class="hints" id="hints"></div><div id="expl"></div>`;
  const hintsEl = $("#hints", host);
  const drawHints = () => { hintsEl.innerHTML = t.hints.slice(0, st.h).map((h, j) => `<div class="hint"><b>Подсказка ${j + 1}.</b> ${md(h)}</div>`).join(""); $("#hint-btn", host).textContent = `Подсказка (${st.h} из 5)`; $("#hint-btn", host).disabled = st.h >= 5; $("#giveup", host).hidden = st.done || !(st.h >= 3 || Date.now() - (st.t0 || Date.now()) > 600000); };
  const showExpl = () => {
    $("#expl", host).innerHTML = `<div class="expl"><h3>Разбор</h3><p style="margin:0">${md(t.expl)}</p>${t.ref ? `<div class="lbl" style="margin-top:10px">Эталонное решение</div><pre><code>${hl(t.ref.trim())}</code></pre>` : ""}${t.type === "gap" ? `<div class="lbl" style="margin-top:10px">Пропущенная строка</div><pre><code>${hl(t.ref_fill)}</code></pre>` : ""}</div>`;
  };
  $("#hint-btn", host).onclick = () => { if (st.h < 5) { st.h++; cb.onHint(); drawHints(); } };
  $("#giveup", host).onclick = () => { st.g = true; st.done = true; showExpl(); cb.onSolved(); };
  const nx = $("#nxt", host); if (nx) nx.onclick = cb.next;
  drawHints();
  if (st.done) showExpl();
  const fb = (ok, msg) => { $("#tfb", host).innerHTML = `<div class="fb ${ok ? "ok" : "bad"}">${msg}</div>`; };
  const solved = () => { if (!st.done) { st.done = true; fb(true, "Верно!"); showExpl(); setTimeout(cb.onSolved, 900); } };
  const body = $("#tbody", host);
  if (t.type === "choice") {
    const order = shuffle(t.options.map((o, j) => j)); let sel = null;
    body.innerHTML = `<div class="opts">${order.map((j, n) => `<button class="opt" data-j="${j}"><span class="mk">${"АБВГДЕ"[n]}</span><span>${md(t.options[j])}</span></button>`).join("")}</div><button class="btn primary" id="chk">Проверить</button>`;
    body.querySelectorAll(".opt").forEach(b => b.onclick = () => { body.querySelectorAll(".opt").forEach(x => x.classList.remove("sel", "wrong", "right")); b.classList.add("sel"); sel = +b.dataset.j; });
    $("#chk", body).onclick = () => { if (sel === null) return fb(false, "Выбери вариант."); const b = body.querySelector(`.opt[data-j="${sel}"]`); if (sel === t.answer) { b.classList.add("right"); solved(); } else { b.classList.add("wrong"); fb(false, "Неверно. Подумай ещё или открой подсказку."); } };
  } else if (t.type === "complexity") {
    const tOpts = TIMES.slice(0, 7);
    body.innerHTML = `<pre><code>${hl(t.code)}</code></pre><div class="row"><label class="lbl" for="ct">Время</label><select id="ct"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select>
      <label class="lbl" for="cm">Память</label><select id="cm"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select><button class="btn primary" id="chk">Проверить</button></div>`;
    $("#chk", body).onclick = () => { const a = $("#ct", body).value, b = $("#cm", body).value; if (a === t.t && b === t.m) solved(); else fb(false, a === t.t ? "Время верно, память — нет." : b === t.m ? "Память верна, время — нет." : "Неверно. Посчитай, сколько раз выполнится самая внутренняя строка."); };
  } else if (t.type === "predict") {
    body.innerHTML = `<pre><code>${hl(t.code)}</code></pre><div class="row"><label class="lbl" for="pa">Вывод</label><input type="text" id="pa" style="flex:1;min-width:180px;font-family:var(--f-mono)" autocomplete="off"><button class="btn primary" id="chk">Проверить</button></div>`;
    const check = () => { const v = $("#pa", body).value.trim().split(/\s+/).join(" "); if (v === t.answer) solved(); else fb(false, "Неверно. Пройди код по шагам и запиши значения переменных."); };
    $("#chk", body).onclick = check; $("#pa", body).onkeydown = e => { if (e.key === "Enter") check(); };
  } else if (t.type === "bug") {
    let line = null, fix = null;
    body.innerHTML = `<div class="lbl">1. Нажми на строку с ошибкой</div><pre class="codeview pick" id="cv">${t.code.map((l, j) => `<span class="ln" data-l="${j}">${hlLine(l) || " "}</span>`).join("")}</pre>
      <div id="fixes" hidden><div class="lbl">2. Выбери исправление</div><div class="opts">${shuffle(t.fixes.map((f, j) => j)).map(j => `<button class="opt" data-f="${j}"><code>${esc(t.fixes[j])}</code></button>`).join("")}</div></div><button class="btn primary" id="chk">Проверить</button>`;
    body.querySelectorAll(".ln").forEach(s => s.onclick = () => { body.querySelectorAll(".ln").forEach(x => x.classList.remove("sel")); s.classList.add("sel"); line = +s.dataset.l; $("#fixes", body).hidden = false; });
    body.querySelectorAll(".opt").forEach(b => b.onclick = () => { body.querySelectorAll(".opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); fix = +b.dataset.f; });
    $("#chk", body).onclick = () => { if (line === null) return fb(false, "Сначала выбери строку."); if (line !== t.line) return fb(false, "Ошибка в другой строке."); if (fix === null) return fb(false, "Строка верная. Теперь выбери исправление."); if (fix !== t.fix) return fb(false, "Строка верная, а исправление — нет."); solved(); };
  } else if (t.type === "order") {
    let items = shuffle(t.items.map((x, j) => j)); if (items.every((x, j) => x === j)) items.reverse();
    const draw = () => {
      body.innerHTML = `<ol class="order">${items.map((j, n) => `<li><b class="type">${n + 1}</b><span>${md(t.items[j])}</span><button class="btn small" data-u="${n}" aria-label="Выше" ${n === 0 ? "disabled" : ""}>↑</button><button class="btn small" data-d="${n}" aria-label="Ниже" ${n === items.length - 1 ? "disabled" : ""}>↓</button></li>`).join("")}</ol><button class="btn primary" id="chk">Проверить</button>`;
      body.querySelectorAll("[data-u]").forEach(b => b.onclick = () => { const n = +b.dataset.u; [items[n - 1], items[n]] = [items[n], items[n - 1]]; draw(); });
      body.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { const n = +b.dataset.d; [items[n + 1], items[n]] = [items[n], items[n + 1]]; draw(); });
      $("#chk", body).onclick = () => { const wrong = items.findIndex((x, j) => x !== j); if (wrong === -1) solved(); else fb(false, `Позиция ${wrong + 1} неверна. Остальное проверь по порядку.`); };
    };
    draw();
  } else if (t.type === "trace") {
    const normv = v => String(v).trim().replace(/−/g, "-").replace(/^'(.*)'$/, "$1").replace(/\s+/g, " ").toLowerCase();
    body.innerHTML = `<pre><code>${hl(t.code)}</code></pre><div class="tw" style="border:0"><table class="ttable"><tr>${t.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${t.rows.map((r, a) => `<tr>${r.map((v, b) => v === null ? `<td><input type="text" data-a="${a}" data-b="${b}" aria-label="${esc(t.columns[b])}, строка ${a + 1}" autocomplete="off"></td>` : `<td>${esc(String(v).replace(/^-/, "−"))}</td>`).join("")}</tr>`).join("")}</table></div><button class="btn primary" id="chk">Проверить</button>`;
    $("#chk", body).onclick = () => {
      let first = null;
      body.querySelectorAll("input").forEach(inp => { const exp = t.answer[+inp.dataset.a][+inp.dataset.b]; const ok = normv(inp.value) === normv(exp); inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok); if (!ok && !first) first = inp; });
      if (!first) solved(); else { fb(false, `Первая неверная клетка: «${esc(t.columns[+first.dataset.b])}», строка ${+first.dataset.a + 1}. Неверные клетки отмечены красным.`); first.focus(); }
    };
  } else if (t.type === "code" || t.type === "gap") {
    codeRunner(body, t, { onPass: solved, onFail: () => {} });
  }
}

/* ---------- TEST ---------- */
function renderTest(i) {
  const L = LEVELS[i], l = S.lv[i];
  if (!VIEW.testQs) VIEW.testQs = shuffle(L.test.map((q, j) => j)).slice(0, 5);
  const qs = VIEW.testQs, picks = {};
  $("#stage").innerHTML = `<article class="card"><div class="eyebrow">Итоговый тест · 5 вопросов · нужно 4 верных</div><h2>Проверь, что глава усвоена</h2>
    <p class="muted">Без подсказок. При ошибке покажем разбор и дадим другой набор вопросов.${l.tries ? ` Попыток было: ${l.tries}.` : ""}</p>
    ${qs.map((j, n) => { const q = L.test[j]; const ord = shuffle(q.options.map((o, k) => k)); return `<div style="margin-top:18px"><b>${n + 1}. ${md(q.q)}</b><div class="opts">${ord.map(k => `<button class="opt" data-q="${n}" data-k="${k}">${md(q.options[k])}</button>`).join("")}</div></div>`; }).join("")}
    <div id="tres"></div><div class="row"><button class="btn primary" id="tsub">Сдать тест</button></div></article>`;
  $("#stage").querySelectorAll(".opt").forEach(b => b.onclick = () => { const n = +b.dataset.q; $("#stage").querySelectorAll(`.opt[data-q="${n}"]`).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); picks[n] = +b.dataset.k; });
  $("#tsub").onclick = () => {
    if (Object.keys(picks).length < qs.length) { $("#tres").innerHTML = `<div class="fb bad">Ответь на все ${qs.length} вопросов.</div>`; return; }
    let score = 0;
    qs.forEach((j, n) => { const ok = picks[n] === L.test[j].answer; if (ok) score++; $("#stage").querySelectorAll(`.opt[data-q="${n}"]`).forEach(x => { const k = +x.dataset.k; if (k === L.test[j].answer) x.classList.add("right"); else if (k === picks[n]) x.classList.add("wrong"); x.disabled = true; }); });
    l.tries++;
    if (score >= 4) {
      const first = l.tries === 1;
      l.stars = first && l.hints <= 3 ? 3 : l.hints <= 10 ? 2 : 1; l.day = l.day || today(); advance(i, 4); save();
      const last = i === LEVELS.length - 1;
      $("#tres").innerHTML = `<div class="fb ok">Результат ${score} из 5 — глава пройдена! ${stars(l.stars)}</div>${last ? `<p><b>Все главы пройдены — алгособес открыт.</b></p>` : ""}`;
      $("#tsub").outerHTML = last ? `<button class="btn primary" id="tnext">Перейти к алгособесу →</button>` : `<button class="btn primary" id="tnext">Следующая глава →</button>`;
      $("#tnext").onclick = () => last ? go({ name: "iv" }) : go({ name: "level", i: i + 1 });
      const tabs = app().querySelectorAll(".stage"); tabs[3].classList.add("done");
    } else {
      save();
      $("#tres").innerHTML = `<div class="fb bad">Результат ${score} из 5 — нужно 4. Правильные ответы отмечены зелёным. Перечитай карточки урока по этим темам и попробуй ещё раз.</div>`;
      $("#tsub").outerHTML = `<button class="btn primary" id="tretry">Пройти ещё раз (другой набор)</button>`;
      $("#tretry").onclick = () => { VIEW.testQs = null; renderTest(i); window.scrollTo(0, 0); };
    }
    save();
  };
}

/* ---------- INTERVIEW ---------- */
const IV_STEPS = ["Понять условие", "Примеры", "Брутфорс", "Оптимизация", "Код", "Тест и сложность"];
let IV = null;
function newSession() {
  const recent = new Set(S.iv.filter(x => x.ids && today() - x.day < 7).flatMap(x => x.ids));
  const pick = lvl => { const pool = IVS.filter(p => p.level === lvl); const fresh = pool.filter(p => !recent.has(p.id)); return shuffle(fresh.length ? fresh : pool)[0]; };
  return { probs: [pick("E"), pick("M")], cur: 0, step: 0, end: Date.now() + 45 * 60000, data: [{}, {}].map(() => ({ asked: [], example: null, brute: null, tech: null, submits: 0, ranOwn: false, solved: false, slow: false, hints: 0, final: null, penalty: 0 })), done: false };
}
function renderInterview() {
  if (!allDone()) return go({ name: "home" });
  if (!IV || IV.done && VIEW.fresh) { IV = newSession(); VIEW.fresh = false; }
  if (IV.done) return renderReport();
  const P = IV.probs[IV.cur], D = IV.data[IV.cur];
  setCrumbs(`Алгособес · задача ${IV.cur + 1} из 2`);
  app().innerHTML = `<div class="ivgrid"><aside class="steps">
      <div class="panel" style="padding:14px;margin-bottom:8px"><div class="lbl">Осталось времени</div><div class="timer" id="timer">45:00</div><div class="muted" style="font-size:13px">Задача ${IV.cur + 1} из 2 · ${P.level === "E" ? "easy" : "medium"}</div></div>
      ${IV_STEPS.map((s, k) => `<div class="step ${k === IV.step ? "on" : ""} ${k < IV.step ? "done" : ""}"><span class="d">${k < IV.step ? "✓" : k + 1}</span>${s}</div>`).join("")}
      <button class="btn small ghost" id="iv-quit" style="margin-top:10px">Завершить досрочно</button></aside>
    <article class="card"><div class="type">Собеседование · ${P.level === "E" ? "easy" : "medium"} · LeetCode ${P.leetcode}</div><h2>${esc(P.title)}</h2><p>${md(P.statement)}</p><div id="ivbody"></div><div id="ivfb"></div></article></div>`;
  const tick = () => { const left = Math.max(0, IV.end - Date.now()), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60; const el = $("#timer"); if (!el) return; el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; el.classList.toggle("low", left < 5 * 60000); if (left <= 0) finishIV("time"); };
  tick(); const timer = setInterval(tick, 1000); cleanup = () => clearInterval(timer);
  $("#iv-quit").onclick = () => finishIV("quit");
  const body = $("#ivbody"), fb = (ok, msg) => { $("#ivfb").innerHTML = msg ? `<div class="fb ${ok ? "ok" : ok === null ? "info" : "bad"}">${msg}</div>` : ""; };
  const next = () => { IV.step++; fb(true, ""); if (cleanup) { cleanup(); cleanup = null; } renderInterview(); window.scrollTo(0, 0); };
  const step = IV.step;
  if (step === 0) {
    const qs = P.clarify;
    body.innerHTML = `<p class="muted">Как на реальном собесе: прежде чем решать, уточни условие. Отметь вопросы, которые задал бы интервьюеру, и нажми «Задать».</p>
      <div class="qa">${qs.map((q, k) => `<label><input type="checkbox" data-k="${k}"><span>${esc(q[0])}</span></label><div class="answer" id="ans${k}" hidden></div>`).join("")}</div>
      <button class="btn primary" id="ask">Задать вопросы</button>`;
    $("#ask", body).onclick = () => {
      const sel = [...body.querySelectorAll("input:checked")].map(x => +x.dataset.k);
      if (!sel.length) return fb(false, "Выбери хотя бы один вопрос.");
      D.asked = sel; sel.forEach(k => { const a = $("#ans" + k, body); a.hidden = false; a.textContent = "Интервьюер: " + qs[k][1]; });
      const missed = qs.map((q, k) => q[2] && !sel.includes(k) ? q[0] : null).filter(Boolean);
      body.querySelectorAll("input").forEach(x => x.disabled = true);
      fb(missed.length ? null : true, missed.length ? `Ключевые вопросы, которые стоило задать: ${missed.map(esc).join("; ")}. Интервьюер всё равно отвечает: ${missed.map((m, j) => esc(qs.find(q => q[0] === m)[1])).join(" ")}` : "Все ключевые вопросы заданы.");
      $("#ask", body).outerHTML = `<button class="btn primary" id="go">Дальше: примеры →</button>`; $("#go", body).onclick = next;
    };
  } else if (step === 1) {
    const ex = P.tests[0];
    body.innerHTML = `<p class="muted">Придумай свой пример (лучше краевой) и посчитай ответ руками. Пример из условия: <code>${esc(P.fn)}(${ex.args.map(a => JSON.stringify(a)).join(", ")})</code> → <code>${esc(JSON.stringify(ex.exp))}</code>.</p>
      <div class="row"><label class="lbl" for="exa">Аргументы (JSON-список)</label><input type="text" id="exa" style="flex:1;min-width:200px;font-family:var(--f-mono)" placeholder='${esc(JSON.stringify(ex.args))}'></div>
      <div class="row" style="margin-top:8px"><label class="lbl" for="exe">Ожидаемый ответ (JSON)</label><input type="text" id="exe" style="flex:1;min-width:120px;font-family:var(--f-mono)"></div>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="chk">Проверить пример</button><button class="btn ghost" id="skip">Пропустить</button><span id="exst" class="muted"></span></div>`;
    $("#skip", body).onclick = () => { D.example = false; next(); };
    $("#chk", body).onclick = async () => {
      let args, exp;
      try { args = JSON.parse($("#exa", body).value); exp = JSON.parse($("#exe", body).value); if (!Array.isArray(args)) throw 0; } catch (e) { return fb(false, "Аргументы — JSON-список (например <code>[[1, 2], 3]</code>), ответ — JSON-значение (например <code>true</code>, <code>3</code>, <code>[0, 1]</code>)."); }
      $("#exst", body).innerHTML = PY.status === "ready" ? "" : `<span class="spin"></span> Загружаю Python…`;
      try {
        const r = await PY.run("run_tests", [P.ref, P.fn, JSON.stringify([{ args, exp }]), P.compare || "exact"]);
        $("#exst", body).textContent = "";
        if (r.error) return fb(false, "Пример не подходит к функции: " + esc(r.error));
        if (r.results[0].ok) { D.example = true; fb(true, "Пример верный. Он пригодится на шаге проверки."); D.myExample = args; $("#chk", body).outerHTML = `<button class="btn primary" id="go">Дальше: брутфорс →</button>`; $("#go", body).onclick = next; }
        else fb(false, `Ответ неверный: эталон возвращает ${esc(r.results[0].got)}. Пересчитай руками.`);
      } catch (e) { $("#exst", body).textContent = ""; fb(false, esc(e.message)); }
    };
  } else if (step === 2 || step === 3) {
    const isB = step === 2, cfg = isB ? P.brute : P.tech; let sel = null;
    const ord = shuffle(cfg.options.map((o, k) => k));
    const tOpts = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(n⁴)", "O(2ⁿ)", "O(n·k)", "O(k)"];
    body.innerHTML = `<p class="muted">${isB ? "Назови самое простое решение и его сложность — это точка отсчёта." : "Найди узкое место брутфорса и подбери технику. Согласуй идею до кода."}</p>
      <div class="opts">${ord.map(k => `<button class="opt" data-k="${k}">${esc(cfg.options[k])}</button>`).join("")}</div>
      <div class="row"><label class="lbl" for="it">Время</label><select id="it"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select>
      ${isB ? "" : `<label class="lbl" for="im">Память</label><select id="im"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select>`}
      <button class="btn primary" id="chk">${isB ? "Предложить брутфорс" : "Предложить идею"}</button></div>`;
    body.querySelectorAll(".opt").forEach(b => b.onclick = () => { body.querySelectorAll(".opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = +b.dataset.k; });
    let attempts = 0;
    $("#chk", body).onclick = () => {
      const tv = $("#it", body).value, mv = isB ? cfg.t && "" : $("#im", body).value;
      if (sel === null || !tv || (!isB && !mv)) return fb(false, "Выбери идею и сложность.");
      attempts++;
      const okIdea = sel === cfg.answer, okT = tv === cfg.t, okM = isB || mv === cfg.m;
      if (okIdea && okT && okM) {
        D[isB ? "brute" : "tech"] = attempts === 1;
        fb(true, isB ? "Интервьюер: «Хорошо, это рабочий вариант. Можно быстрее?»" : "Интервьюер: «Согласен, пиши код».");
        $("#chk", body).outerHTML = `<button class="btn primary" id="go">Дальше →</button>`; $("#go", body).onclick = next;
      } else {
        D.penalty++;
        const msg = !okIdea ? (isB ? "Интервьюер: «Это не самое прямолинейное решение. Что первым приходит в голову?»" : "Интервьюер: «Не уверен, что это сработает. Подумай, какой сигнал есть в условии.»") : !okT ? "Интервьюер: «Идея верная, но перепроверь сложность по времени.»" : "Интервьюер: «Идея верная, а сколько дополнительной памяти она требует?»";
        fb(false, msg + (attempts >= 2 ? ` Подсказка: ${esc(P.hints[Math.min(attempts - 1, 2)])}` : ""));
      }
    };
  } else if (step === 4) {
    body.innerHTML = `<div class="row" style="margin-bottom:8px"><button class="btn small" id="ivh">Подсказка интервьюера (${D.hints} из 5, снижает оценку)</button></div><div id="ivhints" class="hints" style="margin:0 0 12px"></div><div id="ivcode"></div>`;
    const dh = () => { $("#ivhints", body).innerHTML = P.hints.slice(0, D.hints).map((h, j) => `<div class="hint"><b>${j + 1}.</b> ${md(h)}</div>`).join(""); $("#ivh", body).textContent = `Подсказка интервьюера (${D.hints} из 5, снижает оценку)`; $("#ivh", body).disabled = D.hints >= 5; };
    $("#ivh", body).onclick = () => { D.hints++; dh(); }; dh();
    const task = { ...P, type: "code", id: P.id };
    codeRunner($("#ivcode", body), task, { prefix: "iv:", onSubmit: () => { D.submits++; }, onSlow: () => { D.slow = true; },
      onPass: () => { D.solved = true; fb(true, "Все тесты и тест на скорость пройдены."); $("#ivfb").insertAdjacentHTML("beforeend", `<button class="btn primary" id="go">Дальше: проверка →</button>`); $("#go").onclick = next; } });
    const runBtn = $("#ivcode #run", body); if (runBtn) runBtn.addEventListener("click", () => { if (D.submits === 0) D.ranOwn = true; });
    const custBtn = $("#ivcode #cust-run", body); if (custBtn) custBtn.addEventListener("click", () => { if (D.submits === 0) D.ranOwn = true; });
    body.insertAdjacentHTML("beforeend", `<button class="btn ghost small" id="giveiv" style="margin-top:12px">Не успеваю — описать решение словами и перейти дальше</button>`);
    $("#giveiv", body).onclick = () => { D.solved = false; next(); };
  } else if (step === 5) {
    const tOpts = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(n⁴)", "O(2ⁿ)", "O(n·k)", "O(k)"];
    body.innerHTML = `<p class="muted">Назови итоговую сложность своего решения — так, как сказал бы интервьюеру в конце.</p>
      <div class="row"><label class="lbl" for="ft">Время</label><select id="ft"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select><label class="lbl" for="fm">Память</label><select id="fm"><option value="">—</option>${tOpts.map(x => `<option>${x}</option>`).join("")}</select></div>
      <div class="qa" style="margin-top:14px"><label><input type="checkbox" id="sa1"><span>Я проговаривал решение вслух по ходу</span></label><label><input type="checkbox" id="sa2"><span>Я объяснил, почему алгоритм корректен</span></label></div>
      <button class="btn primary" id="fin">${IV.cur === 0 ? "Завершить задачу и перейти ко второй →" : "Завершить собеседование"}</button>`;
    $("#fin", body).onclick = () => {
      const tv = $("#ft", body).value, mv = $("#fm", body).value;
      if (!tv || !mv) return fb(false, "Выбери время и память.");
      D.final = tv === P.tech.t && mv === P.tech.m; D.self = [$("#sa1", body).checked, $("#sa2", body).checked];
      if (IV.cur === 0) { IV.cur = 1; IV.step = 0; if (cleanup) { cleanup(); cleanup = null; } renderInterview(); window.scrollTo(0, 0); }
      else finishIV("done");
    };
  }
}
function finishIV(why) {
  if (!IV || IV.done) return;
  if (cleanup) { cleanup(); cleanup = null; }
  IV.done = true; IV.why = why;
  const rep = gradeIV();
  S.iv.push({ day: today(), ids: IV.probs.map(p => p.id), titles: IV.probs.map(p => p.title), verdict: rep.verdict });
  save(); renderReport(); window.scrollTo(0, 0);
}
function gradeIV() {
  const sig = v => v >= 2 ? "сильный" : v >= 1 ? "средний" : "слабый";
  const rows = IV.probs.map((P, k) => {
    const D = IV.data[k];
    const solve = D.solved ? (D.hints <= 1 && D.tech ? 2 : D.hints <= 3 ? 1 : 0) : 0;
    const comm = (D.asked.filter(j => P.clarify[j][2]).length === P.clarify.filter(q => q[2]).length ? 1 : 0) + (D.example ? 0.5 : 0) + (D.brute ? 0.5 : 0);
    const code = D.solved ? (D.submits <= 1 && !D.slow ? 2 : D.submits <= 3 ? 1 : 0) : 0;
    const test = (D.ranOwn ? 1 : 0) + (D.final ? 1 : 0);
    return { P, D, solve, comm, code, test };
  });
  const avg = f => rows.reduce((s, r) => s + r[f], 0) / rows.length;
  const crit = [["Решение задачи", avg("solve"), "задачи решены, сколько подсказок понадобилось, нашлась ли техника с первой попытки"],
    ["Коммуникация", avg("comm"), "ключевые уточняющие вопросы, свой пример, брутфорс до оптимизации"],
    ["Код", avg("code"), "тесты с первой отправки, тест на скорость"],
    ["Тестирование", avg("test"), "запуск на примерах до отправки, верно названная итоговая сложность"]];
  const strong = crit.filter(c => c[1] >= 1.5).length, weak = crit.filter(c => c[1] < 1).length;
  const verdict = rows.every(r => r.D.solved) && weak === 0 && strong >= 2 ? "hire" : "no hire";
  return { rows, crit: crit.map(c => [c[0], sig(c[1]), c[2]]), verdict };
}
function renderReport() {
  setCrumbs("Алгособес · отчёт");
  const rep = gradeIV();
  app().innerHTML = `<div class="eyebrow">Алгособес · ${IV.why === "time" ? "время вышло" : IV.why === "quit" ? "завершено досрочно" : "завершено"}</div>
    <h1>Вердикт: ${rep.verdict === "hire" ? "<span style='color:var(--ok)'>hire</span>" : "<span style='color:var(--bad)'>no hire</span>"}</h1>
    <p class="lead">${rep.verdict === "hire" ? "Обе задачи решены, сигналы по критериям в основном сильные." : "Посмотри, какие критерии просели, и вернись к нужным главам. Новая сессия подберёт другие задачи."}</p>
    <div class="panel" style="margin-top:20px"><h3>Оценка по 4 критериям интервьюера</h3><div class="tw"><table class="report"><tr><th>Критерий</th><th>Сигнал</th><th>Что учитывалось</th></tr>
    ${rep.crit.map(c => `<tr><td>${c[0]}</td><td class="sig"><span class="pill ${c[1] === "сильный" ? "ok" : c[1] === "средний" ? "warn" : "bad"}">${c[1]}</span></td><td class="muted">${c[2]}</td></tr>`).join("")}</table></div></div>
    <div class="grid2" style="margin-top:16px">${rep.rows.map(r => `<div class="panel"><div class="type">${r.P.level === "E" ? "easy" : "medium"} · LeetCode ${r.P.leetcode}</div><h3>${esc(r.P.title)}</h3>
      <p class="muted" style="margin:0 0 10px">${r.D.solved ? "Решена" : "Не решена"} · отправок: ${r.D.submits} · подсказок: ${r.D.hints}${r.D.slow ? " · было слишком медленно" : ""}</p>
      <details><summary class="lbl" style="cursor:pointer">Разбор и эталон</summary><p>${md(r.P.expl)}</p><p class="muted">Оптимальная сложность: время ${r.P.tech.t}, память ${r.P.tech.m}.</p><pre><code>${hl(r.P.ref.trim())}</code></pre></details></div>`).join("")}</div>
    <div class="row" style="margin-top:20px"><button class="btn primary" id="again">Новая сессия</button><button class="btn" id="home">На главную</button></div>`;
  $("#again").onclick = () => { VIEW.fresh = true; go({ name: "iv", fresh: true }); };
  $("#home").onclick = () => go({ name: "home" });
}

/* ---------- boot ---------- */
function applyTheme() { try { const t = localStorage.getItem("algoquest-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {} }
$("#theme-btn").onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const nx = cur === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = nx; try { localStorage.setItem("algoquest-theme", nx); } catch (e) {}
};
$("#home-btn").onclick = () => go({ name: "home" });
$("#save-btn").onclick = openCodeDialog;
applyTheme(); load(); render();
