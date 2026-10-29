/* ============ Ball-Trotter : prochains matchs (cartes de l’accueil et pages de parcours) ============
   Données : planner-data.js. Les dates passées sont masquées automatiquement. */
(function () {
  "use strict";
  var P = window.BTP;
  if (!P) return;
  var DAY = 864e5;
  function toN(iso) { var a = iso.split("-"); return Date.UTC(+a[0], +a[1] - 1, +a[2]) / DAY; }
  function toD(n) { return new Date(n * DAY); }
  function toISO(n) { return toD(n).toISOString().slice(0, 10); }
  var now = new Date(), TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;
  var fDay = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  var fShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
  var fDayN = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });
  var fMon = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function upcoming(slug) {
    var t = P.trips[slug];
    if (!t) return [];
    return t.matches.map(function (m) { var c = {}; for (var k in m) c[k] = m[k]; c.s = toN(m.d); c.e = m.d2 ? toN(m.d2) : c.s; return c; })
      .filter(function (m) { return m.e >= TODAY; })
      .sort(function (a, b) { return a.s - b.s; });
  }
  function when(m) {
    if (m.s === m.e) return fDay.format(toD(m.s));
    return "Week-end du " + fDayN.format(toD(m.s)) + " au " + fShort.format(toD(m.e));
  }
  var conf = { ok: "Date confirmée, horaire à vérifier", win: "Week-end confirmé, jour et heure à préciser", apx: "Week-end indicatif, jour et heure à préciser" };

  /* cartes de l’accueil : prochain match repéré */
  Array.prototype.forEach.call(document.querySelectorAll("[data-next]"), function (el) {
    var l = upcoming(el.getAttribute("data-next"));
    if (!l.length) { el.textContent = P.trips[el.getAttribute("data-next")] ? "Pas de match daté pour le moment." : ""; return; }
    var m = l[0];
    el.textContent = "Prochain match repéré : " + (m.s === m.e ? fShort.format(toD(m.s)) : "week-end du " + fDayN.format(toD(m.s)) + " au " + fShort.format(toD(m.e))) + (m.conf === "ok" ? "" : " (à confirmer)");
  });

  /* page de parcours : liste des matchs */
  var box = document.getElementById("matchs");
  if (box) {
    var slug = location.pathname.split("/").pop().replace(/\.html$/, "");
    var l = upcoming(slug);
    var ul = document.getElementById("mt-list");
    if (l.length && ul) {
      ul.innerHTML = l.slice(0, 10).map(function (m) {
        var du = toISO(m.s === m.e ? m.s - 1 : m.s), au = toISO(m.e + 1);
        return '<li><span class="mt-d">' + fDayN.format(toD(m.s)) + (m.s === m.e ? "" : "–" + fDayN.format(toD(m.e))) + " " + fMon.format(toD(m.e)) + '</span>' +
          '<span class="mt-t">' + esc(m.t) + "<small>" + esc(m.v || "") + " · " + when(m) + '</small></span>' +
          '<span class="mt-c">' + (m.conf === "ok" ? "" : conf[m.conf]) + "</span>" +
          '<a class="btn" href="index.html?du=' + du + "&au=" + au + '#planificateur">Estimer le coût</a></li>';
      }).join("");
      var note = box.querySelector(".mt-note");
      if (note) note.textContent = "Dates relevées le " + P.checked + " sur les calendriers publiés. Elles peuvent changer (télévision, coupes) : vérifie sur le site du club ou de la ligue avant de réserver." + (l.length > 10 ? " Seuls les 10 prochains matchs sont listés." : "");
      box.hidden = false;
    }
  }
})();
