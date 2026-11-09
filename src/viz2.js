/* ---------- VISUALIZER: parts IV–VIII ---------- */
function parseTreeList(s) {
  const a = s.replace(/[\[\]]/g, "").split(/[\s,]+/).filter(Boolean).map(x => /^(null|none|-)$/i.test(x) ? null : Number(x));
  if (!a.length || a.some(x => x !== null && !Number.isInteger(x))) throw new Error("Числа через запятую, пустой узел — null.");
  if (a.length > 31) throw new Error("Не больше 31 элемента (5 уровней).");
  return a;
}
function parseEdges(s, needW) {
  const out = s.split(/[,;]+/).map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^(\d+)\s*[-–>]\s*(\d+)(?:\s*:\s*(\d+))?$/);
    if (!m || (needW && m[3] === undefined)) throw new Error(needW ? "Рёбра вида 0-1:4 через запятую." : "Рёбра вида 0-1 через запятую.");
    return [+m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
  });
  const n = Math.max(...out.flatMap(e => [e[0], e[1]])) + 1;
  if (n > 10) throw new Error("Вершины от 0 до 9."); if (out.length > 16) throw new Error("Не больше 16 рёбер.");
  return [n, out];
}
const B = (label, items, mark, extra) => Object.assign({ label, items, mark: mark || [] }, extra || {});

