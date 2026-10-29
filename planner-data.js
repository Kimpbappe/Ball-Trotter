/* ============ Ball-Trotter : données du planificateur ============
   Ce fichier ne contient que des données. Pour mettre à jour :
   - dates de matchs : onglet "trips" plus bas (une ligne M(...) par match)
   - prix : onglets "dest" (vols, trains, hôtel par ville) et "tickets" (billets)
   Chaque valeur porte une origine (champ src) :
     "stat" = moyenne annuelle relevée par Où et Quand (ou-et-quand.net)
     "ref"  = fourchette tirée d’un article ou d’une page officielle citée
     "est"  = estimation de Ball-Trotter (ordre de grandeur, à vérifier)
   ================================================================== */
window.BTP = (function () {

  /* M(début, fin, intitulé, stade, ville-de-coût, fiabilité, billet)
     fiabilité : "ok"  = jour confirmé dans le calendrier officiel
                 "win" = week-end confirmé, jour exact à confirmer (fin = dernier jour)
                 "apx" = date approximative, à confirmer */
  function M(d, d2, t, v, dest, conf, tk) { return { d: d, d2: d2, t: t, v: v, dest: dest, conf: conf, tk: tk }; }

  var data = {
    checked: "29 octobre 2026",
    seasonEnd: "2027-06-30",

    origins: [
      { id: "paris", name: "Paris" }, { id: "lyon", name: "Lyon" }, { id: "marseille", name: "Marseille" },
      { id: "nice", name: "Nice" }, { id: "toulouse", name: "Toulouse" }, { id: "bordeaux", name: "Bordeaux" },
      { id: "nantes", name: "Nantes" }, { id: "lille", name: "Lille" }, { id: "strasbourg", name: "Strasbourg" }
    ],

    /* Quand le prix d’un vol n’est pas relevé pour une ville de départ, on le déduit du prix depuis Paris.
       Coefficients tirés des écarts observés entre villes (médianes). "eu" : vols courts, "lh" : vols longs. */
    factors: {
      eu: { paris: 1, lyon: 1.6, marseille: 1.4, nice: 1.4, toulouse: 1.45, bordeaux: 1.15, nantes: 1.95, lille: 1.3, strasbourg: 1.4 },
      lh: { paris: 1, lyon: 1.1, marseille: 1.1, nice: 1.1, toulouse: 1.15, bordeaux: 1.25, nantes: 1.3, lille: 1.1, strasbourg: 1.15 }
    },

    /* ---------- billets : prix par personne, en euros ---------- */
    tickets: {
      clasico:   { lo: 150, mid: 350, hi: 700, src: "ref", note: "Officiel d’environ 120 à 500 € (Goal), au-delà de 500 € en tribune latérale basse (Basket Mag) ; la revente dépasse souvent ces prix." },
      klass:     { lo: 100, mid: 200, hi: 450, src: "ref", note: "Meilleures places à 200 € et plus, tribunes premium au-dessus de 600 € (Basket Mag) ; les sièges bon marché partent en priorité aux membres." },
      plbig:     { lo: 120, mid: 220, hi: 400, src: "est", note: "Gros matchs de Premier League, souvent en revente." },
      plstd:     { lo: 70,  mid: 110, hi: 200, src: "ref", note: "De 70 à 150 € d’après Basket Mag ; accès surtout aux membres, sinon revente." },
      oldfirm:   { lo: 55,  mid: 150, hi: 260, src: "ref", note: "Prix officiel de 45 à 65 £, revente souvent au-dessus de 200 £ (Goal)." },
      champ:     { lo: 35,  mid: 60,  hi: 100, src: "est", note: "Championship : derby sous haute surveillance, billets limités." },
      kolnglad:  { lo: 45,  mid: 80,  hi: 150, src: "est", note: "Derby rhénan, ventes limitées." },
      bund1:     { lo: 25,  mid: 50,  hi: 90,  src: "est", note: "Union Berlin : les membres passent d’abord." },
      bundbig:   { lo: 70,  mid: 120, hi: 250, src: "est", note: "Affiche contre le Bayern." },
      bund2:     { lo: 20,  mid: 40,  hi: 80,  src: "est", note: "2. Bundesliga." },
      laliga:    { lo: 35,  mid: 100, hi: 200, src: "ref", note: "Liga au Bernabéu : de 30 à 50 € contre un petit club, 70 à 150 € en moyenne (Basket Mag, estimation du site)." },
      laligabig: { lo: 100, mid: 200, hi: 400, src: "est", note: "Derby madrilène." },
      derby_it:  { lo: 60,  mid: 130, hi: 250, src: "est", note: "Derby de Serie A." },
      seriea:    { lo: 40,  mid: 80,  hi: 180, src: "est", note: "Serie A." },
      pl_derby:  { lo: 8,   mid: 20,  hi: 40,  src: "est", note: "Ekstraklasa : billets peu chers." },
      dk:        { lo: 20,  mid: 40,  hi: 70,  src: "est", note: "Superligaen." },
      scot:      { lo: 20,  mid: 30,  hi: 45,  src: "est", note: "Scottish Premiership." },
      belg:      { lo: 20,  mid: 35,  hi: 60,  src: "est", note: "Pro League : places limitées à l’Union." },
      boca_river:{ lo: 500, mid: 700, hi: 1100, src: "ref", note: "Le prix officiel (environ 330 000 pesos en popular) est réservé aux socios. Pour un touriste, la revente part d’environ 590 dollars (≈ 500 €) et monte à plus de 1 200 dollars en platea (442 / Perfil, avril 2026)." },
      belgrade:  { lo: 5,   mid: 12,  hi: 21,  src: "ref", note: "De 600 à 2 500 dinars au dernier derby (Novosti)." },
      tr:         { lo: 30,  mid: 70,  hi: 150, src: "est", note: "Süper Lig hors derby : estimation." },
      trderby:   { lo: 50,  mid: 220, hi: 700, src: "ref", note: "Dernier GS – FB (26 octobre 2026) : de 2 800 TL (≈ 50 €) en secteur visiteur ou catégorie 11 à 40 000 TL (≈ 720 €) en catégorie 1, premium à 60 000 TL (Milli Gazete ; 1 € ≈ 55,5 TL le 29 octobre)." },
      br:        { lo: 15,  mid: 30,  hi: 60,  src: "est", note: "Brasileirão." },
      ar:        { lo: 100, mid: 200, hi: 350, src: "est", note: "Derbys argentins, accès limité aux non-membres." },
      ma:        { lo: 5,   mid: 12,  hi: 25,  src: "est", note: "Botola Pro." },
      eg:        { lo: 10,  mid: 25,  hi: 60,  src: "est", note: "Premier League égyptienne, billets souvent épuisés." },
      tn:        { lo: 5,   mid: 10,  hi: 20,  src: "est", note: "Ligue 1 tunisienne." },
      dz:        { lo: 5,   mid: 10,  hi: 20,  src: "est", note: "Ligue 1 algérienne." },
      kr:        { lo: 10,  mid: 20,  hi: 40,  src: "est", note: "K League." },
      th:        { lo: 8,   mid: 15,  hi: 30,  src: "est", note: "Thai League 1." },
      fr:        { lo: 20,  mid: 45,  hi: 90,  src: "est", note: "Ligue 1 ou Ligue 2." }
    },

    /* ---------- villes de destination ----------
       hotel : prix moyen d’une chambre double de catégorie moyenne, par nuit, hors soirs de gros matchs
       meal  : repas et transports sur place, par personne et par jour
       air   : prix moyen aller-retour en avion par personne, selon la ville de départ (voir src)
       rail  : [bas, moyen, haut] aller-retour en train par personne, selon la ville de départ (estimation) */
    dest: {
      london:     { name: "Londres", hotel: 165, meal: 65, type: "eu", air: { paris: 136, lyon: 163, marseille: 154, nice: 163, toulouse: 143, bordeaux: 106, nantes: 194 }, airSrc: "stat",
                    rail: { paris: [90, 160, 280], lille: [80, 140, 250] }, railNote: "Eurostar, environ 2 h 20 depuis Paris" },
      cologne:    { name: "Cologne", hotel: 115, meal: 55, type: "eu", air: { paris: 115 }, airSrc: "est",
                    rail: { paris: [60, 110, 200], lille: [50, 90, 170] }, railNote: "Train direct depuis Paris, environ 3 h 15" },
      krakow:     { name: "Cracovie", hotel: 85, meal: 35, type: "eu", air: { paris: 118 }, airSrc: "ref" },
      warsaw:     { name: "Varsovie", hotel: 95, meal: 40, type: "eu", air: { paris: 135 }, airSrc: "est" },
      rome:       { name: "Rome", hotel: 135, meal: 60, type: "eu", air: { paris: 126, lyon: 205, marseille: 149, nice: 157, toulouse: 187, bordeaux: 145, nantes: 248 }, airSrc: "stat" },
      istanbul:   { name: "Istanbul", hotel: 85, meal: 35, type: "lh", air: { paris: 274, lyon: 278, marseille: 280, nice: 266, toulouse: 277, bordeaux: 359, nantes: 354 }, airSrc: "stat" },
      glasgow:    { name: "Glasgow", hotel: 105, meal: 60, type: "eu", air: { paris: 156 }, airSrc: "stat" },
      dundee:     { name: "Dundee", hotel: 80, meal: 55, type: "eu", air: { paris: 190 }, airSrc: "est", airNote: "via Édimbourg ou Aberdeen" },
      barcelona:  { name: "Barcelone", hotel: 125, meal: 60, type: "eu", air: { paris: 94, lyon: 166, marseille: 172, nice: 145, toulouse: 154, bordeaux: 111, nantes: 224 }, airSrc: "stat",
                    rail: { paris: [80, 150, 260], lyon: [60, 120, 200], marseille: [60, 110, 190] }, railNote: "TGV direct, environ 6 h 50 depuis Paris" },
      madrid:     { name: "Madrid", hotel: 110, meal: 55, type: "eu", air: { paris: 130 }, airSrc: "est" },
      liverpool:  { name: "Liverpool", hotel: 105, meal: 55, type: "eu", air: { paris: 120 }, airSrc: "est",
                    rail: { paris: [130, 230, 380], lille: [120, 210, 350] }, railNote: "Eurostar jusqu’à Londres puis train : trajet long" },
      manchester: { name: "Manchester", hotel: 110, meal: 55, type: "eu", air: { paris: 103 }, airSrc: "stat",
                    rail: { paris: [130, 230, 380], lille: [120, 210, 350] }, railNote: "Eurostar jusqu’à Londres puis train : trajet long" },
      munich:     { name: "Munich", hotel: 145, meal: 60, type: "eu", air: { paris: 219 }, airSrc: "stat",
                    rail: { paris: [80, 150, 260], strasbourg: [60, 100, 180] }, railNote: "Train direct possible depuis Paris : trajet de plusieurs heures" },
      dortmund:   { name: "Dortmund", hotel: 95, meal: 50, type: "eu", air: { paris: 130 }, airSrc: "est",
                    rail: { paris: [70, 120, 220], lille: [60, 100, 190] }, railNote: "Train via Cologne ou Bruxelles" },
      milan:      { name: "Milan", hotel: 135, meal: 60, type: "eu", air: { paris: 115, lyon: 223, marseille: 190, nice: 234, toulouse: 164, bordeaux: 135, nantes: 223 }, airSrc: "stat",
                    rail: { paris: [80, 140, 250], lyon: [60, 110, 200] }, railNote: "TGV depuis Paris ou Lyon : trajet de plusieurs heures" },
      turin:      { name: "Turin", hotel: 100, meal: 55, type: "eu", air: { paris: 140 }, airSrc: "est",
                    rail: { paris: [80, 140, 250], lyon: [50, 90, 170] }, railNote: "TGV depuis Paris ou Lyon : trajet de plusieurs heures" },
      brussels:   { name: "Bruxelles", hotel: 105, meal: 60, type: "eu", air: { paris: 110 }, airSrc: "est",
                    rail: { paris: [30, 70, 140], lille: [15, 35, 70] }, railNote: "Train direct, environ 1 h 20 depuis Paris" },
      hamburg:    { name: "Hambourg", hotel: 115, meal: 60, type: "eu", air: { paris: 140 }, airSrc: "est" },
      berlin:     { name: "Berlin", hotel: 110, meal: 55, type: "eu", air: { paris: 122 }, airSrc: "stat" },
      copenhagen: { name: "Copenhague", hotel: 130, meal: 70, type: "eu", air: { paris: 146 }, airSrc: "ref" },
      belgrade:   { name: "Belgrade", hotel: 70, meal: 35, type: "eu", air: { paris: 200 }, airSrc: "est" },
      buenosaires:{ name: "Buenos Aires", hotel: 75, meal: 40, type: "lh", air: { paris: 1190 }, airSrc: "stat" },
      rio:        { name: "Rio de Janeiro", hotel: 85, meal: 45, type: "lh", air: { paris: 963 }, airSrc: "stat" },
      saopaulo:   { name: "São Paulo", hotel: 80, meal: 45, type: "lh", air: { paris: 980 }, airSrc: "est" },
      portoalegre:{ name: "Porto Alegre", hotel: 65, meal: 40, type: "lh", air: { paris: 1150 }, airSrc: "est" },
      casablanca: { name: "Casablanca", hotel: 70, meal: 30, type: "lh", air: { paris: 190 }, airSrc: "est" },
      cairo:      { name: "Le Caire", hotel: 55, meal: 25, type: "lh", air: { paris: 441, lyon: 431, marseille: 418, nice: 384, toulouse: 414, bordeaux: 441, nantes: 532 }, airSrc: "stat" },
      tunis:      { name: "Tunis", hotel: 50, meal: 25, type: "lh", air: { paris: 170 }, airSrc: "est" },
      algiers:    { name: "Alger", hotel: 70, meal: 30, type: "lh", air: { paris: 215, lyon: 278, marseille: 247, nice: 251, toulouse: 254, bordeaux: 285, nantes: 274 }, airSrc: "stat" },
      seoul:      { name: "Séoul", hotel: 95, meal: 45, type: "lh", air: { paris: 547, lyon: 689, marseille: 704, nice: 658, toulouse: 701, bordeaux: 685, nantes: 697 }, airSrc: "stat" },
      bangkok:    { name: "Bangkok", hotel: 55, meal: 30, type: "lh", air: { paris: 554, lyon: 628, marseille: 623, nice: 618, toulouse: 645, bordeaux: 654, nantes: 741 }, airSrc: "stat" },
      lyon:       { name: "Lyon", hotel: 100, meal: 55, type: "eu", air: null, local: ["lyon"],
                    rail: { paris: [40, 90, 200], marseille: [30, 70, 150], lille: [60, 110, 210], strasbourg: [50, 90, 180] }, railNote: "TGV direct" }
    },

    /* ---------- parcours : durée, arrivée la veille du match, matchs repérés ----------
       days : nombre de jours du parcours ; pre : jours d’avance sur le match
       dest et tk : valeurs par défaut quand aucun match n’est confirmé ("sans date") */
    trips: {
      "belgrade":                 { days: 3, pre: 1, dest: "belgrade", tk: "belgrade", matches: [] },
      "londres-millwall-west-ham":{ days: 3, pre: 1, dest: "london", tk: "champ", matches: [
        M("2027-02-20", null, "West Ham – Millwall", "London Stadium", "london", "ok", "champ")] },
      "cologne-gladbach":         { days: 3, pre: 0, dest: "cologne", tk: "kolnglad", matches: [
        M("2027-02-19", "2027-02-21", "Gladbach – Cologne", "Borussia-Park", "cologne", "win", "kolnglad")] },
      "lyon-saint-etienne":       { days: 3, pre: 1, dest: "lyon", tk: "fr", matches: [] },
      "pologne":                  { days: 4, pre: 1, dest: "krakow", tk: "pl_derby", matches: [
        M("2026-11-07", null, "Wisła Cracovie – Cracovia", "", "krakow", "ok", "pl_derby"),
        M("2027-05-01", null, "Cracovia – Wisła Cracovie", "", "krakow", "ok", "pl_derby")] },
      "rome":                     { days: 3, pre: 1, dest: "rome", tk: "derby_it", matches: [
        M("2026-12-12", "2026-12-14", "Lazio – Roma", "Stadio Olimpico", "rome", "apx", "derby_it"),
        M("2027-04-17", "2027-04-19", "Roma – Lazio", "Stadio Olimpico", "rome", "apx", "derby_it")] },
      "istanbul":                 { days: 3, pre: 1, dest: "istanbul", tk: "trderby", matches: [] },
      "glasgow":                  { days: 3, pre: 1, dest: "glasgow", tk: "oldfirm", matches: [
        M("2027-01-02", null, "Rangers – Celtic", "Ibrox", "glasgow", "ok", "oldfirm"),
        M("2027-02-27", null, "Celtic – Rangers", "Celtic Park", "glasgow", "ok", "oldfirm")] },
      "el-clasico":               { days: 4, pre: 1, dest: "madrid", tk: "clasico", matches: [
        M("2027-05-08", "2027-05-09", "Real Madrid – Barça (Clásico)", "Santiago Bernabéu", "madrid", "win", "clasico")] },
      "liverpool-manchester":     { days: 3, pre: 1, dest: "liverpool", tk: "plstd", matches: [
        M("2026-10-31", null, "Liverpool – Arsenal", "Anfield", "liverpool", "ok", "plbig"),
        M("2026-11-07", null, "Manchester United – Aston Villa", "Old Trafford", "manchester", "ok", "plstd"),
        M("2026-11-21", null, "Liverpool – Manchester United", "Anfield", "liverpool", "ok", "plbig"),
        M("2026-11-28", null, "Manchester United – Brentford", "Old Trafford", "manchester", "ok", "plstd"),
        M("2026-12-02", null, "Liverpool – Sunderland", "Anfield", "liverpool", "ok", "plstd"),
        M("2026-12-05", null, "Manchester United – Coventry", "Old Trafford", "manchester", "ok", "plstd"),
        M("2026-12-12", null, "Liverpool – Leeds", "Anfield", "liverpool", "ok", "plstd"),
        M("2026-12-19", null, "Liverpool – Tottenham", "Anfield", "liverpool", "ok", "plstd"),
        M("2026-12-26", null, "Manchester United – Nottingham Forest", "Old Trafford", "manchester", "ok", "plstd"),
        M("2026-12-30", null, "Manchester United – Sunderland", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-01-02", null, "Liverpool – Coventry", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-01-06", null, "Manchester United – Newcastle", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-01-16", null, "Liverpool – Crystal Palace", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-01-23", null, "Manchester United – Liverpool", "Old Trafford", "manchester", "ok", "plbig"),
        M("2027-01-30", null, "Liverpool – Everton", "Anfield", "liverpool", "ok", "plbig"),
        M("2027-02-06", null, "Manchester United – Chelsea", "Old Trafford", "manchester", "ok", "plbig"),
        M("2027-02-10", null, "Manchester United – Brighton", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-02-20", null, "Liverpool – Hull", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-03-03", null, "Liverpool – Aston Villa", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-03-13", null, "Liverpool – Ipswich", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-03-13", null, "Manchester United – Everton", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-04-10", null, "Liverpool – Newcastle", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-04-10", null, "Manchester United – Hull", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-04-24", null, "Manchester United – Crystal Palace", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-05-01", null, "Liverpool – Chelsea", "Anfield", "liverpool", "ok", "plbig"),
        M("2027-05-15", null, "Liverpool – Brentford", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-05-15", null, "Manchester United – Leeds", "Old Trafford", "manchester", "ok", "plstd"),
        M("2027-05-30", null, "Liverpool – Bournemouth", "Anfield", "liverpool", "ok", "plstd"),
        M("2027-05-30", null, "Manchester United – Fulham", "Old Trafford", "manchester", "ok", "plstd")] },
      "bayern-dortmund":          { days: 4, pre: 1, dest: "munich", tk: "klass", matches: [
        M("2026-10-30", "2026-11-01", "Bayern – Dortmund (Klassiker)", "Allianz Arena", "munich", "win", "klass"),
        M("2027-03-05", "2027-03-07", "Dortmund – Bayern (Klassiker)", "Signal Iduna Park", "dortmund", "win", "klass")] },
      "milan-turin":              { days: 4, pre: 1, dest: "milan", tk: "derby_it", matches: [
        M("2026-10-31", "2026-11-01", "Milan – Inter", "San Siro", "milan", "apx", "derby_it"),
        M("2027-02-13", "2027-02-14", "Inter – Milan", "San Siro", "milan", "apx", "derby_it"),
        M("2027-05-15", "2027-05-16", "Juventus – Inter", "Allianz Stadium", "turin", "apx", "seriea")] },
      "varsovie-poznan":          { days: 4, pre: 1, dest: "warsaw", tk: "pl_derby", matches: [
        M("2027-04-17", null, "Lech Poznań – Legia Varsovie", "", "warsaw", "ok", "pl_derby")] },
      "istanbul-trois-geants":    { days: 4, pre: 1, dest: "istanbul", tk: "trderby", matches: [] },
      "belgique":                 { days: 3, pre: 1, dest: "brussels", tk: "belg", matches: [
        M("2026-11-08", null, "Union Saint-Gilloise – Genk", "Joseph Marien", "brussels", "ok", "belg"),
        M("2026-11-29", null, "Union Saint-Gilloise – Gand", "Joseph Marien", "brussels", "ok", "belg"),
        M("2026-12-20", null, "Union Saint-Gilloise – Club Bruges", "Joseph Marien", "brussels", "ok", "belg"),
        M("2027-01-16", null, "Union Saint-Gilloise – La Louvière", "Joseph Marien", "brussels", "ok", "belg"),
        M("2027-01-23", "2027-01-24", "Union Saint-Gilloise – Beveren", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-02-06", "2027-02-07", "Union Saint-Gilloise – Saint-Trond", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-02-20", "2027-02-21", "Union Saint-Gilloise – Westerlo", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-03-06", "2027-03-07", "Union Saint-Gilloise – Standard de Liège", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-04-03", "2027-04-04", "Union Saint-Gilloise – Malines", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-04-17", "2027-04-18", "Union Saint-Gilloise – Anvers", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-05-01", "2027-05-02", "Union Saint-Gilloise – Courtrai", "Joseph Marien", "brussels", "win", "belg"),
        M("2027-05-22", "2027-05-23", "Union Saint-Gilloise – Charleroi", "Joseph Marien", "brussels", "win", "belg")] },
      "st-pauli-union-berlin":    { days: 4, pre: 1, dest: "hamburg", tk: "bund2", matches: [
        M("2026-11-01", null, "St. Pauli – Nuremberg", "Millerntor-Stadion", "hamburg", "ok", "bund2"),
        M("2026-11-01", null, "Union Berlin – Cologne", "An der Alten Försterei", "berlin", "ok", "bund1"),
        M("2026-11-21", null, "St. Pauli – Bochum", "Millerntor-Stadion", "hamburg", "ok", "bund2"),
        M("2026-11-21", null, "Union Berlin – Leipzig", "An der Alten Försterei", "berlin", "ok", "bund1"),
        M("2026-12-04", "2026-12-06", "St. Pauli – Heidenheim", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2026-12-04", "2026-12-06", "Union Berlin – Hambourg SV", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2026-12-18", "2026-12-20", "St. Pauli – Hertha Berlin", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2026-12-18", "2026-12-20", "Union Berlin – Hoffenheim", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-01-12", "2027-01-14", "Union Berlin – Paderborn", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-01-29", "2027-01-31", "St. Pauli – Kiel", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-01-29", "2027-01-31", "Union Berlin – Leverkusen", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-02-12", "2027-02-14", "St. Pauli – Bielefeld", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-02-12", "2027-02-14", "Union Berlin – Bayern", "An der Alten Försterei", "berlin", "win", "bundbig"),
        M("2027-02-26", "2027-02-28", "St. Pauli – Cottbus", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-03-02", "2027-03-04", "Union Berlin – Augsbourg", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-03-05", "2027-03-07", "St. Pauli – Hanovre", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-03-12", "2027-03-14", "St. Pauli – Darmstadt", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-03-12", "2027-03-14", "Union Berlin – Fribourg", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-04-02", "2027-04-04", "St. Pauli – Magdebourg", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-04-02", "2027-04-04", "Union Berlin – Mayence", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-04-16", "2027-04-18", "St. Pauli – Dresde", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-04-16", "2027-04-18", "Union Berlin – Stuttgart", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-05-07", "2027-05-09", "St. Pauli – Osnabrück", "Millerntor-Stadion", "hamburg", "win", "bund2"),
        M("2027-05-07", "2027-05-09", "Union Berlin – Brême", "An der Alten Försterei", "berlin", "win", "bund1"),
        M("2027-05-22", null, "Union Berlin – Gladbach", "An der Alten Försterei", "berlin", "ok", "bund1"),
        M("2027-05-23", null, "St. Pauli – Brunswick", "Millerntor-Stadion", "hamburg", "ok", "bund2")] },
      "dundee":                   { days: 2, pre: 1, dest: "dundee", tk: "scot", matches: [
        M("2027-01-02", null, "Dundee – Dundee United", "Dens Park", "dundee", "ok", "scot"),
        M("2027-03-13", null, "Dundee United – Dundee", "Tannadice", "dundee", "ok", "scot")] },
      "ruhr":                     { days: 3, pre: 1, dest: "dortmund", tk: "klass", matches: [
        M("2027-03-05", "2027-03-07", "Dortmund – Bayern (Klassiker)", "Signal Iduna Park", "dortmund", "win", "klass")] },
      "madrid":                   { days: 3, pre: 1, dest: "madrid", tk: "laliga", matches: [
        M("2026-11-21", "2026-11-22", "Real Madrid – Celta Vigo", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2026-11-28", "2026-11-29", "Real Madrid – Alavés", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2026-12-12", "2026-12-13", "Real Madrid – Osasuna", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-01-02", "2027-01-03", "Real Madrid – Getafe", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-01-09", "2027-01-10", "Real Madrid – Levante", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-01-23", "2027-01-24", "Real Madrid – Betis", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-02-13", "2027-02-14", "Real Madrid – Athletic Bilbao", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-02-27", "2027-02-28", "Real Madrid – Valence", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-03-13", "2027-03-14", "Real Madrid – Espanyol", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-04-03", "2027-04-04", "Real Madrid – Atlético (derby)", "Santiago Bernabéu", "madrid", "win", "laligabig"),
        M("2027-04-20", "2027-04-22", "Real Madrid – Elche", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-05-08", "2027-05-09", "Real Madrid – Barça (Clásico)", "Santiago Bernabéu", "madrid", "win", "clasico"),
        M("2027-05-15", "2027-05-16", "Real Madrid – Racing Santander", "Santiago Bernabéu", "madrid", "win", "laliga"),
        M("2027-05-29", "2027-05-30", "Real Madrid – Deportivo", "Santiago Bernabéu", "madrid", "win", "laliga")] },
      "copenhague-malmo":         { days: 3, pre: 1, dest: "copenhagen", tk: "dk", matches: [
        M("2026-11-08", null, "FC Copenhague – Brøndby", "Parken", "copenhagen", "ok", "dk")] },
      "buenos-aires-superclasico":{ days: 4, pre: 1, dest: "buenosaires", tk: "boca_river", matches: [
        M("2026-11-01", null, "Boca Juniors – River Plate (Superclásico)", "La Bombonera", "buenosaires", "ok", "boca_river")] },
      "avellaneda":               { days: 2, pre: 1, dest: "buenosaires", tk: "ar", matches: [] },
      "rio":                      { days: 4, pre: 1, dest: "rio", tk: "br", matches: [] },
      "sao-paulo":                { days: 3, pre: 1, dest: "saopaulo", tk: "br", matches: [] },
      "porto-alegre":             { days: 3, pre: 1, dest: "portoalegre", tk: "br", matches: [] },
      "casablanca":               { days: 3, pre: 1, dest: "casablanca", tk: "ma", matches: [] },
      "le-caire":                 { days: 4, pre: 1, dest: "cairo", tk: "eg", matches: [] },
      "tunis":                    { days: 3, pre: 1, dest: "tunis", tk: "tn", matches: [] },
      "alger":                    { days: 3, pre: 1, dest: "algiers", tk: "dz", matches: [] },
      "seoul":                    { days: 3, pre: 1, dest: "seoul", tk: "kr", matches: [] },
      "thailande":                { days: 5, pre: 1, dest: "bangkok", tk: "th", matches: [] }
    }
  };
  return data;
})();
