/* ============ Ball-Trotter : planificateur (calendrier, budget, résultats) ============
   Données : planner-data.js. Parcours : tableau `trips` de la page (window.BTtrips).
   Aucune donnée n’est envoyée nulle part : tout se calcule dans le navigateur. */
(function () {
  "use strict";
  var P = window.BTP, TR = window.BTtrips;
  var root = document.getElementById("planificateur");
  if (!P || !TR || !root) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- dates : on travaille en numéro de jour (UTC) pour éviter les décalages d’heure ---------- */
  var DAY = 864e5;
  function toN(iso) { var a = iso.split("-"); return Date.UTC(+a[0], +a[1] - 1, +a[2]) / DAY; }
  function toD(n) { return new Date(n * DAY); }
  function toISO(n) { return toD(n).toISOString().slice(0, 10); }
  var F = {
    long: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    longY: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    short: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }),
    dow: new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }),
    month: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }),
    monthShort: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }),
    mon: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
  };
  function fmt(k, n) { return F[k].format(toD(n)).replace(/\.$/, "."); }
  function eur(n) { return Math.round(n).toLocaleString("fr-FR") + " €"; }
  function r5(n) { return Math.round(n / 5) * 5; }

  var now = new Date();
  var TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;
  var END = toN(P.seasonEnd);

  /* ---------- état ---------- */
  var STOPS = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000, Infinity];
  var S = { limit: 6, a: null, b: null, origin: "paris", pax: 2, mode: "cheap", hotel: "mid", meals: false, bi: 9, sort: "date", showOver: false, pick: {}, view: 0, focus: null };
  try {
    var saved = JSON.parse(localStorage.getItem("bt-planner") || "{}");
    if (saved.origin && P.origins.some(function (o) { return o.id === saved.origin; })) S.origin = saved.origin;
    if (saved.pax >= 1 && saved.pax <= 6) S.pax = saved.pax;
    if (saved.bi >= 0 && saved.bi < STOPS.length) S.bi = saved.bi;
    if (saved.mode === "cheap" || saved.mode === "train" || saved.mode === "air") S.mode = saved.mode;
    if (saved.hotel === "eco" || saved.hotel === "mid" || saved.hotel === "conf") S.hotel = saved.hotel;
    S.meals = !!saved.meals;
  } catch (e) {}
  function save() {
    try { localStorage.setItem("bt-planner", JSON.stringify({ origin: S.origin, pax: S.pax, bi: S.bi, mode: S.mode, hotel: S.hotel, meals: S.meals })); } catch (e) {}
  }

  /* ---------- données : une entrée par parcours ---------- */
  var tripBySlug = {};
  TR.forEach(function (t) { tripBySlug[t.slug] = t; });
  var PT = [];
  Object.keys(P.trips).forEach(function (id) {
    var d = P.trips[id], t = tripBySlug[id];
    if (!t) return;
    var ms = d.matches.map(function (m) { var c = {}; for (var k in m) c[k] = m[k]; c.s = toN(m.d); c.e = m.d2 ? toN(m.d2) : c.s; return c; })
      .filter(function (m) { return m.e >= TODAY; })
      .sort(function (x, y) { return x.s - y.s || x.t.localeCompare(y.t); });
    PT.push({ id: id, trip: t, days: d.days, pre: d.pre, dest: d.dest, tk: d.tk, all: d.matches.length, matches: ms });
  });

  /* index des jours : combien de matchs confirmés (ok) ou à confirmer (win) */
  var MI = {};
  PT.forEach(function (p) {
    p.matches.forEach(function (m) {
      for (var n = m.s; n <= m.e; n++) {
        var c = MI[n] || (MI[n] = { ok: 0, win: 0 });
        if (m.conf === "ok") c.ok++; else c.win++;
      }
    });
  });

  /* ---------- fenêtre de dates choisie ---------- */
  function win() {
    var ws = S.a != null ? S.a : TODAY, we = S.b != null ? S.b : END;
    return [Math.max(ws, TODAY), we];
  }

  /* ---------- calcul des séjours et des coûts ---------- */
  function stay(p, m, w) {
    var ws = w[0], we = w[1], nightsIdeal = p.days - 1;
    var ideal = m.s === m.e ? m.s - p.pre : m.s;
    var A = Math.max(ideal, ws, TODAY);
    if (A > m.e) A = m.e;
    var B = Math.max(m.e + 1, Math.min(A + nightsIdeal, we));
    return { A: A, B: B, nights: Math.max(1, B - A), late: B > we };
  }
  function airCost(dest, org) {
    if (!dest.air) return null;
    var mid, src;
    if (dest.air[org] != null) { mid = dest.air[org]; src = dest.airSrc; }
    else if (dest.air.paris != null) { mid = Math.round(dest.air.paris * P.factors[dest.type][org]); src = "est"; }
    else return null;
    return { mode: "avion", lo: r5(mid * 0.65), mid: r5(mid), hi: r5(mid * 1.6), src: src, note: dest.airNote || "" };
  }
  function railCost(dest, org) {
    var r = dest.rail && dest.rail[org];
    if (!r) return null;
    return { mode: "train", lo: r[0], mid: r[1], hi: r[2], src: "est", note: dest.railNote || "" };
  }
  function transport(dest, org, pref) {
    if (dest.local && dest.local.indexOf(org) > -1) return { mode: "sur place", lo: 0, mid: 0, hi: 0, src: "ref", note: "", alt: null };
    var a = airCost(dest, org), t = railCost(dest, org), list = [];
    if (pref !== "train" && a) list.push(a);
    if (pref !== "air" && t) list.push(t);
    if (!list.length) return null;
    list.sort(function (x, y) { return x.mid - y.mid; });
    var best = list[0];
    var other = pref === "cheap" ? list[1] : null;
    if (pref === "cheap" && !other) other = best.mode === "avion" ? null : null;
    best.alt = other || null;
    return best;
  }
  function hotelCost(dest, nights) {
    var mult = S.hotel === "eco" ? 0.8 : S.hotel === "conf" ? 1.3 : 1;
    var rate = dest.hotel * mult, rooms = Math.ceil(S.pax / 2);
    var mid = nights * rate * rooms / S.pax;
    return { lo: mid * 0.8, mid: mid, hi: mid * 1.4, rate: Math.round(rate), nights: nights, rooms: rooms };
  }
  function option(p, m, w) {
    var dk = m ? m.dest : p.dest, dest = P.dest[dk], tk = P.tickets[m ? m.tk : p.tk];
    var st = m ? stay(p, m, w) : { A: null, B: null, nights: p.days - 1, late: false };
    var tp = transport(dest, S.origin, S.mode);
    if (!tp) return null;
    var h = hotelCost(dest, st.nights);
    var meals = S.meals ? { lo: dest.meal * 0.8 * (st.nights + 1), mid: dest.meal * (st.nights + 1), hi: dest.meal * 1.3 * (st.nights + 1) } : null;
    var lo = tp.lo + h.lo + tk.lo + (meals ? meals.lo : 0);
    var mid = tp.mid + h.mid + tk.mid + (meals ? meals.mid : 0);
    var hi = tp.hi + h.hi + tk.hi + (meals ? meals.hi : 0);
    var budget = STOPS[S.bi];
    var status = mid <= budget ? "ok" : lo <= budget ? "tight" : "over";
    return { p: p, m: m, dest: dest, tk: tk, st: st, tp: tp, h: h, meals: meals, lo: lo, mid: mid, hi: hi, status: status, key: m ? m.d + m.t : "x" };
  }

  /* ---------- calendrier ---------- */
  var cal = $("pl-cal");
  var monthIdx = function (n) { var d = toD(n); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  var MIN_M = monthIdx(TODAY), MAX_M = monthIdx(END);
  S.view = MIN_M;
  function wide() { return window.matchMedia("(min-width: 880px)").matches; }
  function monthStart(mi) { return Date.UTC(Math.floor(mi / 12), mi % 12, 1) / DAY; }
  function daysIn(mi) { return monthStart(mi + 1) - monthStart(mi); }

  function dayLabel(n) {
    var c = MI[n], s = fmt("longY", n);
    if (c && c.ok) s += ", " + c.ok + (c.ok > 1 ? " matchs confirmés" : " match confirmé");
    if (c && c.win) s += ", " + c.win + (c.win > 1 ? " matchs à date à confirmer" : " match à date à confirmer");
    return s;
  }
  function monthHtml(mi) {
    var first = monthStart(mi), dow = (toD(first).getUTCDay() + 6) % 7, nd = daysIn(mi);
    var w = win(), a = S.a, b = S.b;
    var h = '<div class="cal-m"><div class="cal-cap">' + fmt("month", first) + '</div><div class="cal-g" role="grid" aria-label="' + fmt("month", first) + '">';
    "LMMJVSD".split("").forEach(function (l, i) { h += '<span class="cal-w" aria-hidden="true">' + l + '</span>'; });
    for (var i = 0; i < dow; i++) h += "<span></span>";
    for (var d = 0; d < nd; d++) {
      var n = first + d, c = MI[n], cls = "cal-d", past = n < TODAY || n > END;
      if (n === TODAY) cls += " today";
      if (c && c.ok) cls += " ok"; else if (c && c.win) cls += " win";
      if (a != null && n === a) cls += " a";
      if (b != null && n === b) cls += " b";
      if (a != null && b != null && n > a && n < b) cls += " in";
      if (a != null && b == null && n > a) cls += " open";
      var sel = (a != null && n === a) || (b != null && n === b);
      var focusable = S.focus != null ? n === S.focus : n === (a != null ? a : Math.max(TODAY, first));
      h += '<button type="button" class="' + cls + '" data-n="' + n + '"' + (past ? " disabled" : "") + ' aria-label="' + dayLabel(n) + '" aria-pressed="' + (sel ? "true" : "false") + '" tabindex="' + (focusable && !past ? 0 : -1) + '"><span>' + (d + 1) + '</span></button>';
    }
    return h + "</div></div>";
  }
  function renderCal() {
    var cols = wide() ? 2 : 1;
    S.view = Math.max(MIN_M, Math.min(S.view, Math.max(MIN_M, MAX_M - cols + 1)));
    var h = '<div class="cal-bar"><button type="button" class="cal-nav" id="cal-prev" aria-label="Mois précédent"' + (S.view <= MIN_M ? " disabled" : "") + '>‹</button>' +
      '<span class="cal-hint" id="cal-hint"></span>' +
      '<button type="button" class="cal-nav" id="cal-next" aria-label="Mois suivant"' + (S.view + cols - 1 >= MAX_M ? " disabled" : "") + '>›</button></div><div class="cal-ms">';
    for (var i = 0; i < cols; i++) if (S.view + i <= MAX_M) h += monthHtml(S.view + i);
    cal.innerHTML = h + "</div>";
    $("cal-hint").textContent = "";
    var act = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("cal-d");
    if (act) { var f = cal.querySelector('.cal-d[tabindex="0"]'); if (f) f.focus(); }
  }
  function renderMonths() {
    var h = "", w = win(), full = S.a != null && S.b != null;
    h += '<button type="button" class="chip-btn' + (S.a == null ? " on" : "") + '" data-m="all">Toute la saison</button>';
    for (var mi = MIN_M; mi <= MAX_M; mi++) {
      var ms = Math.max(monthStart(mi), TODAY), me = monthStart(mi + 1) - 1;
      var on = full && S.a === ms && S.b === me;
      h += '<button type="button" class="chip-btn' + (on ? " on" : "") + '" data-m="' + mi + '">' + fmt("monthShort", monthStart(mi)) + "</button>";
    }
    $("pl-months").innerHTML = h;
  }
  function renderRange() {
    var t;
    if (S.a == null) t = "Toute la saison 2026-27, à partir d’aujourd’hui.";
    else if (S.b == null) t = "À partir du <b>" + fmt("long", S.a) + "</b>. Clique une seconde date pour fixer ton retour.";
    else if (S.a === S.b) t = "Le <b>" + fmt("long", S.a) + "</b> seulement.";
    else t = "Du <b>" + fmt("long", S.a) + "</b> au <b>" + fmt("long", S.b) + "</b>.";
    $("pl-range").innerHTML = t + (S.a != null ? ' <button type="button" class="link-btn" id="pl-clear">Effacer les dates</button>' : "");
  }
  function pickDay(n) {
    if (S.a == null || (S.a != null && S.b != null)) { S.a = n; S.b = null; }
    else if (n < S.a) { S.b = S.a; S.a = n; }
    else if (n === S.a) { S.b = n; }
    else S.b = n;
    S.focus = n;
    renderAll();
  }
  function setMonth(v) {
    if (v === "all") { S.a = S.b = null; S.view = MIN_M; }
    else { var mi = +v; S.a = Math.max(monthStart(mi), TODAY); S.b = monthStart(mi + 1) - 1; S.view = mi; S.focus = S.a; }
    renderAll();
  }
  cal.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.id === "cal-prev") { S.view--; renderCal(); }
    else if (b.id === "cal-next") { S.view++; renderCal(); }
    else if (b.classList.contains("cal-d") && !b.disabled) pickDay(+b.getAttribute("data-n"));
  });
  cal.addEventListener("keydown", function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains("cal-d")) return;
    var n = +t.getAttribute("data-n"), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step == null && e.key === "Home") step = -((toD(n).getUTCDay() + 6) % 7);
    if (step == null && e.key === "End") step = 6 - ((toD(n).getUTCDay() + 6) % 7);
    if (step == null) return;
    e.preventDefault();
    var m = Math.max(TODAY, Math.min(END, n + step));
    S.focus = m;
    var cols = wide() ? 2 : 1, mi = monthIdx(m);
    if (mi < S.view) S.view = mi; else if (mi > S.view + cols - 1) S.view = mi - cols + 1;
    renderCal();
    var nb = cal.querySelector('.cal-d[data-n="' + m + '"]');
    if (nb) nb.focus();
  });
  $("pl-months").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setMonth(b.getAttribute("data-m")); });
  $("pl-range").addEventListener("click", function (e) { if (e.target.id === "pl-clear") setMonth("all"); });
  var resizeT; window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(renderCal, 120); });

  /* ---------- molette du budget ---------- */
  var knob = $("knob"), N = STOPS.length, A0 = -135, SWEEP = 270, CX = 110, CY = 110, R = 84;
  function pt(deg, r) { var t = deg * Math.PI / 180; return [CX + r * Math.sin(t), CY - r * Math.cos(t)]; }
  function arc(d0, d1, r) {
    var p0 = pt(d0, r), p1 = pt(d1, r);
    return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + " A" + r + " " + r + " 0 " + ((d1 - d0) > 180 ? 1 : 0) + " 1 " + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  function angleOf(i) { return A0 + i / (N - 1) * SWEEP; }
  function budgetText(i) { return STOPS[i] === Infinity ? "Illimité" : eur(STOPS[i]); }
  (function buildKnob() {
    var ticks = "";
    for (var i = 0; i < N; i++) { var a = angleOf(i), p = pt(a, 95), q = pt(a, i % 3 === 0 ? 105 : 101); ticks += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; }
    var pent = ""; for (var k = 0; k < 5; k++) { var t = (k * 72) * Math.PI / 180; pent += (6.2 * Math.sin(t)).toFixed(2) + "," + (-6.2 * Math.cos(t)).toFixed(2) + " "; }
    knob.innerHTML = '<svg viewBox="-4 -4 228 228" aria-hidden="true" focusable="false"><g class="k-ticks">' + ticks + '</g>' +
      '<path class="k-track" d="' + arc(A0, A0 + SWEEP, R) + '"/><path class="k-fill" id="k-fill" d=""/>' +
      '<g id="k-thumb"><circle r="16" class="k-ball"/><polygon points="' + pent + '" class="k-pent"/></g></svg>' +
      '<div class="k-val"><b id="k-b"></b><span>par personne</span></div>';
  })();
  function setIdx(i) {
    S.bi = Math.max(0, Math.min(N - 1, i));
    var a = angleOf(S.bi), p = pt(a, R);
    $("k-thumb").setAttribute("transform", "translate(" + p[0].toFixed(2) + " " + p[1].toFixed(2) + ")");
    $("k-fill").setAttribute("d", S.bi === 0 ? "" : arc(A0, a, R));
    $("k-b").textContent = budgetText(S.bi);
    knob.setAttribute("aria-valuenow", S.bi);
    knob.setAttribute("aria-valuetext", STOPS[S.bi] === Infinity ? "Budget illimité" : STOPS[S.bi] + " euros par personne");
    save(); scheduleResults();
  }
  knob.setAttribute("aria-valuemin", 0); knob.setAttribute("aria-valuemax", N - 1);
  var drag = false;
  function dragTo(e) {
    var svg = knob.querySelector("svg"), r = svg.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (deg > 135 || deg < -135) deg = angleOf(S.bi) >= 0 ? 135 : -135;
    setIdx(Math.round((deg + 135) / SWEEP * (N - 1)));
  }
  knob.addEventListener("pointerdown", function (e) { drag = true; try { knob.setPointerCapture(e.pointerId); } catch (x) {} knob.focus(); dragTo(e); e.preventDefault(); });
  knob.addEventListener("pointermove", function (e) { if (drag) dragTo(e); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { knob.addEventListener(t, function () { drag = false; }); });
  knob.addEventListener("keydown", function (e) {
    var d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 3, PageDown: -3 }[e.key];
    if (d != null) { e.preventDefault(); setIdx(S.bi + d); }
    else if (e.key === "Home") { e.preventDefault(); setIdx(0); }
    else if (e.key === "End") { e.preventDefault(); setIdx(N - 1); }
  });
  var wheelT = 0;
  knob.addEventListener("wheel", function (e) {
    if (document.activeElement !== knob) return;
    e.preventDefault();
    var t = Date.now(); if (t - wheelT < 60) return; wheelT = t;
    setIdx(S.bi + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  $("kb-minus").addEventListener("click", function () { setIdx(S.bi - 1); });
  $("kb-plus").addEventListener("click", function () { setIdx(S.bi + 1); });

  /* ---------- autres réglages ---------- */
  var selO = $("pl-origin"), selP = $("pl-pax");
  selO.innerHTML = P.origins.map(function (o) { return '<option value="' + o.id + '">' + o.name + "</option>"; }).join("");
  selO.value = S.origin; selP.value = String(S.pax);
  selO.addEventListener("change", function () { S.origin = selO.value; save(); scheduleResults(); });
  selP.addEventListener("change", function () { S.pax = +selP.value; save(); scheduleResults(); });
  function seg(id, key) {
    var box = $(id);
    function paint() { Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) { var on = b.getAttribute("data-v") === S[key]; b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
    box.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S[key] = b.getAttribute("data-v"); paint(); save(); scheduleResults(); });
    paint();
  }
  seg("pl-mode", "mode"); seg("pl-hotel", "hotel");
  var chkM = $("pl-meals"); chkM.checked = S.meals;
  chkM.addEventListener("change", function () { S.meals = chkM.checked; save(); scheduleResults(); });
  $("pl-sort").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    S.sort = b.getAttribute("data-v");
    Array.prototype.forEach.call(this.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    scheduleResults();
  });

  /* ---------- résultats ---------- */
  var raf = 0;
  function scheduleResults() { S.limit = 6; if (raf) return; raf = requestAnimationFrame(function () { raf = 0; renderResults(); }); }
  var confTxt = { ok: "Date confirmée, horaire à vérifier sur le site du club ou de la ligue", win: "Week-end confirmé, jour et heure à préciser", apx: "Week-end indicatif, jour et heure à préciser" };
  var srcTxt = { stat: "moyenne observée", ref: "fourchette publiée", est: "estimation" };

  function dateBlock(m) {
    if (!m) return '<div class="res-date nodate"><span class="rd-m">Dates</span><span class="rd-d">?</span><span class="rd-w">à vérifier</span></div>';
    if (m.s === m.e) return '<div class="res-date"><span class="rd-m">' + fmt("dow", m.s) + '</span><span class="rd-d">' + toD(m.s).getUTCDate() + '</span><span class="rd-w">' + fmt("mon", m.s) + "</span></div>";
    return '<div class="res-date win"><span class="rd-m">' + "week-end" + '</span><span class="rd-d">' + toD(m.s).getUTCDate() + "–" + toD(m.e).getUTCDate() + '</span><span class="rd-w">' + fmt("mon", m.e) + "</span></div>";
  }
  function legendLine(color, label, val, src) {
    return '<li><i class="sw ' + color + '"></i><span>' + label + "</span><b>" + eur(val) + '</b><em>' + srcTxt[src] + "</em></li>";
  }
  function resCard(o, alts) {
    var p = o.p, m = o.m, bud = STOPS[S.bi];
    var orgName = P.origins.filter(function (x) { return x.id === S.origin; })[0].name;
    var parts = [["tp", o.tp.mid], ["ho", o.h.mid], ["tk", o.tk.mid]];
    if (o.meals) parts.push(["me", o.meals.mid]);
    var tot = parts.reduce(function (s, x) { return s + x[1]; }, 0) || 1;
    var bar = parts.map(function (x) { return '<span class="b-' + x[0] + '" style="flex:' + (x[1] / tot).toFixed(4) + '"></span>'; }).join("");
    var tpLabel = o.tp.mode === "sur place" ? "Déplacement local" : (o.tp.mode === "avion" ? "Avion" : "Train") + " depuis " + orgName;
    var leg = (o.tp.mode === "sur place" ? "" : legendLine("tp", tpLabel, o.tp.mid, o.tp.src)) +
      legendLine("ho", "Hôtel, " + o.st.nights + (o.st.nights > 1 ? " nuits" : " nuit") + (S.pax > 1 ? " (" + o.h.rooms + (o.h.rooms > 1 ? " chambres" : " chambre") + " pour " + S.pax + ")" : ""), o.h.mid, "est") +
      legendLine("tk", "Billet", o.tk.mid, o.tk.src) + (o.meals ? legendLine("me", "Repas et transports sur place", o.meals.mid, "est") : "");
    var altTxt = o.tp.alt ? '<p class="res-note">Autre option : ' + o.tp.alt.mode + " ≈ " + eur(o.tp.alt.mid) + (o.tp.alt.note ? " (" + esc(o.tp.alt.note) + ")" : "") + ".</p>" : "";
    var noteTp = o.tp.note ? '<p class="res-note">' + esc(o.tp.note) + ".</p>" : "";
    var badge = o.status === "ok" ? '<span class="badge ok">Dans ton budget' + (bud === Infinity ? "" : ", reste " + eur(bud - o.mid)) + "</span>" :
      o.status === "tight" ? '<span class="badge tight">Faisable en réservant tôt (dès ' + eur(o.lo) + ")</span>" : '<span class="badge over">Au-dessus de ton budget de ' + eur(o.mid - bud) + "</span>";
    var when = "";
    if (m) {
      when = '<p class="res-stay">Séjour du <b>' + fmt("long", o.st.A) + "</b> au <b>" + fmt("long", o.st.B) + "</b> (" + o.st.nights + (o.st.nights > 1 ? " nuits" : " nuit") + ").</p>" +
        '<p class="res-conf c-' + m.conf + '">' + confTxt[m.conf] + (m.conf !== "ok" ? " : garde un hôtel à annulation gratuite." : ".") + (o.st.late ? " Retour le lendemain du match." : "") + "</p>";
    } else {
      when = '<p class="res-conf c-none">Aucun match confirmé dans mon calendrier. Vérifie les dates officielles avant de réserver.</p>';
    }
    var hotelUrl = BT.hotels(o.dest.name, m ? { inDate: toISO(o.st.A), outDate: toISO(o.st.B), adults: S.pax, rooms: o.h.rooms } : { });
    var chips = "";
    if (alts && alts.length > 1) {
      var shown = alts.slice(0, 6);
      if (!shown.some(function (a) { return a.key === o.key; })) shown[5] = alts.filter(function (a) { return a.key === o.key; })[0];
      var more = alts.length - shown.length;
      chips = '<div class="alts" role="group" aria-label="Autres matchs de ce parcours dans ta période"><span>Autres matchs dans ta période :</span>' +
        shown.map(function (a) {
          return '<button type="button" class="alt" data-slug="' + p.id + '" data-key="' + esc(a.key) + '" aria-pressed="' + (a.key === o.key ? "true" : "false") + '">' + fmt("short", a.m.s) + " · " + esc(a.m.t) + "</button>";
        }).join("") + (more > 0 ? "<span>et " + more + " autres : resserre tes dates pour les voir.</span>" : "") + "</div>";
    }
    var tkTxt = '<p class="res-tk"><b>Place pour le match :</b> de ' + eur(o.tk.lo) + " à " + eur(o.tk.hi) + " selon la tribune (" + srcTxt[o.tk.src] + "). " + esc(o.tk.note) + "</p>";
    var title = m ? m.t : p.trip.title;
    var country = (p.trip.meta.split(" · ")[1] || "");
    var sub = BT.flagsOf(country) + (m ? esc(o.dest.name) + (m.v ? " · " + esc(m.v) : "") + " · parcours « " + esc(p.trip.title) + " »" : esc(p.trip.meta));
    return '<article class="res st-' + o.status + '" data-slug="' + p.id + '">' + dateBlock(m) +
      '<div class="res-main"><h3>' + esc(title) + '</h3><p class="res-sub">' + sub + "</p>" + when +
      '<div class="res-bar" aria-hidden="true">' + bar + '</div><ul class="res-leg">' + leg + "</ul>" + tkTxt + noteTp + altTxt + chips + "</div>" +
      '<div class="res-side"><div class="res-total"><b>≈ ' + eur(o.mid) + '</b><small>par personne</small><small>entre ' + eur(o.lo) + " et " + eur(o.hi) + "</small></div>" + badge +
      '<a class="btn main" rel="sponsored noopener" target="_blank" href="' + hotelUrl + '">' + (m ? "Hôtels pour ces dates" : "Voir les hôtels") + "</a>" +
      '<a class="btn" rel="sponsored noopener" target="_blank" href="' + BT.train() + '">Trains, bus et vols</a>' +
      '<a class="btn" href="#trip-' + p.id + '">Voir le parcours</a></div></article>';
  }

  function renderResults() {
    var w = win(), bud = STOPS[S.bi], out = $("pl-results");
    var dated = [], undated = [], noTrain = 0, outside = 0;
    PT.forEach(function (p) {
      if (!p.all) {
        var o = option(p, null, w);
        if (o) undated.push(o); else noTrain++;
        return;
      }
      var inWin = p.matches.filter(function (m) { return m.e >= w[0] && m.s <= w[1]; });
      if (!inWin.length) { outside++; return; }
      var opts = inWin.map(function (m) { return option(p, m, w); }).filter(Boolean);
      if (!opts.length) { noTrain++; return; }
      var chosen = null;
      if (S.pick[p.id]) chosen = opts.filter(function (x) { return x.key === S.pick[p.id]; })[0];
      if (!chosen) chosen = opts.filter(function (x) { return x.status !== "over"; })[0] || opts[0];
      dated.push({ o: chosen, alts: opts });
    });
    function cmp(a, b) { return S.sort === "price" ? a.o.mid - b.o.mid : (a.o.m ? a.o.m.s : 9e9) - (b.o.m ? b.o.m.s : 9e9) || a.o.mid - b.o.mid; }
    dated.sort(cmp);
    var okL = dated.filter(function (x) { return x.o.status !== "over"; }), overL = dated.filter(function (x) { return x.o.status === "over"; });
    var h = "";
    var winTxt = S.a == null ? "d’ici fin mai 2027" : S.b == null ? "à partir du " + fmt("long", S.a) : S.a === S.b ? "le " + fmt("long", S.a) : "du " + fmt("short", S.a) + " au " + fmt("short", S.b);
    var budTxt = bud === Infinity ? "sans limite de budget" : "pour " + eur(bud) + " ou moins par personne";
    var orgName = P.origins.filter(function (x) { return x.id === S.origin; })[0].name;
    h += '<h3 class="pl-res-h">' + (okL.length ? okL.length + (okL.length > 1 ? " parcours" : " parcours") : "Aucun parcours") + ' <span>avec un match ' + winTxt + ", " + budTxt + ", au départ de " + orgName + "</span></h3>";
    if (okL.length) {
      h += '<div class="res-list">' + okL.slice(0, S.limit).map(function (x) { return resCard(x.o, x.alts); }).join("") + "</div>";
      if (okL.length > S.limit) h += '<p class="res-moreb"><button type="button" class="btn" id="pl-more">Afficher ' + Math.min(6, okL.length - S.limit) + ' parcours de plus <span>(' + (okL.length - S.limit) + ' restants)</span></button></p>';
    }
    else {
      var cheapest = dated.length ? dated.reduce(function (m, x) { return x.o.lo < m ? x.o.lo : m; }, 9e9) : null;
      h += '<div class="res-empty"><p>' + (dated.length ? "Aucun match ne rentre dans ce budget sur cette période." : "Aucun match confirmé dans cette période.") + "</p>" +
        (dated.length ? "<p>Le moins cher commence autour de <b>" + eur(cheapest) + "</b> par personne : monte la molette ou choisis d’autres dates.</p>" : "<p>Élargis tes dates ou choisis « Toute la saison ».</p>") + "</div>";
    }
    if (overL.length) {
      h += '<details class="res-more"' + (S.showOver ? " open" : "") + '><summary>' + overL.length + (overL.length > 1 ? " parcours au-dessus de ton budget" : " parcours au-dessus de ton budget") + '</summary><div class="res-list">' + overL.map(function (x) { return resCard(x.o, x.alts); }).join("") + "</div></details>";
    }
    var uOk = undated.filter(function (x) { return x.status !== "over"; });
    var uOver = undated.filter(function (x) { return x.status === "over"; });
    if (undated.length) {
      undated.sort(function (a, b) { return a.mid - b.mid; });
      h += '<details class="res-more res-und"><summary>' + undated.length + ' parcours sans date de match confirmée</summary><p class="res-und-p">Le calendrier de ces parcours n’est pas encore fixé ou je n’ai pas pu le confirmer. Les montants servent à comparer : cherche les dates sur le site officiel du club ou de la ligue avant de réserver. ' + uOk.length + " entrent dans ton budget, " + uOver.length + " le dépassent.</p>" +
        '<div class="res-list">' + undated.map(function (o) { return resCard(o, null); }).join("") + "</div></details>";
    }
    var notes = [];
    if (outside) notes.push(outside + (outside > 1 ? " autres parcours ont" : " autre parcours a") + " des matchs hors de ta période.");
    if (noTrain) notes.push(noTrain + (noTrain > 1 ? " parcours sont masqués" : " parcours est masqué") + " : pas de trajet en train adapté depuis " + orgName + ".");
    if (notes.length) h += '<p class="res-foot">' + notes.join(" ") + "</p>";
    out.innerHTML = h;
    $("pl-status").textContent = okL.length + (okL.length > 1 ? " parcours trouvés" : " parcours trouvé") + " " + winTxt + ".";
  }
  $("pl-results").addEventListener("click", function (e) {
    var b = e.target.closest(".alt");
    if (e.target.closest("#pl-more")) { S.limit += 6; renderResults(); return; }
    if (b) { S.pick[b.getAttribute("data-slug")] = b.getAttribute("data-key"); renderResults(); return; }
    var s = e.target.closest("summary");
    if (s && s.parentNode.classList.contains("res-more") && !s.parentNode.classList.contains("res-und")) setTimeout(function () { S.showOver = s.parentNode.open; }, 0);
  });

  /* ---------- démarrage ---------- */
  function renderAll() { renderMonths(); renderRange(); renderCal(); scheduleResults(); }
  if (TODAY > END) {
    $("pl-results").innerHTML = '<div class="res-empty"><p>Le calendrier de la saison 2026-27 est terminé. Les dates de la saison suivante seront ajoutées dès la publication des calendriers officiels.</p></div>';
    return;
  }
  setIdx(S.bi);
  renderAll();
  document.addEventListener("bt-consent", scheduleResults);
})();