VIZ.mstack = {
  title: "Монотонный стек: дни до потепления", input: "73, 74, 75, 71, 69, 72, 76, 73", hint: "Температуры",
  code: ["def daily_temperatures(t):", "    res = [0] * len(t)", "    st = []", "    for i, x in enumerate(t):", "        while st and t[st[-1]] < x:", "            j = st.pop()", "            res[j] = i - j", "        st.append(i)", "    return res"],
  frames(s) {
    const t = parseList(s), res = t.map(() => 0), st = [], fr = [];
    const snap = (i, line, note, mk) => fr.push(F({ arr: t, ptr: i >= 0 ? { i } : {}, mark: mk || [], boxes: [B("стек: индекс:t", st.map(j => `${j}:${t[j]}`), [st.length - 1]), B("res", res.slice(), mk)], line, note }));
    snap(-1, 2, "Стек хранит индексы дней, ещё не нашедших тёплый день; температуры в нём убывают.");
    t.forEach((x, i) => {
      snap(i, 3, `День ${i}: ${x}°.`);
      while (st.length && t[st[st.length - 1]] < x) { const j = st.pop(); res[j] = i - j; snap(i, 6, `${t[j]} < ${x}: для дня ${j} ответ ${i} − ${j} = ${i - j}.`, [j]); }
      st.push(i); snap(i, 7, `Кладём ${i} в стек. Каждый индекс входит и выходит один раз — O(n).`);
    });
    snap(-1, 8, `Ответ: [${res.join(", ")}]. Оставшиеся в стеке дни тёплого дня не дождались — 0.`);
    return fr;
  }
};
VIZ.dequemax = {
  title: "Максимум в окне: монотонный дек", input: "1, 3, -1, -3, 5, 3, 6, 7", hint: "Числа; окно k = 3",
  code: ["def max_sliding_window(nums, k):", "    dq, res = deque(), []", "    for i, x in enumerate(nums):", "        while dq and nums[dq[-1]] <= x:", "            dq.pop()", "        dq.append(i)", "        if dq[0] <= i - k:", "            dq.popleft()", "        if i >= k - 1:", "            res.append(nums[dq[0]])", "    return res"],
  frames(s) {
    const a = parseList(s), k = 3, dq = [], res = [], fr = [];
    const snap = (i, line, note) => fr.push(F({ arr: a, ptr: { i }, range: [Math.max(0, i - k + 1), i], boxes: [B("дек (индекс:значение), начало слева", dq.map(j => `${j}:${a[j]}`), [0]), B("res", res.slice())], line, note }));
    a.forEach((x, i) => {
      while (dq.length && a[dq[dq.length - 1]] <= x) { const j = dq.pop(); snap(i, 4, `${a[j]} ≤ ${x} — он больше никогда не станет максимумом, выбрасываем с конца.`); }
      dq.push(i); snap(i, 5, `Добавили индекс ${i}. Значения в деке убывают.`);
      if (dq[0] <= i - k) { const j = dq.shift(); snap(i, 7, `Индекс ${j} вышел из окна — убираем с начала.`); }
      if (i >= k - 1) { res.push(a[dq[0]]); snap(i, 9, `Окно [${i - k + 1}..${i}]: максимум в начале дека — ${a[dq[0]]}.`); }
    });
    fr.push(F({ arr: a, boxes: [B("res", res)], line: 10, note: `Ответ: [${res.join(", ")}]. O(n).` }));
    return fr;
  }
};
VIZ.llrev = {
  title: "Разворот связного списка", input: "1, 2, 3, 4, 5", hint: "Значения узлов (до 8)",
  code: ["def reverse_list(head):", "    prev, cur = None, head", "    while cur:", "        nxt = cur.next", "        cur.next = prev", "        prev, cur = cur, nxt", "    return prev"],
  frames(s) {
    const v = parseList(s); if (v.length > 8) throw new Error("Не больше 8 узлов."); const n = v.length, nx = v.map((_, i) => i + 1 < n ? i + 1 : -1), fr = [];
    let prev = -1, cur = 0;
    const snap = (line, note, extra) => fr.push(F({ ll: { vals: v, next: nx.slice(), ptr: Object.assign({ prev, cur }, extra || {}) }, line, note }));
    snap(1, "prev = None, cur = голова.");
    while (cur !== -1) {
      const nxt = nx[cur]; snap(3, `Запоминаем nxt — иначе потеряем хвост.`, { nxt });
      nx[cur] = prev; snap(4, `Разворачиваем стрелку узла ${v[cur]} назад.`, { nxt });
      prev = cur; cur = nxt; snap(5, "Сдвигаем prev и cur на шаг.");
    }
    snap(6, `cur = None. Новая голова — prev (${v[prev]}). O(n), O(1) памяти.`);
    return fr;
  }
};
VIZ.tree = {
  title: "In-order обход (рекурсия)", input: "4, 2, 6, 1, 3, 5, 7", hint: "Дерево по уровням, null — пусто",
  code: ["def inorder(node):", "    if node is None:", "        return", "    inorder(node.left)", "    out.append(node.val)", "    inorder(node.right)"],
  frames(s) {
    const a = parseTreeList(s), out = [], done = [], st = [], fr = [];
    const snap = (j, line, note) => fr.push(F({ tree: { vals: a, mark: j >= 0 ? [j] : [], done: done.slice() }, stack: st.slice(), boxes: [B("out", out.slice(), [out.length - 1])], line, note }));
    const go = j => {
      if (j >= a.length || a[j] === null) return;
      st.push(`inorder(${a[j]})`); snap(j, 3, `Узел ${a[j]}: сначала левое поддерево.`);
      go(2 * j + 1);
      out.push(a[j]); done.push(j); snap(j, 4, `Левое готово — записываем ${a[j]}.`);
      go(2 * j + 2);
      st.pop(); snap(j, 5, `Узел ${a[j]} обработан полностью.`);
    };
    go(0);
    fr.push(F({ tree: { vals: a, mark: [], done }, stack: [], boxes: [B("out", out)], line: 0, note: `In-order: ${out.join(", ")}. Каждый узел один раз — O(n).` }));
    return fr;
  }
};
VIZ.bst = {
  title: "Вставка в BST", input: "5, 3, 8, 1, 4, 7, 9", hint: "Значения по порядку вставки",
  code: ["def insert(root, x):", "    node = root", "    while True:", "        if x < node.val:", "            # налево (или вставить)", "        else:", "            # направо (или вставить)"],
  frames(s) {
    const xs = parseList(s), a = [], fr = [];
    const snap = (mk, line, note, vars) => fr.push(F({ tree: { vals: a.slice(), mark: mk, done: [] }, vars, line, note }));
    xs.forEach(x => {
      let j = 0;
      while (j < a.length && a[j] != null) {
        const go = x < a[j]; snap([j], go ? 3 : 5, `${x} ${go ? "<" : "≥"} ${a[j]} — идём ${go ? "влево" : "вправо"}.`, { x });
        j = 2 * j + (go ? 1 : 2);
        if (j > 30) throw new Error("Дерево глубже 5 уровней — возьми меньше или перемешай значения.");
      }
      while (a.length <= j) a.push(null); a[j] = x; snap([j], 4, `Свободное место — вставили ${x}. Спуск по одной ветке: O(h).`, { x });
    });
    return fr;
  }
};
VIZ.trie = {
  title: "Trie: вставка слов", input: "cat, car, cart, dog", hint: "Слова через запятую",
  code: ["def insert(root, w):", "    node = root", "    for ch in w:", "        node = node.setdefault(ch, {})", "    node['$'] = True"],
  frames(s) {
    const ws = s.split(/[\s,]+/).filter(Boolean); if (!ws.length || ws.length > 6 || ws.some(w => w.length > 8)) throw new Error("До 6 слов, каждое до 8 букв.");
    const nodes = [{ id: 0, label: "•", parent: null, end: false }], kids = [{}], fr = [];
    const snap = (mk, line, note) => fr.push(F({ gtree: { nodes: nodes.map(n => Object.assign({}, n)), mark: mk }, line, note }));
    ws.forEach(w => {
      let v = 0; snap([0], 1, `Вставляем «${w}» с корня.`);
      for (const c of w) {
        if (kids[v][c] === undefined) { const id = nodes.length; nodes.push({ id, label: c, parent: v, end: false }); kids.push({}); kids[v][c] = id; snap([id], 3, `Буквы «${c}» нет — создаём узел.`); }
        else snap([kids[v][c]], 3, `«${c}» уже есть — переиспользуем общий префикс.`);
        v = kids[v][c];
      }
      nodes[v].end = true; snap([v], 4, `Конец слова «${w}» — ставим флаг (двойная обводка). O(длина слова).`);
    });
    return fr;
  }
};
VIZ.dsu = {
  title: "Union-Find: объединения", input: "0-1, 2-3, 1-2, 4-5, 3-0", hint: "Рёбра вида a-b",
  code: ["def union(a, b):", "    ra, rb = find(a), find(b)", "    if ra == rb:", "        return False      # уже вместе: цикл", "    if size[ra] < size[rb]: ra, rb = rb, ra", "    parent[rb] = ra", "    size[ra] += size[rb]"],
  frames(s) {
    const [n, es] = parseEdges(s), p = [...Array(n).keys()], sz = Array(n).fill(1), fr = [];
    const find = x => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    const snap = (mk, line, note) => fr.push(F({ gtree: { nodes: p.map((q, i) => ({ id: i, label: String(i), parent: q === i ? null : q, end: q === i })), mark: mk }, boxes: [B("parent", p.slice(), mk)], line, note }));
    snap([], 0, `${n} вершин — ${n} отдельных множеств. Корни с двойной обводкой.`);
    let comps = n;
    es.forEach(([a, b]) => {
      let ra = find(a), rb = find(b);
      if (ra === rb) { snap([a, b], 3, `${a}-${b}: корни совпали (${ra}) — ребро замыкает цикл.`); return; }
      if (sz[ra] < sz[rb]) [ra, rb] = [rb, ra];
      p[rb] = ra; sz[ra] += sz[rb]; comps--; snap([ra, rb], 5, `${a}-${b}: корень ${rb} подвешиваем под ${ra}. Компонент: ${comps}.`);
    });
    return fr;
  }
};
VIZ.bfsgrid = {
  title: "BFS по лабиринту", input: "...#/.#../...#/#...", hint: "Строки через /: . — проход, # — стена",
  code: ["q, dist = deque([(0, 0)]), {(0, 0): 0}", "while q:", "    r, c = q.popleft()", "    for nr, nc in соседи(r, c):", "        if проход и (nr, nc) not in dist:", "            dist[(nr, nc)] = dist[(r, c)] + 1", "            q.append((nr, nc))"],
  frames(s) {
    const g = s.split("/").map(x => x.trim()); const R = g.length, C = g[0].length;
    if (R > 8 || C > 8 || g.some(x => x.length !== C || /[^.#]/.test(x))) throw new Error("До 8×8, строки одинаковой длины из . и #.");
    if (g[0][0] === "#") throw new Error("Старт (0,0) не должен быть стеной.");
    const d = g.map(r => [...r].map(ch => ch === "#" ? "#" : "")), q = [[0, 0]], fr = []; d[0][0] = 0;
    const snap = (cur, line, note) => fr.push(F({ grid: { cells: d.map(r => r.slice()), cur, queue: q.map(x => x.join(",")) }, boxes: [B("очередь", q.map(([r, c]) => `${r},${c}`), [0])], line, note }));
    snap(null, 0, "Старт (0,0), расстояние 0.");
    while (q.length) {
      const [r, c] = q.shift(); const add = [];
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]])
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && d[nr][nc] === "") { d[nr][nc] = d[r][c] + 1; q.push([nr, nc]); add.push(`${nr},${nc}`); }
      snap([r, c], 6, `Извлекли (${r},${c}) с расстоянием ${d[r][c]}. ${add.length ? "Новые: " + add.join("; ") + " — пометили сразу при добавлении." : "Новых соседей нет."}`);
    }
    const fin = d[R - 1][C - 1];
    fr.push(F({ grid: { cells: d, cur: [R - 1, C - 1] }, line: 1, note: fin === "" || fin === "#" ? "До правого нижнего угла пути нет." : `До угла ${fin} шагов — BFS идёт волнами, первое попадание кратчайшее.` }));
    return fr;
  }
};
const circle = n => [...Array(n).keys()].map(i => ({ id: i, x: 200 + 150 * Math.cos(2 * Math.PI * i / n - Math.PI / 2), y: 170 + 130 * Math.sin(2 * Math.PI * i / n - Math.PI / 2) }));
VIZ.topo = {
  title: "Топосортировка (Кан)", input: "0-1, 0-2, 1-3, 2-3, 3-4, 5-4", hint: "Рёбра a-b: a раньше b",
  code: ["indeg = входящие степени", "q = deque(v for v in range(n) if indeg[v] == 0)", "while q:", "    v = q.popleft(); order.append(v)", "    for u in g[v]:", "        indeg[u] -= 1", "        if indeg[u] == 0: q.append(u)", "return order if len(order) == n else []"],
  frames(s) {
    const [n, es] = parseEdges(s), indeg = Array(n).fill(0), g = [...Array(n)].map(() => []), fr = [];
    es.forEach(([a, b]) => { g[a].push(b); indeg[b]++; });
    const q = [...Array(n).keys()].filter(v => !indeg[v]), order = [];
    const snap = (cur, line, note) => { const cls = {}; order.forEach(v => cls[v] = "done"); q.forEach(v => cls[v] = "q"); if (cur != null) cls[cur] = "cur"; fr.push(F({ graph: { nodes: circle(n), edges: es, dir: true, ncls: cls }, boxes: [B("indeg", indeg.slice()), B("очередь", q.slice()), B("порядок", order.slice())], line, note })); };
    snap(null, 1, `Стартуем с вершин без входящих рёбер: ${q.join(", ") || "таких нет"}.`);
    while (q.length) {
      const v = q.shift(); order.push(v); const nw = [];
      g[v].forEach(u => { if (--indeg[u] === 0) { q.push(u); nw.push(u); } });
      snap(v, 6, `Берём ${v}. Уменьшили indeg соседей${nw.length ? `; обнулились: ${nw.join(", ")}` : ""}.`);
    }
    fr.push(F({ graph: { nodes: circle(n), edges: es, dir: true, ncls: Object.fromEntries(order.map(v => [v, "done"])) }, boxes: [B("порядок", order)], line: 7, note: order.length === n ? `Порядок: ${order.join(" → ")}. O(V + E).` : `Обработано ${order.length} из ${n} — в графе цикл.` }));
    return fr;
  }
};
VIZ.dijkstra = {
  title: "Дейкстра с кучей", input: "0-1:4, 0-2:1, 2-1:2, 1-3:1, 2-3:5, 3-4:3", hint: "Рёбра a-b:вес (неориентированные)",
  code: ["dist[src] = 0; pq = [(0, src)]", "while pq:", "    d, v = heappop(pq)", "    if d > dist[v]: continue", "    for u, w in g[v]:", "        if d + w < dist[u]:", "            dist[u] = d + w", "            heappush(pq, (dist[u], u))"],
  frames(s) {
    const [n, es] = parseEdges(s, true), g = [...Array(n)].map(() => []), dist = Array(n).fill(Infinity), fin = new Set(), fr = [];
    es.forEach(([a, b, w]) => { g[a].push([b, w]); g[b].push([a, w]); });
    dist[0] = 0; let pq = [[0, 0]];
    const show = x => x === Infinity ? "∞" : x;
    const snap = (cur, line, note) => { const cls = {}; fin.forEach(v => cls[v] = "done"); if (cur != null) cls[cur] = "cur"; fr.push(F({ graph: { nodes: circle(n), edges: es, ncls: cls, labels: Object.fromEntries(dist.map((d, i) => [i, show(d)])) }, boxes: [B("dist", dist.map(show)), B("куча (d, v)", pq.map(([d, v]) => `${d},${v}`), [0])], line, note })); };
    snap(null, 0, "Источник 0, остальные ∞.");
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const [d, v] = pq.shift();
      if (d > dist[v]) { snap(v, 3, `(${d}, ${v}) устарела: dist[${v}] = ${dist[v]}. Пропускаем.`); continue; }
      fin.add(v); const upd = [];
      g[v].forEach(([u, w]) => { if (d + w < dist[u]) { dist[u] = d + w; pq.push([dist[u], u]); upd.push(`${u}→${dist[u]}`); } });
      pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      snap(v, 6, `Вершина ${v} окончательна (${d}). ${upd.length ? "Улучшили: " + upd.join(", ") : "Улучшений нет"}.`);
    }
    fr.push(F({ graph: { nodes: circle(n), edges: es, ncls: Object.fromEntries([...fin].map(v => [v, "done"])), labels: Object.fromEntries(dist.map((d, i) => [i, show(d)])) }, boxes: [B("dist", dist.map(show))], line: 1, note: `Готово. O(E log V).` }));
    return fr;
  }
};
VIZ.kruskal = {
  title: "Крускал: MST", input: "0-1:4, 0-2:3, 1-2:1, 1-3:2, 2-3:4, 3-4:2, 2-4:5", hint: "Рёбра a-b:вес",
  code: ["for w, a, b in sorted(edges):", "    ra, rb = find(a), find(b)", "    if ra != rb:", "        parent[ra] = rb", "        total += w", "    # иначе ребро создаст цикл"],
  frames(s) {
    const [n, es] = parseEdges(s, true), p = [...Array(n).keys()], find = x => { while (p[x] !== x) x = p[x] = p[p[x]]; return x; };
    const sorted = es.map((e, i) => [e[2], e[0], e[1], i]).sort((a, b) => a[0] - b[0]), ecls = {}, fr = []; let total = 0, used = 0;
    const snap = (k, line, note) => fr.push(F({ graph: { nodes: circle(n), edges: es, ecls: Object.assign({}, ecls) }, boxes: [B("рёбра по весу", sorted.map(([w, a, b]) => `${a}-${b}:${w}`), k >= 0 ? [k] : [])], vars: { total, "рёбер": used }, line, note }));
    snap(-1, 0, "Сортируем рёбра по весу.");
    sorted.forEach(([w, a, b, i], k) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) { p[ra] = rb; total += w; used++; ecls[i] = "take"; snap(k, 4, `${a}-${b} (${w}): разные компоненты — берём.`); }
      else { ecls[i] = "skip"; snap(k, 5, `${a}-${b} (${w}): уже связаны — цикл, пропускаем.`); }
    });
    snap(-1, 0, used === n - 1 ? `MST: вес ${total}, ${used} рёбер. O(E log E).` : "Граф несвязный — остовного дерева нет.");
    return fr;
  }
};
VIZ.subsets = {
  title: "Backtracking: подмножества", input: "1, 2, 3", hint: "До 4 чисел",
  code: ["def go(i):", "    res.append(path[:])", "    for j in range(i, len(nums)):", "        path.append(nums[j])", "        go(j + 1)", "        path.pop()"],
  frames(s) {
    const a = parseList(s); if (a.length > 4) throw new Error("Не больше 4 чисел — подмножеств 2ⁿ.");
    const path = [], res = [], st = [], fr = [];
    const snap = (line, note, mk) => fr.push(F({ arr: a, mark: mk || [], stack: st.slice(), boxes: [B("path", path.slice()), B("res", res.map(x => `[${x.join(",")}]`), [res.length - 1])], line, note }));
    const go = i => {
      st.push(`go(${i})`); res.push(path.slice()); snap(1, `Сохраняем копию path = [${path.join(", ")}].`);
      for (let j = i; j < a.length; j++) { path.push(a[j]); snap(3, `Выбираем ${a[j]}.`, [j]); go(j + 1); path.pop(); snap(5, `Откат: убираем ${a[j]}.`, [j]); }
      st.pop();
    };
    go(0);
    fr.push(F({ arr: a, boxes: [B("res", res.map(x => `[${x.join(",")}]`))], line: 0, note: `${res.length} = 2^${a.length} подмножеств. O(2ⁿ·n).` }));
    return fr;
  }
};
VIZ.jump = {
  title: "Jump Game: дальняя достижимая", input: "2, 3, 1, 1, 4", hint: "Длины прыжков",
  code: ["reach = 0", "for i, x in enumerate(nums):", "    if i > reach:", "        return False", "    reach = max(reach, i + x)", "return True"],
  frames(s) {
    const a = parseList(s), fr = []; let reach = 0;
    for (let i = 0; i < a.length; i++) {
      if (i > reach) { fr.push(F({ arr: a, ptr: { i }, range: [0, Math.min(reach, a.length - 1)], line: 3, vars: { i, reach }, note: `i = ${i} > reach = ${reach}: сюда не допрыгнуть. Ответ False.` })); return fr; }
      reach = Math.max(reach, i + a[i]);
      fr.push(F({ arr: a, ptr: { i }, range: [0, Math.min(reach, a.length - 1)], line: 4, vars: { i, x: a[i], reach }, note: `С ${i} можно до ${i + a[i]}. Достижимо до ${reach}.` }));
    }
    fr.push(F({ arr: a, range: [0, a.length - 1], line: 5, vars: { reach }, note: "Дошли до конца — True. Один проход, O(n)." }));
    return fr;
  }
};
VIZ.dp1 = {
  title: "ДП: грабитель", input: "2, 7, 9, 3, 1", hint: "Деньги в домах",
  code: ["prev2 = prev1 = 0", "for x in nums:", "    # dp[i] = max(dp[i-1], dp[i-2] + x)", "    prev2, prev1 = prev1, max(prev1, prev2 + x)", "return prev1"],
  frames(s) {
    const a = parseList(s), dp = [], fr = [];
    a.forEach((x, i) => {
      const skip = i ? dp[i - 1] : 0, take = (i > 1 ? dp[i - 2] : 0) + x; dp.push(Math.max(skip, take));
      fr.push(F({ arr: a, ptr: { i }, boxes: [B("dp", dp.slice(), [i], { from: [i - 1, i - 2].filter(j => j >= 0) })], vars: { "не грабим": skip, "грабим": take }, line: 3, note: `Дом ${i}: max(${skip}, ${i > 1 ? dp[i - 2] : 0} + ${x}) = ${dp[i]}.` }));
    });
    fr.push(F({ arr: a, boxes: [B("dp", dp, [dp.length - 1])], line: 4, note: `Ответ ${dp[dp.length - 1] || 0}. Хватает двух переменных: O(1) памяти.` }));
    return fr;
  }
};
VIZ.lcs = {
  title: "LCS: таблица ДП", input: "abcde, ace", hint: "Две строки через запятую (до 7 букв)",
  code: ["for i in 1..n:", "  for j in 1..m:", "    if a[i-1] == b[j-1]:", "        dp[i][j] = dp[i-1][j-1] + 1", "    else:", "        dp[i][j] = max(dp[i-1][j], dp[i][j-1])"],
  frames(s) {
    const [a, b] = s.split(",").map(x => x.trim()); if (!a || !b || a.length > 7 || b.length > 7) throw new Error("Две строки до 7 символов через запятую.");
    const n = a.length, m = b.length, dp = [...Array(n + 1)].map(() => Array(m + 1).fill(0)), fr = [];
    const snap = (i, j, dep, line, note) => fr.push(F({ table: { rows: dp.map(r => r.slice()), rh: ["∅", ...a], ch: ["∅", ...b], hl: [i, j], dep }, line, note }));
    snap(-1, -1, [], 0, "Нулевая строка и столбец — пустые префиксы, LCS = 0.");
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; snap(i, j, [[i - 1, j - 1]], 3, `${a[i - 1]} = ${b[j - 1]}: диагональ + 1 = ${dp[i][j]}.`); }
      else { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); snap(i, j, [[i - 1, j], [i, j - 1]], 5, `${a[i - 1]} ≠ ${b[j - 1]}: max(сверху ${dp[i - 1][j]}, слева ${dp[i][j - 1]}) = ${dp[i][j]}.`); }
    }
    snap(n, m, [], 5, `LCS = ${dp[n][m]}. O(n·m).`);
    return fr;
  }
};
VIZ.coins = {
  title: "Размен монет: dp[сумма]", input: "1, 3, 4; 6", hint: "Монеты; сумма (до 20)",
  code: ["dp = [0] + [INF] * amount", "for a in range(1, amount + 1):", "    for c in coins:", "        if c <= a:", "            dp[a] = min(dp[a], dp[a - c] + 1)", "return dp[amount] or -1"],
  frames(s) {
    const [cs, am] = s.split(";"); const coins = parseList(cs || ""), A = parseInt(am, 10);
    if (!(A >= 1 && A <= 20) || coins.some(c => c < 1)) throw new Error("Формат: 1, 3, 4; 6 — сумма от 1 до 20.");
    const dp = [0, ...Array(A).fill(Infinity)], fr = [], sh = () => dp.map(x => x === Infinity ? "∞" : x);
    fr.push(F({ boxes: [B("dp[a]", sh(), [0])], line: 0, note: "dp[0] = 0, остальные ∞." }));
    for (let a = 1; a <= A; a++) {
      const tried = [];
      coins.forEach(c => { if (c <= a && dp[a - c] + 1 < dp[a]) { dp[a] = dp[a - c] + 1; } if (c <= a) tried.push(`${c}: dp[${a - c}]+1 = ${dp[a - c] === Infinity ? "∞" : dp[a - c] + 1}`); });
      fr.push(F({ boxes: [B("dp[a]", sh(), [a], { from: coins.filter(c => c <= a).map(c => a - c) })], line: 4, note: `Сумма ${a}: ${tried.join("; ") || "монет нет"} → ${dp[a] === Infinity ? "∞" : dp[a]}.` }));
    }
    fr.push(F({ boxes: [B("dp[a]", sh(), [A])], line: 5, note: dp[A] === Infinity ? "Набрать нельзя: -1." : `Минимум монет: ${dp[A]}. O(amount · монет).` }));
    return fr;
  }
};
VIZ.bits = {
  title: "x & (x − 1): считаем единицы", input: "44", hint: "Число от 1 до 1023",
  code: ["def hamming_weight(n):", "    c = 0", "    while n:", "        n &= n - 1", "        c += 1", "    return c"],
  frames(s) {
    let x = parseInt(s, 10); if (!(x >= 1 && x <= 1023)) throw new Error("Число от 1 до 1023.");
    const bits = v => v.toString(2).padStart(10, "0").split(""), fr = []; let c = 0;
    fr.push(F({ boxes: [B("x = " + x, bits(x))], vars: { c }, line: 1, note: `${x} в двоичной записи.` }));
    while (x) {
      const y = x & (x - 1), low = 9 - Math.log2(x & -x);
      fr.push(F({ boxes: [B("x = " + x, bits(x), [low]), B("x − 1 = " + (x - 1), bits(x - 1), [low]), B("x & (x − 1) = " + y, bits(y))], vars: { c: c + 1 }, line: 3, note: `x − 1 переворачивает младшую единицу и нули справа; & стирает эту единицу.` }));
      x = y; c++;
    }
    fr.push(F({ boxes: [B("x", bits(0))], vars: { c }, line: 5, note: `Единиц: ${c}. Итераций ровно столько, сколько единиц.` }));
    return fr;
  }
};
VIZ.sieve = {
  title: "Решето Эратосфена", input: "40", hint: "n от 10 до 80",
  code: ["is_p = [True] * n", "for i in range(2, int(n ** 0.5) + 1):", "    if is_p[i]:", "        for j in range(i * i, n, i):", "            is_p[j] = False"],
  frames(s) {
    const n = parseInt(s, 10); if (!(n >= 10 && n <= 80)) throw new Error("n от 10 до 80.");
    const is = Array(n).fill(true), nums = [...Array(n - 2)].map((_, k) => k + 2), fr = [];
    const snap = (mk, line, note) => fr.push(F({ boxes: [B("числа (бледные — составные)", nums, mk.map(v => v - 2), { dim: nums.filter(v => !is[v]).map(v => v - 2) })], line, note }));
    snap([], 0, "Все числа от 2 считаем простыми.");
    for (let i = 2; i * i < n; i++) {
      if (!is[i]) continue; const cross = [];
      for (let j = i * i; j < n; j += i) if (is[j]) { is[j] = false; cross.push(j); }
      snap([i], 4, `${i} простое. Вычёркиваем с ${i * i} шагом ${i}: ${cross.join(", ") || "новых нет"}.`);
    }
    const pr = nums.filter(v => is[v]); snap(pr, 1, `Простых меньше ${n}: ${pr.length}. O(n log log n).`);
    return fr;
  }
};
VIZ.kmp = {
  title: "KMP: префикс-функция", input: "aabaaab", hint: "Строка (до 14 символов)",
  code: ["k = 0", "for i in range(1, len(s)):", "    while k and s[i] != s[k]:", "        k = pi[k - 1]", "    if s[i] == s[k]:", "        k += 1", "    pi[i] = k"],
  frames(s) {
    const a = parseList(s, true); if (a.length > 14) throw new Error("До 14 символов."); const pi = Array(a.length).fill(0), fr = []; let k = 0;
    const snap = (i, line, note) => fr.push(F({ arr: a, ptr: Object.assign({ i }, i !== k ? { k } : {}), range: k ? [0, k - 1] : undefined, boxes: [B("pi", pi.slice(), [i])], vars: { k }, line, note }));
    snap(0, 0, "pi[0] = 0: собственного префикса у одной буквы нет.");
    for (let i = 1; i < a.length; i++) {
      while (k && a[i] !== a[k]) { const old = k; k = pi[k - 1]; snap(i, 3, `s[${i}]='${a[i]}' ≠ s[${old}]='${a[old]}': откат k = pi[${old - 1}] = ${k}.`); }
      if (a[i] === a[k]) { k++; }
      pi[i] = k; snap(i, 6, `pi[${i}] = ${k}: ${k ? `префикс «${a.slice(0, k).join("")}» совпадает с суффиксом` : "совпадений нет"}.`);
    }
    return fr;
  }
};

