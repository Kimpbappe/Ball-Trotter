// ============ À MODIFIER : tes identifiants d’affiliation ============
const AFF = {
  booking: "VOTRE_ID_BOOKING",         // paramètre aid de ton programme Booking.com
  gyg: "VOTRE_ID_GETYOURGUIDE",        // paramètre partner_id de GetYourGuide
  transport: "https://www.omio.fr/"    // remplace par ton lien profond Omio / Trainline (Awin)
};
// =====================================================================
(function () {
  let consent = null;
  try { consent = localStorage.getItem("bt-consent"); } catch (e) {}
  const ok = () => consent === "yes";
  window.BT = {
    hotels: v => "https://www.booking.com/searchresults.fr.html?ss=" + encodeURIComponent(v) + (ok() ? "&aid=" + encodeURIComponent(AFF.booking) : ""),
    acts: v => "https://www.getyourguide.fr/s/?q=" + encodeURIComponent(v) + (ok() ? "&partner_id=" + encodeURIComponent(AFF.gyg) : ""),
    train: () => ok() ? AFF.transport : "https://www.omio.fr/"
  };

  const foot = document.getElementById("site-footer");
  if (foot) foot.innerHTML =
    '<div class="wrap"><p><strong>Ball-Trotter</strong> : site indépendant, non affilié aux clubs, ligues ou stades cités.</p>' +
    '<div class="links"><a href="index.html#mentions">Mentions légales</a><a href="index.html#confidentialite">Confidentialité et cookies</a>' +
    '<button type="button" id="manage">Gérer mes cookies</button></div></div>';

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
    document.dispatchEvent(new Event("bt-consent"));
  }
  document.getElementById("yes").onclick = () => choose("yes");
  document.getElementById("no").onclick = () => choose("no");
  const m = document.getElementById("manage");
  if (m) m.onclick = () => { bar.hidden = false; };
  if (consent !== "yes" && consent !== "no") bar.hidden = false;
})();
