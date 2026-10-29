// ============ À MODIFIER : tes identifiants d’affiliation ============
const AFF = {
  omioId: "8070385",                   // ton numéro de compte Omio : il sert à fabriquer le lien de suivi, voir le message de Claude
  booking: "VOTRE_ID_BOOKING",         // paramètre aid de ton programme Booking.com
  gyg: "VOTRE_ID_GETYOURGUIDE",        // paramètre partner_id de GetYourGuide
  transport: "https://www.omio.fr/"    // remplace par ton lien profond Omio / Trainline (Awin)
};
// =====================================================================
(function () {
  let consent = null;
  try { consent = localStorage.getItem("bt-consent"); } catch (e) {}
  const ok = () => consent === "yes";
  // Drapeaux : flag-icons (licence MIT, voir images/flags/LICENSE-flag-icons.txt)
  const FL = { "Allemagne": ["de"], "Angleterre": ["gb-eng"], "Espagne": ["es"], "Italie": ["it"], "Serbie": ["rs"], "Belgique": ["be"],
    "Écosse": ["gb-sct"], "France": ["fr"], "Pologne": ["pl"], "Danemark": ["dk"], "Suède": ["se"], "Danemark et Suède": ["dk", "se"], "Turquie": ["tr"],
    "Argentine": ["ar"], "Brésil": ["br"], "Maroc": ["ma"], "Égypte": ["eg"], "Tunisie": ["tn"], "Algérie": ["dz"], "Corée du Sud": ["kr"], "Thaïlande": ["th"], "Europe": ["eu"] };
  const flag = c => '<img class="flag" src="images/flags/' + c + '.svg" alt="" width="24" height="18" loading="lazy">';
  window.BT = {
    flag: flag,
    flagsOf: name => (FL[name] || []).map(flag).join(""),
    // o (facultatif) : { inDate: "AAAA-MM-JJ", outDate: "AAAA-MM-JJ", adults: 2, rooms: 1 } pour pré-remplir les dates sur Booking.com
    hotels: (v, o) => "https://www.booking.com/searchresults.fr.html?ss=" + encodeURIComponent(v) +
      (o && o.inDate && o.outDate ? "&checkin=" + o.inDate + "&checkout=" + o.outDate + "&group_adults=" + (o.adults || 2) + "&no_rooms=" + (o.rooms || 1) : "") +
      (ok() ? "&aid=" + encodeURIComponent(AFF.booking) : ""),
    acts: v => "https://www.getyourguide.fr/s/?q=" + encodeURIComponent(v) + (ok() ? "&partner_id=" + encodeURIComponent(AFF.gyg) : ""),
    train: () => ok() ? AFF.transport : "https://www.omio.fr/"
  };

  // Le pied de page est écrit dans chaque page par build.js ; ceci ne sert que si une page n’en a pas.
  const foot = document.getElementById("site-footer");
  if (foot && !foot.firstElementChild) foot.innerHTML =
    '<div class="wrap"><p><strong>Ball-Trotter</strong> : site indépendant, non affilié aux clubs, ligues ou stades cités.</p>' +
    '<div class="links"><a href="mentions-legales.html">Mentions légales</a><a href="confidentialite.html">Confidentialité et cookies</a>' +
    '<button type="button" id="manage">Gérer mes cookies</button></div></div>';

  // Boutons partenaires écrits en dur dans les pages : on leur ajoute l’identifiant si le visiteur a accepté.
  function applyAff() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-aff]"), function (a) {
      const k = a.getAttribute("data-aff"), q = a.getAttribute("data-q") || "";
      a.href = k === "hotels" ? window.BT.hotels(q) : k === "acts" ? window.BT.acts(q) : window.BT.train();
    });
  }

  const bar = document.createElement("div");
  bar.id = "cookies"; bar.hidden = true;
  bar.setAttribute("role", "dialog"); bar.setAttribute("aria-label", "Choix des cookies");
  bar.innerHTML = '<div class="in"><p>Ball-Trotter n’utilise aucun cookie de mesure d’audience ni de publicité. Nos liens partenaires (Booking.com, GetYourGuide, Omio) peuvent déposer leurs propres cookies. Si tu acceptes, nos liens incluent notre identifiant d’affiliation ; si tu refuses, ils n’en contiennent pas.</p>' +
    '<div class="acts"><button type="button" class="btn" id="no">Refuser</button><button type="button" class="btn" id="yes">Accepter</button></div></div>';
  document.body.appendChild(bar);

  function choose(v) {
    consent = v;
    try { localStorage.setItem("bt-consent", v); } catch (e) {}
    bar.hidden = true;
    applyAff();
    document.dispatchEvent(new Event("bt-consent"));
  }
  document.getElementById("yes").onclick = () => choose("yes");
  document.getElementById("no").onclick = () => choose("no");
  const m = document.getElementById("manage");
  if (m) m.onclick = () => { bar.hidden = false; };
  if (consent !== "yes" && consent !== "no") bar.hidden = false;
  applyAff();
})();
