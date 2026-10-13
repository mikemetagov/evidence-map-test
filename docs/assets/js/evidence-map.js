/* Hover evidence gap map.
   Reads map-data.json (built by scripts/build.py) and draws a grid of
   blockchain functions x outcome domains. Each bubble is one evidence grade;
   its size is the number of distinct use cases. Hover or focus a bubble to see
   the cases, click to pin the card so its links can be clicked, Esc to close. */
(function () {
  const FILTERS = [
    ["portfolio", "Portfolio"],
    ["region", "Region"],
    ["deployment_status", "Deployment status"],
    ["blockchain_added_value", "Blockchain added value"],
  ];

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k) n.append(k);
    return n;
  }

  async function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = "1";
    let data;
    try {
      const res = await fetch(root.dataset.src || "map-data.json");
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
    } catch (e) {
      root.append(el("p", { class: "egm-error", text: "The map data could not be loaded. Run python scripts/build.py and rebuild the site." }));
      return;
    }
    const cb = data.codebook;
    const caseById = Object.fromEntries(data.cases.map((c) => [c.case_id, c]));
    const gradeDef = Object.fromEntries(cb.evidence_grade.map((g) => [g.value, g.definition]));
    const gradeName = (g) => (gradeDef[g] || "").split(":")[0];
    const outcomes = cb.outcome_domain.map((o) => o.value);
    const functions = cb.blockchain_function.map((f) => f.value);
    const outcomeDef = Object.fromEntries(cb.outcome_domain.map((o) => [o.value, o.definition]));
    const functionDef = Object.fromEntries(cb.blockchain_function.map((o) => [o.value, o.definition]));
    const state = {};

    // ---- controls ----
    const controls = el("div", { class: "egm-controls", role: "group", "aria-label": "Filter the map" });
    for (const [key, label] of FILTERS) {
      const values = cb[key] ? cb[key].map((v) => v.value) : [...new Set(data.cases.map((c) => c[key]).filter(Boolean))].sort();
      const id = "egm-f-" + key;
      const sel = el("select", { id, onchange: (e) => { state[key] = e.target.value; render(); } },
        el("option", { value: "", text: "All" }), values.map((v) => el("option", { value: v, text: v })));
      controls.append(el("label", { for: id, class: "egm-filter" }, el("span", { text: label }), sel));
    }
    const reset = el("button", { type: "button", class: "egm-reset", text: "Clear filters",
      onclick: () => { controls.querySelectorAll("select").forEach((s) => (s.value = "")); for (const k in state) state[k] = ""; render(); } });
    controls.append(reset);

    const summary = el("p", { class: "egm-summary", "aria-live": "polite" });
    const legend = el("div", { class: "egm-legend", "aria-label": "Evidence grade key" },
      el("span", { class: "egm-legend-title", text: "Evidence grade" }),
      cb.evidence_grade.map((g) => el("span", { class: "egm-legend-item", title: g.definition },
        el("span", { class: "egm-dot g" + g.value }), el("span", { text: g.value + " " + gradeName(g.value) }))),
      el("span", { class: "egm-legend-note", text: "Bubble size = number of use cases" }));
    const gridWrap = el("div", { class: "egm-scroll" });
    const tableWrap = el("div", { class: "egm-records" });
    root.append(controls, legend, summary, gridWrap, tableWrap);

    // ---- hover card ----
    const card = el("div", { class: "egm-card", role: "dialog", "aria-modal": "false", hidden: "" });
    document.body.append(card);
    let hideTimer = null, pinned = null, lastPointer = "mouse";
    document.addEventListener("pointerdown", (e) => { lastPointer = e.pointerType; }, true);
    const cancelHide = () => clearTimeout(hideTimer);
    const scheduleHide = () => { cancelHide(); if (!pinned) hideTimer = setTimeout(hideCard, 220); };
    function hideCard() { card.hidden = true; if (pinned) pinned.setAttribute("aria-expanded", "false"); pinned = null; }
    card.addEventListener("mouseenter", cancelHide);
    card.addEventListener("mouseleave", scheduleHide);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !card.hidden) { const b = pinned; hideCard(); if (b) b.focus(); } });
    document.addEventListener("click", (e) => { if (!card.hidden && !card.contains(e.target) && !e.target.closest(".egm-bubble")) hideCard(); });

    function showCard(btn, cell) {
      cancelHide();
      card.replaceChildren(
        el("div", { class: "egm-card-head" },
          el("div", { class: "egm-card-cell", text: cell.fn + " \u00d7 " + cell.out }),
          el("div", { class: "egm-card-grade" }, el("span", { class: "egm-dot g" + cell.grade }),
            el("span", { text: "Grade " + cell.grade + " \u2013 " + gradeName(cell.grade) })),
          el("div", { class: "egm-card-count", text: cell.items.length + (cell.items.length === 1 ? " use case" : " use cases") }),
          el("button", { type: "button", class: "egm-card-close", "aria-label": "Close", text: "\u00d7", onclick: () => { const b = pinned; hideCard(); if (b) b.focus(); } })),
        el("ul", { class: "egm-card-list" }, cell.items.map(({ c, r }) =>
          el("li", {},
            el("a", { href: c.case_url, target: "_blank", rel: "noopener", class: "egm-case-link", text: c.title }),
            el("div", { class: "egm-meta", text: [c.case_id, c.portfolio, c.country || c.region, c.deployment_status].filter(Boolean).join(" \u00b7 ") }),
            el("div", { class: "egm-meta", text: "Blockchain added value: " + c.blockchain_added_value }),
            r.grade_rationale ? el("div", { class: "egm-rationale", text: r.grade_rationale }) : null,
            r.evidence_url ? el("a", { href: r.evidence_url, target: "_blank", rel: "noopener", class: "egm-evidence-link", text: "Evidence source \u2197" }) : null))),
        el("p", { class: "egm-card-hint", text: pinned ? "Press Esc to close" : "Click the bubble to pin this card" }));
      card.hidden = false;
      if (window.innerWidth < 600) { card.classList.add("egm-sheet"); card.style.left = ""; card.style.top = ""; return; }
      card.classList.remove("egm-sheet");
      const r = btn.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
      let left = r.right + 10, top = r.top - 8;
      if (left + w > window.innerWidth - 8) left = Math.max(8, r.left - w - 10);
      if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
      card.style.left = left + "px";
      card.style.top = top + "px";
    }
    window.addEventListener("scroll", () => { if (!pinned) card.hidden = true; }, { passive: true });

    // ---- render ----
    function render() {
      hideCard();
      const keep = data.cases.filter((c) => FILTERS.every(([k]) => !state[k] || c[k] === state[k]));
      const keepIds = new Set(keep.map((c) => c.case_id));
      const recs = data.records.filter((r) => keepIds.has(r.case_id));
      const shownCases = new Set(recs.map((r) => r.case_id));
      summary.textContent = `Showing ${shownCases.size} use case${shownCases.size === 1 ? "" : "s"} (${recs.length} use case\u2013outcome record${recs.length === 1 ? "" : "s"}).`;

      const cells = {};
      for (const r of recs) {
        const c = caseById[r.case_id];
        const key = c.blockchain_function + "|" + r.outcome_domain;
        ((cells[key] ||= {})[r.evidence_grade] ||= []).push({ c, r });
      }
      const maxN = Math.max(1, ...Object.values(cells).flatMap((g) => Object.values(g).map((a) => a.length)));

      const thead = el("thead", {}, el("tr", {},
        el("th", { class: "egm-corner", scope: "col" }, el("span", { text: "Blockchain function \u2193 / Outcome \u2192" })),
        outcomes.map((o) => el("th", { scope: "col", title: outcomeDef[o], text: o }))));
      const tbody = el("tbody", {}, functions.map((fn) => el("tr", {},
        el("th", { scope: "row", title: functionDef[fn], text: fn }),
        outcomes.map((out) => {
          const grades = cells[fn + "|" + out] || {};
          const td = el("td", { class: Object.keys(grades).length ? "" : "egm-empty" });
          const wrap = el("div", { class: "egm-bubbles" });
          for (const g of cb.evidence_grade.map((x) => x.value)) {
            const items = grades[g];
            if (!items) continue;
            const size = Math.round(26 + 22 * Math.sqrt(items.length / maxN));
            const cell = { fn, out, grade: g, items };
            const btn = el("button", {
              type: "button", class: "egm-bubble g" + g, style: `width:${size}px;height:${size}px`,
              "aria-label": `${fn}, ${out}: grade ${g} ${gradeName(g)}, ${items.length} use case${items.length === 1 ? "" : "s"}. Press Enter to open details.`,
              "aria-expanded": "false", "aria-haspopup": "dialog", text: String(items.length),
            });
            btn.addEventListener("mouseenter", () => { if (!pinned && lastPointer === "mouse") showCard(btn, cell); });
            btn.addEventListener("mouseleave", () => { if (lastPointer === "mouse") scheduleHide(); });
            btn.addEventListener("focus", () => { if (!pinned && lastPointer === "mouse") showCard(btn, cell); });
            btn.addEventListener("blur", (e) => { if (!pinned && !card.contains(e.relatedTarget)) scheduleHide(); });
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (pinned === btn) { hideCard(); return; }
              if (pinned) pinned.setAttribute("aria-expanded", "false");
              pinned = btn; btn.setAttribute("aria-expanded", "true");
              showCard(btn, cell);
              const first = card.querySelector("a"); if (first && e.detail === 0) first.focus();
            });
            wrap.append(btn);
          }
          td.append(wrap);
          return td;
        }))));
      gridWrap.replaceChildren(el("table", { class: "egm-grid" }, el("caption", { class: "egm-sr", text: "Evidence gap map: rows are blockchain functions, columns are outcome domains" }), thead, tbody));

      // accessible record list
      const sorted = [...recs].sort((a, b) => b.evidence_grade - a.evidence_grade || a.case_id.localeCompare(b.case_id));
      tableWrap.replaceChildren(el("details", {},
        el("summary", { text: `List all ${recs.length} records shown on the map` }),
        el("table", { class: "egm-list" },
          el("thead", {}, el("tr", {}, ["Use case", "Outcome", "Function", "Grade", "Portfolio"].map((h) => el("th", { scope: "col", text: h })))),
          el("tbody", {}, sorted.map((r) => { const c = caseById[r.case_id]; return el("tr", {},
            el("td", {}, el("a", { href: c.case_url, target: "_blank", rel: "noopener", text: c.title })),
            el("td", { text: r.outcome_domain }), el("td", { text: c.blockchain_function }),
            el("td", { text: r.evidence_grade + " " + gradeName(r.evidence_grade) }), el("td", { text: c.portfolio })); })))));
    }
    render();
  }

  function boot() { document.querySelectorAll("#egm").forEach(init); }
  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(boot);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