function renderExtra(f) {
  let h = "";
  if (f.ll) {
    const { vals, next, ptr } = f.ll, n = vals.length, W = Math.max(320, n * 70 + 40), X = i => 30 + i * 70;
    let svg = `<svg viewBox="0 0 ${W} 120" style="width:100%;max-width:${W}px;height:auto"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--accent)"/></marker><marker id="ahm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mark)"/></marker></defs>`;
    const at = {}; Object.entries(ptr).forEach(([k, v]) => (at[v] = at[v] || []).push(k));
    vals.forEach((v, i) => {
      const t = next[i];
      if (t === i + 1) svg += `<line x1="${X(i) + 20}" y1="36" x2="${X(t) - 22}" y2="36" stroke="var(--accent)" stroke-width="2" marker-end="url(#ah)"/>`;
      else if (t === i - 1 && t >= 0) svg += `<line x1="${X(i) - 20}" y1="36" x2="${X(t) + 22}" y2="36" stroke="var(--mark)" stroke-width="2" marker-end="url(#ahm)"/>`;
      else if (t === -1) svg += `<text x="${X(i)}" y="14" font-size="12" text-anchor="middle" fill="var(--muted)" font-family="var(--f-mono)">→None</text>`;
      const mk = Object.values(ptr).includes(i) && at[i].includes("cur");
      svg += `<rect x="${X(i) - 18}" y="22" width="36" height="28" rx="7" fill="${mk ? "var(--mark-soft)" : "var(--surface)"}" stroke="${mk ? "var(--mark)" : "var(--accent)"}" stroke-width="2"/><text x="${X(i)}" y="41" text-anchor="middle" font-family="var(--f-mono)" font-size="14" fill="var(--ink)">${esc(v)}</text>`;
      if (at[i]) svg += `<text x="${X(i)}" y="72" text-anchor="middle" font-family="var(--f-mono)" font-size="12" fill="var(--mark)">${at[i].join(",")}</text>`;
    });
    Object.entries(ptr).filter(([, v]) => v === -1).forEach(([k], j) => { svg += `<text x="${10}" y="${95 + j * 14}" font-family="var(--f-mono)" font-size="12" fill="var(--muted)">${k} = None</text>`; });
    h += `<div class="lbl">Список: синие стрелки — исходные next, оранжевые — развёрнутые</div>${svg}</svg>`;
  }
  if (f.tree) {
    const a = f.tree.vals, n = a.length, W = 440, depth = Math.max(1, Math.ceil(Math.log2(n + 1))), H = depth * 56 + 10;
    const pos = j => { const d = Math.floor(Math.log2(j + 1)), k = j - (2 ** d - 1); return [W * (k + 0.5) / 2 ** d, 24 + d * 56]; };
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto">`;
    for (let j = 1; j < n; j++) if (a[j] != null && a[(j - 1) >> 1] != null) { const [x1, y1] = pos(j), [x2, y2] = pos((j - 1) >> 1); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)" stroke-width="2"/>`; }
    for (let j = 0; j < n; j++) if (a[j] != null) { const [x, y] = pos(j), mk = f.tree.mark.includes(j), dn = f.tree.done.includes(j); svg += `<circle cx="${x}" cy="${y}" r="17" fill="${mk ? "var(--mark-soft)" : dn ? "var(--ok-soft)" : "var(--surface)"}" stroke="${mk ? "var(--mark)" : dn ? "var(--ok)" : "var(--accent)"}" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="var(--f-mono)" font-size="13" fill="var(--ink)">${a[j]}</text>`; }
    h += `<div class="lbl">Дерево</div>${svg}</svg>`;
  }
  if (f.gtree) {
    const N = f.gtree.nodes, ch = {}, roots = []; N.forEach(v => v.parent == null ? roots.push(v.id) : (ch[v.parent] = ch[v.parent] || []).push(v.id));
    const pos = {}; let leaf = 0, maxd = 0;
    const lay = (v, d) => { maxd = Math.max(maxd, d); const c = ch[v] || []; if (!c.length) pos[v] = [leaf++, d]; else { c.forEach(u => lay(u, d + 1)); pos[v] = [(pos[c[0]][0] + pos[c[c.length - 1]][0]) / 2, d]; } };
    roots.forEach(r => { lay(r, 0); leaf += 0.4; });
    const W = Math.max(200, leaf * 48 + 20), H = (maxd + 1) * 54 + 6, P = v => [24 + pos[v][0] * 48, 22 + pos[v][1] * 54];
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${Math.min(W, 520)}px;height:auto">`;
    N.forEach(v => { if (v.parent != null) { const [x1, y1] = P(v.id), [x2, y2] = P(v.parent); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)" stroke-width="2"/>`; } });
    N.forEach(v => { const [x, y] = P(v.id), mk = f.gtree.mark.includes(v.id); svg += `${v.end ? `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="var(--ok)" stroke-width="2"/>` : ""}<circle cx="${x}" cy="${y}" r="15" fill="${mk ? "var(--mark-soft)" : "var(--surface)"}" stroke="${mk ? "var(--mark)" : "var(--accent)"}" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="var(--f-mono)" font-size="13" fill="var(--ink)">${esc(v.label)}</text>`; });
    h += `${svg}</svg>`;
  }
  if (f.graph) {
    const G = f.graph, P = {}; G.nodes.forEach(v => P[v.id] = v);
    let svg = `<svg viewBox="0 0 400 340" style="width:100%;max-width:400px;height:auto"><defs><marker id="ga" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--muted)"/></marker></defs>`;
    G.edges.forEach(([a, b, w], i) => {
      const A = P[a], Bn = P[b], dx = Bn.x - A.x, dy = Bn.y - A.y, L = Math.hypot(dx, dy) || 1, k = 20 / L;
      const c = (G.ecls || {})[i], col = c === "take" ? "var(--ok)" : c === "skip" ? "var(--bad)" : "var(--line)";
      svg += `<line x1="${A.x + dx * k}" y1="${A.y + dy * k}" x2="${Bn.x - dx * k}" y2="${Bn.y - dy * k}" stroke="${col}" stroke-width="${c === "take" ? 4 : 2}" ${c === "skip" ? 'stroke-dasharray="5 4"' : ""} ${G.dir ? 'marker-end="url(#ga)"' : ""}/>`;
      if (!G.dir && !G.noW) svg += `<text x="${(A.x + Bn.x) / 2 + 4}" y="${(A.y + Bn.y) / 2 - 4}" font-size="12" font-family="var(--f-mono)" fill="var(--muted)">${w}</text>`;
    });
    G.nodes.forEach(v => {
      const c = (G.ncls || {})[v.id], fill = c === "cur" ? "var(--mark-soft)" : c === "done" ? "var(--ok-soft)" : c === "q" ? "var(--accent-soft)" : "var(--surface)", st = c === "cur" ? "var(--mark)" : c === "done" ? "var(--ok)" : "var(--accent)";
      svg += `<circle cx="${v.x}" cy="${v.y}" r="18" fill="${fill}" stroke="${st}" stroke-width="2"/><text x="${v.x}" y="${v.y + 5}" text-anchor="middle" font-family="var(--f-mono)" font-size="14" fill="var(--ink)">${v.id}</text>`;
      if (G.labels) svg += `<text x="${v.x}" y="${v.y + 34}" text-anchor="middle" font-family="var(--f-mono)" font-size="12" fill="var(--mark)">${G.labels[v.id]}</text>`;
    });
    h += `${svg}</svg>`;
  }
  if (f.grid) {
    const { cells, cur } = f.grid;
    h += `<div class="gridv" style="grid-template-columns:repeat(${cells[0].length},36px)">${cells.map((r, i) => r.map((v, j) => `<div class="gc ${v === "#" ? "wall" : v === "" ? "" : "seen"} ${cur && cur[0] === i && cur[1] === j ? "cur" : ""}">${v === "#" ? "" : v}</div>`).join("")).join("")}</div>`;
  }
  if (f.table) {
    const T = f.table, isDep = (i, j) => (T.dep || []).some(([a, b]) => a === i && b === j);
    h += `<div class="tw"><table class="dpt"><tr><th></th>${T.ch.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${T.rows.map((r, i) => `<tr><th>${esc(T.rh[i])}</th>${r.map((v, j) => `<td class="${T.hl[0] === i && T.hl[1] === j ? "hl" : isDep(i, j) ? "dep" : !T.noFut && (i > T.hl[0] || (i === T.hl[0] && j > T.hl[1])) && i > 0 && j > 0 ? "fut" : ""}">${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
  }
  if (f.boxes) f.boxes.forEach(b => {
    h += `<div class="lbl">${esc(b.label)}</div><div class="cells">${b.items.length ? b.items.map((v, j) => `<div class="cell ${b.mark.includes(j) ? "mk" : ""} ${(b.from || []).includes(j) ? "in" : ""} ${(b.dim || []).includes(j) ? "dim" : ""}"><span class="ix">${j}</span>${esc(v)}</div>`).join("") : `<span class="muted">пусто</span>`}</div>`;
  });
  return h;
}

/* ---------- VISUALIZER: part IX ---------- */
VIZ.lru = {
  title: "LRU-кеш: порядок использования", input: "put 1 1, put 2 2, get 1, put 3 3, get 2, put 4 4, get 1, get 3", hint: "Команды; ёмкость 2",
  code: ["def get(self, key):", "    if key not in self.d: return -1", "    self.d.move_to_end(key); return self.d[key]", "def put(self, key, value):", "    if key in self.d: self.d.move_to_end(key)", "    self.d[key] = value", "    if len(self.d) > self.cap:", "        self.d.popitem(last=False)"],
  frames(s) {
    const cmds = s.split(",").map(x => x.trim().split(/\s+/)).filter(x => x[0]);
    if (!cmds.length || cmds.length > 14 || cmds.some(c => !((c[0] === "get" && c.length === 2) || (c[0] === "put" && c.length === 3)) || c.slice(1).some(v => !/^-?\d+$/.test(v)))) throw new Error("Команды вида put 1 1, get 1 — до 14 штук.");
    const cap = 2, order = [], val = {}, fr = [];
    const snap = (line, note, mk) => fr.push(F({ boxes: [B("порядок: старые слева → свежие справа", order.map(k => `${k}:${val[k]}`), mk)], map: Object.fromEntries(order.map(k => [k, val[k]])), line, note }));
    snap(0, "Кеш пуст, ёмкость 2.");
    cmds.forEach(([op, k, v]) => {
      if (op === "get") {
        if (!(k in val)) { snap(1, `get ${k}: ключа нет → -1.`); return; }
        order.splice(order.indexOf(k), 1); order.push(k); snap(2, `get ${k} → ${val[k]}. Ключ стал самым свежим — в конец.`, [order.length - 1]);
      } else {
        if (k in val) order.splice(order.indexOf(k), 1);
        order.push(k); val[k] = v;
        if (order.length > cap) { const old = order.shift(); delete val[old]; snap(7, `put ${k} ${v}: переполнение — выбрасываем самый старый ключ ${old}.`, [order.length - 1]); }
        else snap(5, `put ${k} ${v}: кладём в конец.`, [order.length - 1]);
      }
    });
    return fr;
  }
};
VIZ.quickselect = {
  title: "Quickselect: k-й наименьший", input: "7, 2, 9, 4, 1, 8, 3, 6; 3", hint: "Числа; k (1 = минимум)",
  code: ["while True:", "    p = a[hi]                 # опорный (Ломуто)", "    i = lo", "    for j in range(lo, hi):", "        if a[j] < p: a[i], a[j] = a[j], a[i]; i += 1", "    a[i], a[hi] = a[hi], a[i]", "    if i == k - 1: return a[i]", "    elif i < k - 1: lo = i + 1", "    else: hi = i - 1"],
  frames(s) {
    const [xs, ks] = s.split(";"); const a = parseList(xs || ""), k = parseInt(ks, 10);
    if (!(k >= 1 && k <= a.length)) throw new Error("Формат: числа; k, где 1 ≤ k ≤ длины.");
    let lo = 0, hi = a.length - 1; const fr = [];
    while (true) {
      const p = a[hi]; let i = lo;
      fr.push(F({ arr: a.slice(), range: [lo, hi], ptr: { p: hi }, line: 1, vars: { k, p }, note: `Ищем в [${lo}..${hi}]. Опорный — ${p}.` }));
      for (let j = lo; j < hi; j++) if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; i++; }
      [a[i], a[hi]] = [a[hi], a[i]];
      fr.push(F({ arr: a.slice(), range: [lo, hi], mark: [i], line: 5, vars: { k, p, "место": i }, note: `После разбиения ${p} на своём месте ${i}: левее меньшие, правее не меньшие.` }));
      if (i === k - 1) { fr.push(F({ arr: a.slice(), mark: [i], line: 6, vars: { "ответ": a[i] }, note: `Место ${i} = k − 1. Ответ ${a[i]}. Каждый раз продолжаем в одной половине — O(n) в среднем.` })); return fr; }
      if (i < k - 1) { lo = i + 1; fr.push(F({ arr: a.slice(), range: [lo, hi], line: 7, vars: { k }, note: `k − 1 = ${k - 1} > ${i}: ищем только справа.` })); }
      else { hi = i - 1; fr.push(F({ arr: a.slice(), range: [lo, hi], line: 8, vars: { k }, note: `k − 1 = ${k - 1} < ${i}: ищем только слева.` })); }
    }
  }
};
VIZ.intdp = {
  title: "ДП по отрезкам: лопание шариков", input: "3, 1, 5, 8", hint: "До 5 шариков",
  code: ["a = [1] + nums + [1]", "for length in range(2, n):", "    for l in range(0, n - length):", "        r = l + length", "        for k in range(l + 1, r):", "            dp[l][r] = max(dp[l][r],", "                dp[l][k] + a[l]*a[k]*a[r] + dp[k][r])"],
  frames(s) {
    const nums = parseList(s); if (nums.length > 5) throw new Error("Не больше 5 шариков.");
    const a = [1, ...nums, 1], n = a.length, dp = [...Array(n)].map(() => Array(n).fill(0)), fr = [], hdr = a.map((v, i) => `${i}:${v}`), done = new Set();
    const snap = (l, r, dep, line, note) => fr.push(F({ arr: a, range: l >= 0 ? [l, r] : undefined, table: { rows: dp.map((x, i) => x.map((y, j) => j - i >= 2 && done.has(i * 100 + j) ? y : j - i === 1 ? 0 : "")), rh: hdr, ch: hdr, hl: [l, r], dep, noFut: true }, line, note }));
    snap(-1, -1, [], 0, "dp[l][r] — максимум монет за шарики строго между l и r. Края — единицы.");
    for (let len = 2; len < n; len++) for (let l = 0; l + len < n; l++) {
      const r = l + len; let best = 0, bk = -1;
      for (let k = l + 1; k < r; k++) { const v = dp[l][k] + a[l] * a[k] * a[r] + dp[k][r]; if (v > best) { best = v; bk = k; } }
      dp[l][r] = best; done.add(l * 100 + r);
      snap(l, r, [[l, bk], [bk, r]], 6, `(${l}, ${r}): лучше всего последним лопнуть шарик ${bk} (${a[bk]}): ${dp[l][bk]} + ${a[l]}·${a[bk]}·${a[r]} + ${dp[bk][r]} = ${best}.`);
    }
    snap(0, n - 1, [], 6, `Ответ dp[0][${n - 1}] = ${dp[0][n - 1]}. O(n³).`);
    return fr;
  }
};
VIZ.fenwick = {
  title: "Дерево Фенвика", input: "3, 2, -1, 6, 5, 4, -3, 3", hint: "До 16 чисел",
  code: ["def add(i, d):", "    while i <= n:", "        t[i] += d; i += i & -i", "def pref(i):", "    s = 0", "    while i > 0:", "        s += t[i]; i -= i & -i", "    return s"],
  frames(s) {
    const a = parseList(s); if (a.length > 16) throw new Error("Не больше 16 чисел."); const n = a.length, t = Array(n + 1).fill(0), fr = [];
    const cover = i => `${i - (i & -i) + 1}..${i}`;
    const snap = (mk, line, note, vars) => fr.push(F({ arr: a, boxes: [B("t[i] (индекс с 1; отрезок a[" + "l..i])", t.slice(1).map((v, j) => `${v}`), mk.map(i => i - 1)), B("отрезок, за который отвечает t[i]", t.slice(1).map((_, j) => cover(j + 1)), mk.map(i => i - 1))], vars, line, note }));
    a.forEach((x, j) => { let i = j + 1; const path = []; while (i <= n) { t[i] += x; path.push(i); i += i & -i; } if (j < 4 || j === n - 1) snap(path, 2, `add(${j + 1}, ${x}): обновили t[${path.join("], t[")}] — шаг i += i & -i.`); });
    snap([], 0, `Построено за O(n log n). Каждое t[i] покрывает i & -i элементов.`);
    const q = n; let i = q, sum = 0; const path = [];
    while (i > 0) { sum += t[i]; path.push(i); i -= i & -i; }
    snap(path, 6, `pref(${q}) = ${path.map(p => "t[" + p + "]").join(" + ")} = ${sum}: шагов столько, сколько единиц в двоичной записи ${q}.`, { "сумма": sum });
    const mid = Math.max(1, n >> 1); i = mid; sum = 0; const p2 = [];
    while (i > 0) { sum += t[i]; p2.push(i); i -= i & -i; }
    snap(p2, 6, `pref(${mid}) = ${sum}. Сумма отрезка [l..r] = pref(r) − pref(l − 1).`, { "сумма": sum });
    return fr;
  }
};
VIZ.manacher = {
  title: "Манакер: радиусы палиндромов", input: "abacaba", hint: "Строка до 12 символов",
  code: ["t = '#' + '#'.join(s) + '#'", "for i in range(n):", "    if i < r:", "        p[i] = min(r - i, p[2 * c - i])", "    while t[i-p[i]-1] == t[i+p[i]+1]:", "        p[i] += 1", "    if i + p[i] > r:", "        c, r = i, i + p[i]"],
  frames(s) {
    const src = parseList(s, true); if (src.length > 12) throw new Error("До 12 символов.");
    const t = ["#"]; src.forEach(ch => t.push(ch, "#")); const n = t.length, p = Array(n).fill(0), fr = []; let c = 0, r = 0;
    for (let i = 0; i < n; i++) {
      let mirror = null;
      if (i < r) { p[i] = Math.min(r - i, p[2 * c - i]); mirror = 2 * c - i; }
      const start = p[i];
      while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] === t[i + p[i] + 1]) p[i]++;
      if (i + p[i] > r) { c = i; r = i + p[i]; }
      if (t[i] !== "#" || p[i] > 0) fr.push(F({ arr: t, ptr: Object.assign({ i }, mirror !== null && mirror !== i ? { зерк: mirror } : {}), range: [i - p[i], i + p[i]], boxes: [B("p[i]", p.slice(), [i])], vars: { c, r, "из зеркала": start, "расширили": p[i] - start }, line: p[i] > start ? 5 : 3, note: mirror !== null ? `i внутри палиндрома с центром ${c}: зеркало даёт сразу ${start}, дорасширили на ${p[i] - start}.` : `Расширяемся с нуля: радиус ${p[i]}.` }));
    }
    const mx = Math.max(...p), ci = p.indexOf(mx);
    fr.push(F({ arr: t, range: [ci - mx, ci + mx], boxes: [B("p[i]", p, [ci])], line: 7, note: `Самый длинный палиндром длины ${mx}: «${t.slice(ci - mx, ci + mx + 1).filter(x => x !== "#").join("")}». Граница r только растёт — O(n).` }));
    return fr;
  }
};
VIZ.sweep = {
  title: "Заметающая прямая: переговорные", input: "0-30, 5-10, 15-20, 8-25, 26-35", hint: "Встречи начало-конец",
  code: ["for s, e in intervals:", "    ev += [(s, 1), (e, -1)]", "ev.sort()", "for _, d in ev:", "    cur += d", "    best = max(best, cur)"],
  frames(s) {
    const iv = s.split(",").map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(\d+)\s*-\s*(\d+)$/); if (!m || +m[1] >= +m[2]) throw new Error("Встречи вида 0-30, начало < конца."); return [+m[1], +m[2]]; });
    if (!iv.length || iv.length > 8) throw new Error("От 1 до 8 встреч.");
    const ev = []; iv.forEach(([a, b], k) => { ev.push([a, 1, k]); ev.push([b, -1, k]); }); ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const fr = []; let cur = 0, best = 0; const live = [];
    fr.push(F({ ivals: iv, ivLabel: "Встречи", resLabel: "Идут сейчас", res: [], cur: -1, boxes: [B("события (x, ±1)", ev.map(([x, d]) => `${x}${d > 0 ? "+" : "−"}`))], line: 2, note: "Каждая встреча — два события. При равном x конец (−1) идёт раньше начала." }));
    ev.forEach(([x, d, k], j) => {
      cur += d; best = Math.max(best, cur); if (d > 0) live.push(k); else live.splice(live.indexOf(k), 1);
      fr.push(F({ ivals: iv, ivLabel: "Встречи", resLabel: "Идут сейчас", res: live.map(q => iv[q]), cur: k, boxes: [B("события", ev.map(([x, d]) => `${x}${d > 0 ? "+" : "−"}`), [j])], vars: { x, "идут сейчас": cur, best }, line: 5, note: `x = ${x}: ${d > 0 ? "началась" : "закончилась"} встреча [${iv[k][0]}, ${iv[k][1]}]. Одновременно: ${cur}.` }));
    });
    fr.push(F({ ivals: iv, ivLabel: "Встречи", resLabel: "Идут сейчас", res: [], cur: -1, vars: { best }, line: 5, note: `Нужно комнат: ${best} — максимум одновременных встреч. O(n log n).` }));
    return fr;
  }
};
VIZ.bridges = {
  title: "Мосты: tin и low", input: "0-1, 1-2, 2-0, 1-3, 3-4, 4-5, 5-3, 5-6", hint: "Рёбра неориентированного графа",
  code: ["def dfs(v, parent):", "    tin[v] = low[v] = timer", "    for u in g[v]:", "        if u == parent: continue", "        if tin[u] != -1: low[v] = min(low[v], tin[u])", "        else:", "            dfs(u, v); low[v] = min(low[v], low[u])", "            if low[u] > tin[v]: мост (v, u)"],
  frames(s) {
    const [n, es] = parseEdges(s), g = [...Array(n)].map(() => []); es.forEach(([a, b], i) => { g[a].push([b, i]); g[b].push([a, i]); });
    const tin = Array(n).fill(-1), low = Array(n).fill(0), ecls = {}, fr = []; let timer = 0;
    const lab = () => Object.fromEntries([...Array(n).keys()].map(v => [v, tin[v] < 0 ? "" : `${tin[v]}/${low[v]}`]));
    const snap = (v, line, note) => { const cls = {}; tin.forEach((x, i) => { if (x >= 0) cls[i] = "done"; }); if (v != null) cls[v] = "cur"; fr.push(F({ graph: { nodes: circle(n), edges: es, noW: true, ncls: cls, ecls: Object.assign({}, ecls), labels: lab() }, line, note })); };
    const dfs = (v, pe) => {
      tin[v] = low[v] = timer++; snap(v, 1, `Вход в ${v}: tin = low = ${tin[v]}. Подпись под вершиной — tin/low.`);
      for (const [u, ei] of g[v]) {
        if (ei === pe) continue;
        if (tin[u] !== -1) { if (tin[u] < low[v]) { low[v] = tin[u]; snap(v, 4, `Обратное ребро ${v}–${u}: low[${v}] = ${low[v]}.`); } }
        else {
          dfs(u, ei); low[v] = Math.min(low[v], low[u]);
          if (low[u] > tin[v]) { ecls[ei] = "skip"; snap(v, 7, `low[${u}] = ${low[u]} > tin[${v}] = ${tin[v]}: из поддерева ${u} не вернуться — ребро ${v}–${u} мост.`); }
          else snap(v, 6, `Вернулись из ${u}: low[${v}] = ${low[v]}. Ребро ${v}–${u} лежит на цикле.`);
        }
      }
    };
    for (let v = 0; v < n; v++) if (tin[v] < 0) dfs(v, -1);
    const br = Object.keys(ecls).map(i => `${es[i][0]}–${es[i][1]}`);
    snap(null, 7, br.length ? `Мосты (пунктир): ${br.join(", ")}. Один DFS — O(V + E).` : "Мостов нет: каждое ребро лежит на цикле.");
    return fr;
  }
};
