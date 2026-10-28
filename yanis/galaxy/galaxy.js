/* THE WILDCAT GALAXY · exploration immersive du portfolio Wildcat.
   Route d'experimentation (/wildcat/galaxy/), en parallele de THE WILDCAT MACHINE qui reste intacte.

   Un seul Canvas 2D (pas de WebGL, donc pas de repli a prevoir), une seule boucle rAF :
   l'espace, les trois galaxies (PLAY, PROTECT, ACTIVATE), leurs matieres et les objets
   projets y vivent. Le HTML ne porte que la typographie et la video du projet ouvert.

   Parcours : enter -> universes -> galaxy (exploration libre) -> project (video plein cadre,
   nom, une phrase, KPI verifies, satellites lies) -> galaxy -> universes. Mode attract apres
   inactivite : vue globale, traversee des trois galaxies, projets emblematiques, retour a
   ENTER THE GALAXY. Toute interaction tactile rend la main.

   Donnees : /wildcat/galaxy/projects.json (une entree par projet, aucun chiffre non verifie).
   Medias : /wildcat/media/cases/<id>.mp4 et /wildcat/galaxy/posters/<id>.jpg, tous locaux. */
(function () {
  'use strict';
  /* createGalaxy(host, options) : la galaxie se monte dans n'importe quel conteneur.
     Route autonome : host #galaxy, options depuis l'URL. Dans la Machine (tombola) :
     options.embedded = true, la galaxie joue sa visite guidee pendant la generation,
     options.startUniverse ouvre d'abord l'univers choisi, api.ready() puis
     api.converge() la ferment proprement quand la proposition est prete. */
  function createGalaxy(HOST, OPT) {
  OPT = OPT || {};
  var Q = new URLSearchParams(OPT.embedded ? '' : location.search);
  /* pointer position relative to the host, so the galaxy works in a box inside a page */
  function RX(e) { return e.clientX - HOST.getBoundingClientRect().left; }
  function RY(e) { return e.clientY - HOST.getBoundingClientRect().top; }
  var CASES = 'galaxy/media/cases/', POSTERS = 'galaxy/media/posters/', MARK = 'galaxy/media/wildcat-mark.png';
  /* ---------- tokens de temps (ms), miroir de --t-* dans galaxy.css ---------- */
  var TIMES = { touch: 70, micro: 400, absorb: 850, dive: 2000, reveal: 1500, open: 1200, text: 750, exit: 420, fly: 2400, zoomOut: 2200 };
  var CFG = {
    attractMs: OPT.attractMs || parseInt(Q.get('attract') || '', 10) || 45000,   /* inactivite avant le mode attract */
    attractHoldMs: 8000,                                          /* duree d'un projet ouvert en attract */
    lite: OPT.lite || Q.get('fx') === 'lite',
    full: OPT.full || Q.get('fx') === 'full',
    previews: 2,                                                  /* videos vivantes au plus dans une galaxie */
    embedded: !!OPT.embedded,
    single: !!(OPT.single || Q.get('one') === '1' || HOST.getAttribute('data-single') === '1'),   /* une seule grande galaxie, sans PLAY / PROTECT / ACTIVATE */                                     /* dans la Machine : visite guidee, pas d'entree */
    startUniverse: OPT.startUniverse || null,
    holdMs: OPT.holdMs || 8000,                                   /* un projet reste ouvert au moins ce temps en visite */
    resumeMs: OPT.resumeMs || 20000,                              /* la visite reprend apres ce temps sans toucher */
    convergeCapMs: OPT.convergeCapMs || 45000,                    /* apres ready(), on converge au plus tard ici */
    /* affordance tactile : dire que les bulles se touchent, sans faire un site */
    /* une chaine vide supprime la ligne, rien de passe vaut l'anglais */
    texts: { touch: OPT.texts && typeof OPT.texts.touch === 'string' ? OPT.texts.touch : (OPT.single || Q.get('one') === '1' || HOST.getAttribute('data-single') === '1') ? 'DRAG TO EXPLORE · TOUCH A PROJECT' : 'TOUCH A PROJECT TO EXPLORE' },
    hint: OPT.hint != null ? !!OPT.hint : Q.get('hint') !== '0',  /* indice joue une fois au premier affichage */
    sound: OPT.sound != null ? !!OPT.sound : Q.get('sound') === '1',
    haptic: OPT.haptic != null ? !!OPT.haptic : Q.get('haptic') === '1'
  };
  /* la derive, le magnetisme, la pulsation et l'indice sont regles pour ne jamais faire
     se recouvrir deux bulles : la disposition garde 54 unites monde de marge au plus serre. */
  var DRIFT = { ax: 9, bx: 3, ay: 7, by: 2, tx: 1900, tx2: 4300, ty: 1600, ty2: 3700 };
  var MAG_R = 300, MAG_SCALE = 0.14, MAG_PULL = 0.10, MAG_PULL_MAX = 12, MAG_MS = 190;
  var PULSE_MS = 900, PULSE_MIN = 6000, PULSE_VAR = 4000, PULSE_SCALE = 0.09;
  var HINT_TRAVEL = 950, HINT_MS = 1700;
  var UNI = CFG.single ? ['protect'] : ['play', 'protect', 'activate'];
  /* galaxie unique : un nuage irregulier, allonge en largeur sur ordinateur, en hauteur sur telephone */
  function GE() { return PORT ? { rx: 720, ry: 1850 } : { rx: 2050, ry: 780 }; }
  var NM = 1.6;   /* la nebuleuse deborde l'ellipse de 60 % */
  function inE(x, y, E, k) { return (x * x) / (E.rx * E.rx) + (y * y) / (E.ry * E.ry) < (k || 1); }
  var WORLD_L = { play: { x: -1500, y: 0 }, protect: { x: 0, y: 0 }, activate: { x: 1500, y: 0 } };
  /* telephone en portrait : les trois univers s'empilent, chaque galaxie est tournee pour tenir dans la largeur */
  var WORLD_P = { play: { x: 0, y: -1800 }, protect: { x: 0, y: 0 }, activate: { x: 0, y: 1800 } };
  var WORLD = WORLD_L, PORT = false, PX = 0.86, PY = 1.5;
  function isPort(w, h) { return w / h < 0.85; }
  var GR = 560;                     /* rayon d'une galaxie, en unites monde (pixels a 1080p, zoom 1) */
  var SQ = 0.84;                    /* ecrasement vertical des orbites */
  var TAU = Math.PI * 2;
  var RGB = { play: [124, 224, 255], protect: [91, 140, 255], activate: [255, 87, 200], red: [255, 45, 31], n: [243, 243, 239], dim: [139, 139, 147] };

  function $(s, r) { return (r || HOST).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || HOST).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function rgba(k, a) { var c = RGB[k] || RGB.n; return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function hexRgb(h) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : RGB.n; }
  function rgbaHex(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  var seed = 11;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function now() { return performance.now(); }

  /* ---------- etat ---------- */
  var S = { screen: 'boot', uni: null, open: null, attract: false, lastTouch: now(), dragging: false, lite: CFG.lite, autoLite: false, tour: false, wantConverge: false, converging: false, seen: [], touched: false };
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  var DATA = null, P = [], BY = {}, OBJ = [], ECHO = [], PORTALS = [];

  /* ---------- DOM ---------- */
  HOST.classList.add('gx'); if (CFG.embedded) HOST.classList.add('embedded'); if (CFG.single) HOST.classList.add('single');
  HOST.innerHTML =
    '<canvas class="gx-canvas" id="gx-canvas" aria-hidden="true"></canvas>' +
    '<div class="gx-layer" id="gx-fx"></div>' +
    '<div class="gx-enter" id="gx-enter"><div><h1 class="gx-enter-title" id="gx-enter-title">ENTER THE GALAXY.</h1><div class="gx-mono gx-enter-hint">TOUCH TO ENTER</div></div></div>' +
    '<div class="gx-nuclei" id="gx-nuclei"></div>' +
    '<div class="gx-labels" id="gx-labels"></div>' +
    '<div class="gx-uni" id="gx-uni"><button type="button" id="gx-unibtn" data-g="universes"><i></i><span id="gx-unilabel">UNIVERSES</span></button></div>' +
    '<div class="gx-project" id="gx-project">' +
      '<div class="gx-stage" id="gx-stage"><img class="gx-bg" id="gx-bgimg" alt="" hidden><video id="gx-video" muted playsinline preload="auto"></video><img class="gx-main" id="gx-mainimg" alt="" hidden><div class="gx-veil"></div></div>' +
      '<div class="gx-text" id="gx-text"></div>' +
      '<div class="gx-related" id="gx-related"></div>' +
      '<button type="button" class="gx-back" id="gx-back" data-g="back"><i></i><span>GALAXY</span></button>' +
    '</div>' +
    '<div class="gx-touchline" id="gx-touchline"><span class="gx-mono" id="gx-touchtext"></span></div>' +
    '<div class="gx-attract gx-mono" id="gx-attract"><i></i>PORTFOLIO</div>' +
    '<div class="gx-op-zone" id="gx-op-zone"></div>';
  var canvas = $('#gx-canvas'), ctx = canvas.getContext('2d', { alpha: false });
  var W = 0, H = 0, DPR = 1, UNIT = 1, CX = 0, CY = 0;
  function resize() {
    var r = HOST.getBoundingClientRect(); W = Math.max(320, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
    DPR = S.lite ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var port = isPort(W, H);
    HOST.classList.toggle('port', port);
    if (DATA && port !== PORT) { build(DATA); ensureLabels(); if (CFG.single) makeSpace(); }
    /* portrait : a zoom 1 une galaxie entiere tient dans l'ecran (environ 800 x 1600 unites monde) */
    UNIT = port ? Math.min(W * 0.94 / 820, H * 0.84 / 1780) : H / 1080; CX = W / 2; CY = H / 2;
    if (S.screen === 'universes' || S.screen === 'enter') camSnap(viewAll());
    if (S.screen === 'galaxy' && S.uni) camSnap(viewGalaxy(S.uni));
    layoutNuclei(); measureLine();
  }
  window.addEventListener('resize', resize);

  /* ---------- camera : monde -> ecran ---------- */
  var cam = { x: 0, y: 0, z: 0.3 }, tween = null;
  function viewAll() {
    if (CFG.single) { var E0 = GE(); return { x: 0, y: 0, z: Math.min(W / (2 * E0.rx + 300) / UNIT, H / (2 * E0.ry + 300) / UNIT) }; }
    if (PORT) return { x: 0, y: 0, z: Math.min(W / (2 * GR + 160) / UNIT, H / (3600 + 2 * GR + 200) / UNIT) };
    var z = Math.min(W / (3000 + 2 * GR + 360) / UNIT, H / (2 * GR + 520) / UNIT);
    return { x: 0, y: 40, z: z };
  }
  function viewGalaxy(u) { var c = WORLD[u]; return CFG.single ? { x: 0, y: 0, z: PORT ? 0.9 : 0.74 } : { x: c.x, y: c.y, z: 1 }; }
  function camSnap(v) { cam.x = v.x; cam.y = v.y; cam.z = v.z; tween = null; }
  function camTo(v, ms, ease, done) {
    tween = { from: { x: cam.x, y: cam.y, z: cam.z }, to: v, t0: now(), ms: ms, ease: ease || easeInOut, done: done || null };
  }
  function camStep(t) {
    if (!tween) return;
    /* meme horloge que t0 : le timestamp rAF peut deriver de performance.now() (Chrome headless), la tween ne doit jamais s etirer */
    var k = clamp((now() - tween.t0) / tween.ms, 0, 1), e = tween.ease(k);
    cam.x = lerp(tween.from.x, tween.to.x, e); cam.y = lerp(tween.from.y, tween.to.y, e);
    /* zoom en log pour une plongee reguliere */
    cam.z = Math.exp(lerp(Math.log(tween.from.z), Math.log(tween.to.z), e));
    if (k >= 1) { var d = tween.done; tween = null; if (d) d(); }
  }
  function sx(wx) { return CX + (wx - cam.x) * cam.z * UNIT; }
  function sy(wy) { return CY + (wy - cam.y) * cam.z * UNIT; }
  function toWorldX(px) { return cam.x + (px - CX) / (cam.z * UNIT); }
  function toWorldY(py) { return cam.y + (py - CY) / (cam.z * UNIT); }

  /* ---------- donnees et disposition ---------- */
  function build(data) {
    DATA = data; P = data.projects.slice(); BY = {};
    var hr = HOST.getBoundingClientRect(); PORT = isPort(Math.max(1, hr.width), Math.max(1, hr.height)); WORLD = WORLD_L;
    P.forEach(function (p) { BY[p.id] = p; p.img = new Image(); p.img.decoding = 'async'; p.img.src = POSTERS + p.poster; p.ok = false; p.img.onload = function () { p.ok = true; }; });
    OBJ = []; ECHO = []; PORTALS = [];
    if (CFG.single) buildSingle();
    else UNI.forEach(function (u) {
      var c = WORLD[u], list = P.filter(function (p) { return p.universe === u; }).sort(function (a, b) { return a.priority - b.priority || a.id.localeCompare(b.id); });
      var rings = { 1: [140, 270], 2: [300, 400], 3: [410, 500] }, count = {}, idx = {};
      list.forEach(function (p) { count[p.priority] = (count[p.priority] || 0) + 1; });
      list.forEach(function (p) {
        var n = count[p.priority], i = idx[p.priority] = (idx[p.priority] || 0) + 1;
        var ring = rings[p.priority] || rings[3];
        var a = (i - 1) / n * TAU + (p.priority * 1.9) + (u === 'play' ? 0.4 : u === 'protect' ? 1.1 : 2.2);
        var r = lerp(ring[0], ring[1], rand());
        var size = p.priority === 1 ? 150 : p.priority === 2 ? 112 : 88;
        var land = p.orientation !== 'portrait';
        OBJ.push({ id: p.id, p: p, uni: u, echo: false, wx: c.x + Math.cos(a) * r, wy: c.y + Math.sin(a) * r * SQ, size: size, w: land ? size * 1.65 : size * 0.8, h: land ? size * 0.93 : size * 1.5, land: land, drift: rand() * TAU, spin: (rand() - 0.5) * 0.00012, alpha: 0, tilt: (rand() - 0.5) * 0.9 });
      });
    });
    if (CFG.single) { relax(); return; }
    /* echos : un projet a plusieurs univers apparait aussi, plus petit, au bord de son univers secondaire, face a son univers principal */
    var echoCount = {};
    P.forEach(function (p) {
      (p.also || []).forEach(function (u) {
        if (!WORLD[u]) return;
        var key = u + '>' + p.universe, n = echoCount[key] = (echoCount[key] || 0) + 1;
        var c = WORLD[u], base = portalAngle(u, p.universe);
        var a = base + (n % 2 ? 1 : -1) * (0.55 + 0.35 * Math.floor(n / 2)), r = 470 + rand() * 40;
        var size = 62, land = p.orientation !== 'portrait';
        ECHO.push({ id: p.id, p: p, uni: u, echo: true, wx: c.x + Math.cos(a) * r, wy: c.y + Math.sin(a) * r * SQ, size: size, w: land ? size * 1.65 : size * 0.8, h: land ? size * 0.93 : size * 1.5, land: land, drift: rand() * TAU, spin: 0, alpha: 0, tilt: 0 });
      });
    });
    /* portails : au bord de chaque galaxie, vers chacune des deux autres */
    UNI.forEach(function (u) {
      UNI.forEach(function (v) {
        if (u === v) return;
        var c = WORLD[u], a = portalAngle(u, v);
        PORTALS.push({ from: u, to: v, wx: c.x + Math.cos(a) * 640, wy: c.y + Math.sin(a) * 640 * SQ, r: 34, phase: rand() * TAU });
      });
    });
    relax();
    if (PORT && !CFG.single) portraitize();
  }
  /* portrait : meme disposition, axes echanges (l'horizontal devient vertical), puis on ecarte les chevauchements */
  function portraitize() {
    function swap(o, uni) { var c = WORLD_L[uni], q = WORLD_P[uni], dx = o.wx - c.x, dy = o.wy - c.y; o.wx = q.x + dy * PX; o.wy = q.y + dx * PY; }
    OBJ.concat(ECHO).forEach(function (o) { swap(o, o.uni); });
    PORTALS.forEach(function (pt) { swap(pt, pt.from); });
    WORLD = WORLD_P;
    var all = OBJ.concat(ECHO);
    for (var it = 0; it < 120; it++) {
      for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) {
        var a = all[i], b = all[j]; if (a.uni !== b.uni) continue;
        var dx = b.wx - a.wx, dy = b.wy - a.wy, minx = Math.max((a.w + b.w) / 2 + 40, 330), miny = (a.h + b.h) / 2 + 120;
        if (Math.abs(dx) < minx && Math.abs(dy) < miny) {
          var px = (minx - Math.abs(dx)) * (dx < 0 ? -1 : 1) * 0.5, py = (miny - Math.abs(dy)) * (dy < 0 ? -1 : 1) * 0.5;
          if (Math.abs(dx) / minx > Math.abs(dy) / miny) { a.wx -= px; b.wx += px; } else { a.wy -= py; b.wy += py; }
        }
      }
      all.forEach(function (o) { var c = WORLD[o.uni], half = 400 - o.w / 2; o.wx = clamp(o.wx, c.x - half, c.x + half); o.wy = clamp(o.wy, c.y - 780, c.y + 720); });
    }
    /* recentre chaque galaxie verticalement : pas de vide en haut, pas de tassement en bas */
    UNI.forEach(function (u) {
      var ys = all.filter(function (o) { return o.uni === u; }).map(function (o) { return o.wy; });
      if (!ys.length) return;
      var mid = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 - WORLD[u].y + 40;
      all.forEach(function (o) { if (o.uni === u) o.wy -= mid; });
      PORTALS.forEach(function (pt) { if (pt.from === u) pt.wy -= mid; });
    });
  }
  /* galaxie unique : tous les projets sur deux bras de spirale, les plus forts pres du coeur */
  function buildSingle() {
    var E = GE(), list = P.slice().sort(function (a, b) { return a.priority - b.priority || a.id.localeCompare(b.id); });
    list.forEach(function (p) {
      var base = p.priority === 1 ? 150 : p.priority === 2 ? 118 : 96, size = base * (0.72 + rand() * 0.66), land = p.orientation !== 'portrait';
      var w = land ? size * 1.65 : size * 0.8, h = land ? size * 0.93 : size * 1.5, best = null, bestGap = -1e9;
      /* les plus forts plutot vers le coeur, jamais deux bulles l'une sur l'autre */
      for (var tr = 0; tr < 260; tr++) {
        var pull = p.priority === 1 ? 0.62 : 0.92, x = (rand() * 2 - 1) * E.rx * pull, y = (rand() * 2 - 1) * E.ry * pull;
        if (!inE(x, y, E, 0.78)) continue;
        var gap = 1e9;
        OBJ.forEach(function (o) { gap = Math.min(gap, Math.max(Math.abs(o.wx - x) - (o.w + w) / 2 - 60, Math.abs(o.wy - y) - (o.h + h) / 2 - 110)); });
        if (gap > bestGap) { bestGap = gap; best = [x, y]; }
        if (gap > 140 && tr > 40) break;
      }
      OBJ.push({ id: p.id, p: p, uni: 'protect', echo: false, wx: best[0], wy: best[1], size: size, w: w, h: h, land: land, drift: rand() * TAU, spin: (rand() - 0.5) * 0.00012, alpha: 0, tilt: (rand() - 0.5) * 0.9 });
    });
  }
  /* l'angle, depuis une galaxie, ou vivent le portail et les echos vers une autre : les deux
     autres galaxies ne sont jamais dans la meme direction */
  function portalAngle(u, v) {
    var c = WORLD[u], o = WORLD[v], base = Math.atan2(o.y - c.y, o.x - c.x);
    var spread = (u === 'play') ? (v === 'protect' ? -0.42 : 0.42) : (u === 'activate') ? (v === 'protect' ? 0.42 : -0.42) : 0;
    return base + spread;
  }
  /* ecarte les objets qui se chevauchent, en gardant leur galaxie */
  function relax() {
    var all = OBJ.concat(ECHO);
    for (var it = 0; it < 90; it++) {
      for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) {
        var a = all[i], b = all[j]; if (a.uni !== b.uni) continue;
        var dx = b.wx - a.wx, dy = b.wy - a.wy, minx = (a.w + b.w) / 2 + 54, miny = (a.h + b.h) / 2 + 96;
        if (Math.abs(dx) < minx && Math.abs(dy) < miny) {
          var px = (minx - Math.abs(dx)) * (dx < 0 ? -1 : 1) * 0.5, py = (miny - Math.abs(dy)) * (dy < 0 ? -1 : 1) * 0.5;
          if (Math.abs(dx) / minx > Math.abs(dy) / miny) { a.wx -= px; b.wx += px; } else { a.wy -= py; b.wy += py; }
        }
      }
      all.forEach(function (o) { var c = WORLD[o.uni], dx = o.wx - c.x, dy = (o.wy - c.y) / SQ, d = Math.hypot(dx, dy), max = o.echo ? 545 : 510; if (CFG.single) { var E1 = GE(), q1 = Math.sqrt((o.wx * o.wx) / (E1.rx * E1.rx) + (o.wy * o.wy) / (E1.ry * E1.ry)); if (q1 > 0.86) { o.wx *= 0.86 / q1; o.wy *= 0.86 / q1; } return; } if (d > max) { o.wx = c.x + dx / d * max; o.wy = c.y + dy / d * max * SQ; } if (d < 90 && !o.echo) { o.wx = c.x + dx / (d || 1) * 90; } });
    }
  }
  function objectsOf(u) { return OBJ.concat(ECHO).filter(function (o) { return o.uni === u; }); }
  function objById(id) { for (var i = 0; i < OBJ.length; i++) if (OBJ[i].id === id) return OBJ[i]; return null; }

  /* ---------- particules : espace, felin, matieres des galaxies ---------- */
  var NEB = null, STARS = [], FEL = [], felinePts = [], felineAspect = 1.46, MATTER = { play: [], protect: [], activate: [] };
  function makeSpace() {
    STARS = []; var n = S.lite ? 220 : 460;
    for (var i = 0; i < n; i++) STARS.push({ x: (rand() - 0.5) * 5200, y: (rand() - 0.5) * 2600, d: 0.3 + rand() * 0.7, a: 0.15 + rand() * 0.5, s: rand() < 0.12 ? 2 : 1 });
    if (CFG.single) {
      var E = GE(), ks = ['play', 'protect', 'activate', 'n'], ns = S.lite ? 700 : 1500, CL = [];
      function gauss() { return (rand() + rand() + rand() - 1.5) / 1.5; }
      /* amas de tailles differentes, places au hasard dans le nuage */
      for (var c0 = 0; c0 < 9; c0++) { var cx0, cy0, tries = 0; do { cx0 = (rand() * 2 - 1) * E.rx * 0.8; cy0 = (rand() * 2 - 1) * E.ry * 0.8; } while (!inE(cx0, cy0, E, 0.7) && ++tries < 50);
        var rr = Math.min(E.rx, E.ry) * (0.22 + rand() * 0.55); CL.push({ x: cx0, y: cy0, rx: rr * (PORT ? 0.8 + rand() * 0.6 : 1.1 + rand() * 0.9), ry: rr * (PORT ? 1.1 + rand() * 0.9 : 0.7 + rand() * 0.5), k: ks[Math.floor(rand() * 3)], w: 0.4 + rand() }); }
      MATTER.protect = [];
      for (var q = 0; q < ns; q++) {
        var x, y;
        if (rand() < 0.7) { var cl = CL[Math.floor(rand() * CL.length)]; x = cl.x + gauss() * cl.rx; y = cl.y + gauss() * cl.ry; }
        else { x = gauss() * E.rx * 0.9; y = gauss() * E.ry * 0.9; }
        MATTER.protect.push({ x: x, y: y, k: rand() < 0.55 ? ks[Math.floor(rand() * 3)] : 'n', s: rand() < 0.12 ? 3 : rand() < 0.5 ? 2 : 1.4, ph: rand() * TAU });
      }
      /* nebuleuse peinte une fois a la forme du nuage, puis posee a l'echelle de la camera */
      var NW = 1024, NH = Math.max(256, Math.round(1024 * E.ry / E.rx)); if (NH > 1024) { NW = Math.round(1024 * E.rx / E.ry); NH = 1024; }
      NEB = document.createElement('canvas'); NEB.width = NW; NEB.height = NH; var nb = NEB.getContext('2d'), kx = NW / (2 * NM * E.rx), ky = NH / (2 * NM * E.ry);   /* marge : aucun amas coupe au bord */
      nb.globalCompositeOperation = 'lighter';
      CL.forEach(function (cl) {
        for (var b2 = 0; b2 < (S.lite ? 24 : 48); b2++) {
          var bx = (cl.x + gauss() * cl.rx + NM * E.rx) * kx, by = (cl.y + gauss() * cl.ry + NM * E.ry) * ky, rad = (40 + rand() * 120) * Math.min(kx, ky) * (0.6 + cl.w), col = RGB[rand() < 0.6 ? cl.k : ks[Math.floor(rand() * 3)]];
          var g2 = nb.createRadialGradient(bx, by, 0, bx, by, rad); g2.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.05 + 0.05 * cl.w).toFixed(3) + ')'); g2.addColorStop(1, 'rgba(0,0,0,0)');
          nb.fillStyle = g2; nb.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
        }
      });
      var big = CL.slice().sort(function (a, b) { return b.w - a.w; })[0], hx = (big.x * 0.5 + NM * E.rx) * kx, hy = (big.y * 0.5 + NM * E.ry) * ky, hr = Math.min(NW, NH) * 0.22;
      var gc = nb.createRadialGradient(hx, hy, 0, hx, hy, hr); gc.addColorStop(0, 'rgba(255,248,235,0.42)'); gc.addColorStop(0.45, 'rgba(124,224,255,0.10)'); gc.addColorStop(1, 'rgba(0,0,0,0)');
      nb.fillStyle = gc; nb.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    } else UNI.forEach(function (u) {
      MATTER[u] = []; var m = S.lite ? 70 : 140;
      for (var k = 0; k < m; k++) MATTER[u].push({ a: rand() * TAU, r: 120 + rand() * 440, v: (0.35 + rand() * 0.9) * (rand() < 0.5 ? 1 : -1), ph: rand() * TAU, y: (rand() - 0.5) * 2 });
    });
    FEL = []; for (var f = 0; f < 720; f++) FEL.push({ x: CX + (rand() - 0.5) * W, y: CY + (rand() - 0.5) * H, vx: 0, vy: 0, k: f % 3 });
  }
  function loadFeline(src) {
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        var g = c.getContext('2d'); g.drawImage(im, 0, 0);
        var d = g.getImageData(0, 0, c.width, c.height).data, pts = [];
        for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4] > 128) pts.push([x / c.width, y / c.height]);
        var sd = 7; for (var i = pts.length - 1; i > 0; i--) { sd = (sd * 9301 + 49297) % 233280; var j = sd % (i + 1); var t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
        felinePts = pts.slice(0, 720); felineAspect = c.width / c.height;
      } catch (e) { felinePts = []; }
    };
    im.onerror = function () { felinePts = []; };
    im.src = src;
  }
  function felineHome(i) {
    if (!felinePts.length) return null;
    var f = felinePts[i % felinePts.length], bh = H * 0.56, bw = bh * felineAspect;
    return { x: CX - bw / 2 + f[0] * bw, y: CY - bh * 0.56 + f[1] * bh };
  }

  /* ---------- noyaux des trois univers (ecran universes) ---------- */
  var NUC = {};
  function layoutNuclei() {
    UNI.forEach(function (u) { NUC[u] = { x: sx(WORLD[u].x), y: sy(WORLD[u].y) }; });
    $$('.gx-nu').forEach(function (el) { var n = NUC[el.getAttribute('data-u')]; if (n) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; } });
  }
  function renderNuclei() {
    $('#gx-nuclei').innerHTML = UNI.map(function (u) {
      var d = DATA.universes[u];
      return '<div class="gx-nu" data-u="' + u + '"><div class="gx-nu-word">' + esc(d.label) + '</div><div class="gx-nu-line">' + esc(d.line) + '</div></div>';
    }).join('');
    layoutNuclei();
  }

  /* ---------- rendu ---------- */
  var frames = 0, dtAvg = 16.7, last = 0, absorb = null, reveal = null, felineMix = 1, nucMix = 0, spaceMix = 0, running = true, tNow = 0;
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = last ? Math.min(50, t - last) : 16.7; last = t; tNow = t; frames++; dtAvg = dtAvg * 0.94 + dt * 0.06;
    if (!S.lite && !CFG.full && !S.autoLite && frames > 240 && dtAvg > 21) { S.autoLite = true; S.lite = true; resize(); makeSpace(); }
    if (document.hidden) return;
    camStep(t);
    /* affordance tactile : cible du doigt, pulsation, indice. Aucun timer, tout vit ici. */
    stepMagnet(); stepPulse(t); stepHint();
    /* melanges d'etats : felin (enter), noyaux (universes), espace (galaxie) */
    var wantF = S.screen === 'enter' ? 1 : 0, wantN = (S.screen === 'universes' || ((S.screen === 'attract' || S.screen === 'tour') && cam.z < 0.6)) ? 1 : 0, wantS = S.screen === 'enter' ? 0 : 1;
    felineMix += (wantF - felineMix) * Math.min(1, dt / 520); nucMix += (wantN - nucMix) * Math.min(1, dt / 620); spaceMix += (wantS - spaceMix) * Math.min(1, dt / 700);
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, W, H);
    if (spaceMix > 0.01) drawSpace(t, spaceMix);
    if (felineMix > 0.01) drawFeline(t, dt, felineMix);
    if (nucMix > 0.01 || absorb) drawNuclei(t, Math.max(nucMix, absorb ? 1 : 0));
    if (spaceMix > 0.01) { drawGalaxies(t, dt, spaceMix); }
    drawRipples(t);
    drawHint();
    if (S.screen !== 'enter' && S.screen !== 'boot') placeLabels();
    stepLine();
  }
  var gather = 0;
  function drawSpace(t, mix) {
    var z = cam.z;
    gather += ((S.converging ? 1 : 0) - gather) * 0.04;
    ctx.fillStyle = rgba('n', 1);
    for (var i = 0; i < STARS.length; i++) {
      var p = STARS[i], x = CX + (p.x - cam.x * p.d) * z * UNIT, y = CY + (p.y - cam.y * p.d) * z * UNIT;
      if (gather > 0.01) { x = lerp(x, CX, gather * 0.9); y = lerp(y, CY, gather * 0.9); }
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      ctx.globalAlpha = p.a * mix * (0.5 + 0.5 * p.d);
      ctx.fillRect(x, y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }
  function drawFeline(t, dt, mix) {
    /* lumiere rouge derriere le felin */
    var g = ctx.createRadialGradient(CX, CY * 0.98, 10, CX, CY * 0.98, H * 0.55);
    g.addColorStop(0, 'rgba(255,45,31,' + (0.16 * mix).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,45,31,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var breathe = 1 + Math.sin(t / 2600) * 0.012;
    for (var i = 0; i < FEL.length; i++) {
      var p = FEL[i], h = felineHome(i);
      var tx = h ? CX + (h.x - CX) * breathe + Math.sin(t / 900 + i) * 1.6 : CX + Math.cos(i) * 120, ty = h ? CY + (h.y - CY) * breathe + Math.cos(t / 1100 + i * 0.7) * 1.6 : CY + Math.sin(i) * 120;
      if (S.screen !== 'enter') { /* dispersion vers les trois noyaux quand on entre */
        var n = NUC[UNI[i % 3]] || { x: CX, y: CY }; tx = n.x + Math.cos(i * 2.1 + t / 1400) * 90 * UNIT; ty = n.y + Math.sin(i * 1.7 + t / 1300) * 62 * UNIT;
      }
      p.vx += (tx - p.x) * 0.06; p.vy += (ty - p.y) * 0.06; p.vx *= 0.72; p.vy *= 0.72; p.x += p.vx; p.y += p.vy;
      ctx.globalAlpha = (p.k === 0 ? 0.95 : 0.55) * mix;
      ctx.fillStyle = p.k === 2 ? rgba('red', 1) : rgba('n', 1);
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  function drawNuclei(t, mix) {
    UNI.forEach(function (u, k) {
      var n = NUC[u]; if (!n) return;
      var sel = absorb ? absorb.to === u : false, off = absorb && !sel;
      var s = sel && absorb ? 1 + easeOut(clamp((t - absorb.t0) / TIMES.absorb, 0, 1)) * 0.9 : 1;
      var a = off ? Math.max(0, 1 - (t - absorb.t0) / TIMES.absorb) : 1;
      var R = 180 * UNIT * s, x = n.x, y = n.y;
      if (off) { var m = NUC[absorb.to]; x = lerp(n.x, m.x, easeInOut(clamp((t - absorb.t0) / TIMES.absorb, 0, 1))); y = lerp(n.y, m.y, easeInOut(clamp((t - absorb.t0) / TIMES.absorb, 0, 1))); }
      ctx.lineWidth = 1; ctx.globalAlpha = mix * a;
      if (u === 'play') {
        var a0 = t / 700; ctx.strokeStyle = rgba('play', 0.55); ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.78, 0, a0, a0 + 4.6); ctx.stroke();
        ctx.strokeStyle = rgba('play', 0.25); ctx.beginPath(); ctx.ellipse(x, y, R * 0.6, R * 0.47, 0.6, a0 * 1.4, a0 * 1.4 + 3.8); ctx.stroke();
        for (var i = 0; i < 24; i++) { var ph = (t / 1400 + i / 24) % 1 * TAU; ctx.fillStyle = rgba('play', 0.75); ctx.fillRect(x + Math.cos(ph) * R, y + Math.sin(ph) * R * 0.78, 2, 2); }
      } else if (u === 'protect') {
        var st = 24 * UNIT * s; ctx.strokeStyle = rgba('protect', 0.32); ctx.beginPath();
        for (var c = -6; c <= 6; c++) { ctx.moveTo(x + c * st, y - 4 * st); ctx.lineTo(x + c * st, y + 4 * st); }
        for (var r = -4; r <= 4; r++) { ctx.moveTo(x - 6 * st, y + r * st); ctx.lineTo(x + 6 * st, y + r * st); }
        ctx.stroke();
        var syy = y + (((t / 1700) % 1) - 0.5) * 9 * st; ctx.strokeStyle = rgba('protect', 0.85); ctx.beginPath(); ctx.moveTo(x - 6 * st, syy); ctx.lineTo(x + 6 * st, syy); ctx.stroke();
      } else {
        for (var w = 0; w < 3; w++) { var q = ((t / 1500) + w / 3) % 1; ctx.strokeStyle = rgba('activate', (1 - q) * 0.6); ctx.beginPath(); ctx.ellipse(x, y, 30 + q * R, (30 + q * R) * 0.8, 0, 0, TAU); ctx.stroke(); }
      }
      /* les points de matiere de la galaxie, en germe */
      var m2 = MATTER[u];
      for (var j = 0; j < m2.length; j += 2) { var pt = m2[j], ang = pt.a + t * 0.0003 * pt.v, rr = pt.r * 0.28 * UNIT * s; ctx.fillStyle = rgba(u, 0.5); ctx.fillRect(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.78 + pt.y * 6, 1.5, 1.5); }
    });
    ctx.globalAlpha = 1;
  }
  /* la matiere d'une galaxie, ses objets, ses liens, ses portails */
  function drawGalaxies(t, dt, mix) {
    var z = cam.z, lod = clamp((z - 0.45) / 0.4, 0, 1);      /* 0 = vue globale (points), 1 = dans la galaxie (affiches) */
    for (var k0 = 0; k0 < OBJ.length; k0++) OBJ[k0].drawn = false;
    for (var k1 = 0; k1 < ECHO.length; k1++) ECHO[k1].drawn = false;
    UNI.forEach(function (u) {
      var c = WORLD[u], cx = sx(c.x), cy = sy(c.y);
      if (!CFG.single && (cx < -GR * z * UNIT * 1.4 || cx > W + GR * z * UNIT * 1.4)) return;
      var acc = u;
      /* matiere propre a l'univers */
      var m = MATTER[u], scale = z * UNIT;
      ctx.globalAlpha = mix * (0.35 + 0.45 * lod);
      if (CFG.single) {
        var E2 = GE();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (NEB) { ctx.globalAlpha = mix; ctx.drawImage(NEB, sx(-NM * E2.rx), sy(-NM * E2.ry), 2 * NM * E2.rx * scale, 2 * NM * E2.ry * scale); }
        for (var sI = 0; sI < m.length; sI++) { var sp2 = m[sI], px2 = sx(sp2.x), py2 = sy(sp2.y); if (px2 < -4 || px2 > W + 4 || py2 < -4 || py2 > H + 4) continue;
          ctx.globalAlpha = mix * (0.55 + 0.4 * Math.sin(t / 1300 + sp2.ph)); ctx.fillStyle = rgba(sp2.k, 1); ctx.fillRect(px2, py2, sp2.s, sp2.s); }
        ctx.restore();
      } else if (u === 'play') {
        ctx.lineWidth = 1;
        for (var o = 0; o < 3; o++) { ctx.strokeStyle = rgba('play', 0.10 + o * 0.03); ctx.beginPath(); ctx.ellipse(cx, cy, (190 + o * 150) * scale, (190 + o * 150) * 0.78 * scale, 0, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = rgba('play', 0.9);
        for (var i = 0; i < m.length; i++) { var p = m[i], ang = p.a + t * 0.00028 * p.v, r = p.r * scale; ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.78 + p.y * 8 * scale, 1.5 + (i % 5 === 0 ? 1 : 0), 1.5); }
      } else if (u === 'protect') {
        var st = 70 * scale; ctx.strokeStyle = rgba('protect', 0.11); ctx.lineWidth = 1; ctx.beginPath();
        for (var g1 = -7; g1 <= 7; g1++) { ctx.moveTo(cx + g1 * st, cy - 5.6 * st); ctx.lineTo(cx + g1 * st, cy + 5.6 * st); ctx.moveTo(cx - 7 * st, cy + g1 * st * 0.8); ctx.lineTo(cx + 7 * st, cy + g1 * st * 0.8); }
        ctx.stroke();
        var scan = cy + (((t / 4200) % 1) - 0.5) * 11.2 * st; ctx.strokeStyle = rgba('protect', 0.5); ctx.beginPath(); ctx.moveTo(cx - 7 * st, scan); ctx.lineTo(cx + 7 * st, scan); ctx.stroke();
        ctx.fillStyle = rgba('protect', 0.8);
        for (var i2 = 0; i2 < m.length; i2++) { var p2 = m[i2]; var gx = cx + Math.round(Math.cos(p2.a) * p2.r / 70) * st, gy = cy + Math.round(Math.sin(p2.a) * p2.r * 0.78 / 56) * st * 0.8; var tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + p2.ph)); ctx.globalAlpha = mix * tw * 0.7; ctx.fillRect(gx - 1, gy - 1, 2, 2); }
      } else {
        ctx.lineWidth = 1;
        for (var w2 = 0; w2 < 4; w2++) { var q = ((t / 5200) + w2 / 4) % 1; ctx.strokeStyle = rgba('activate', (1 - q) * 0.22); ctx.beginPath(); ctx.ellipse(cx, cy, (40 + q * 620) * scale, (40 + q * 620) * 0.78 * scale, 0, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = rgba('activate', 0.85);
        for (var i3 = 0; i3 < m.length; i3++) { var p3 = m[i3], ang3 = p3.a + Math.sin(t / 3000 + p3.ph) * 0.2, r3 = (p3.r + Math.sin(t / 1600 + p3.ph) * 40) * scale; ctx.fillRect(cx + Math.cos(ang3) * r3, cy + Math.sin(ang3) * r3 * 0.78 + p3.y * 10 * scale, 1.5, 1.5); }
      }
      ctx.globalAlpha = 1;
      var objs = objectsOf(u);
      /* liens entre projets associes de la meme galaxie, et vers les echos */
      if (lod > 0.05) {
        ctx.lineWidth = 1; ctx.setLineDash([3, 9]);
        objs.forEach(function (a) {
          (a.p.related || []).forEach(function (rid) {
            var b = objs.filter(function (o) { return o.id === rid; })[0]; if (!b || b.id < a.id) return;
            var dimA = S.open && S.open !== a.id && S.open !== b.id;
            ctx.strokeStyle = rgba(acc, (dimA ? 0.05 : 0.16) * lod * mix); ctx.beginPath(); ctx.moveTo(sx(a.wx), sy(a.wy)); ctx.lineTo(sx(b.wx), sy(b.wy)); ctx.stroke();
          });
        });
        ctx.setLineDash([]);
      }
      /* portails vers les autres galaxies */
      PORTALS.filter(function (pt) { return pt.from === u; }).forEach(function (pt) {
        var x = sx(pt.wx), y = sy(pt.wy), r = pt.r * scale, pulse = 0.5 + 0.5 * Math.sin(t / 700 + pt.phase);
        ctx.globalAlpha = mix * lod * (S.open ? 0.25 : 1);
        ctx.strokeStyle = rgba(pt.to, 0.85); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0.5, 0, TAU); ctx.stroke();
        ctx.strokeStyle = rgba(pt.to, 0.35 * pulse); ctx.beginPath(); ctx.ellipse(x, y, r * (1.5 + pulse * 0.4), r * 0.6 * (1.5 + pulse * 0.4), 0.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba(pt.to, 0.9); ctx.beginPath(); ctx.arc(x, y, 3 * scale + 1, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      });
      /* les objets vivants */
      objs.forEach(function (o) { drawObject(o, t, dt, mix, lod); });
    });
  }
  var previews = [];   /* videos vivantes dans la galaxie : { v: video, id } */
  function drawObject(o, t, dt, mix, lod) {
    /* derive au repos : deux sinus lents par axe, perceptible sans secousse */
    var x = sx(o.wx + Math.sin(t / DRIFT.tx + o.drift) * DRIFT.ax + Math.sin(t / DRIFT.tx2 + o.drift * 1.7) * DRIFT.bx);
    var y = sy(o.wy + Math.cos(t / DRIFT.ty + o.drift) * DRIFT.ay + Math.cos(t / DRIFT.ty2 + o.drift * 2.3) * DRIFT.by);
    var scale = cam.z * UNIT;
    var target = 1;
    if (S.converging) target = 0;
    else if (S.open) target = S.open === o.id ? 0 : 0.14;
    /* la revelation progressive ne concerne que les objets de la galaxie visee */
    if (reveal && reveal.order[o.id] != null && o.uni === reveal.uni) target *= clamp((t - reveal.t0 - reveal.order[o.id] * 90) / 700, 0, 1);
    o.alpha += (target - o.alpha) * Math.min(1, dt / 420);
    if (!(o.alpha >= 0)) o.alpha = 0;
    /* reaction au doigt et pulsation : la bulle grossit, puis revient seule */
    var mt = o === magO ? 1 : 0, mg = o.mag || 0;
    mg += (mt - mg) * Math.min(1, dt / MAG_MS); if (mg < 0.004 && !mt) mg = 0;
    o.mag = mg; o.pul = pulseAmp(o, t);
    var boost = 1 + mg * MAG_SCALE + o.pul * PULSE_SCALE;
    var w = o.w * scale * boost, h = o.h * scale * boost;
    /* et elle se laisse tirer un peu vers le doigt, jamais assez pour toucher sa voisine */
    if (mg > 0.004 && o === magO && ptr.has) {
      x += clamp((ptr.x - x) * MAG_PULL, -MAG_PULL_MAX * scale, MAG_PULL_MAX * scale) * mg;
      y += clamp((ptr.y - y) * MAG_PULL, -MAG_PULL_MAX * scale, MAG_PULL_MAX * scale) * mg;
    }
    var a = o.alpha * mix;
    if (a < 0.01 || x < -w || x > W + w || y < -h || y > H + h) return;
    /* pousse hors du centre quand un autre projet est ouvert */
    if (S.open && S.open !== o.id) { var so = objById(S.open); if (so && so.uni === o.uni) { var dx = o.wx - so.wx, dy = o.wy - so.wy, d = Math.hypot(dx, dy) || 1, push = 90 * scale * (1 - o.alpha / 1); x += dx / d * push; y += dy / d * push; } }
    var acc = o.p.accent || '#F3F3EF', uacc = CFG.single ? o.p.universe : o.uni;
    ctx.save(); ctx.globalAlpha = a;
    if (lod < 0.999) {
      /* vue globale : un point lumineux par projet, la quantite se voit */
      var pr = (o.p.priority === 1 ? 5 : 3) * UNIT * (0.7 + 0.3 * cam.z);
      ctx.globalAlpha = a * (1 - lod) * 0.9; ctx.fillStyle = rgbaHex(acc, 1); ctx.beginPath(); ctx.arc(x, y, pr, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgbaHex(acc, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, pr * 2.2, 0, TAU); ctx.stroke();
    }
    if (lod > 0.001) {
      ctx.globalAlpha = a * lod;
      var rad = o.uni === 'activate' ? Math.min(w, h) * 0.5 : o.uni === 'protect' ? 4 : Math.min(w, h) * 0.16;
      /* l'ornement de l'univers */
      ctx.lineWidth = 1;
      if (o.uni === 'play') {
        var R = Math.max(w, h) * 0.78, a0 = t / 900 + o.drift;
        ctx.strokeStyle = rgba('play', 0.45); ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.36, o.tilt, 0, TAU); ctx.stroke();
        var px = x + Math.cos(a0) * R, py = y + Math.sin(a0) * R * 0.36; var rx = x + (px - x) * Math.cos(o.tilt) - (py - y) * Math.sin(o.tilt), ry = y + (px - x) * Math.sin(o.tilt) + (py - y) * Math.cos(o.tilt);
        ctx.fillStyle = rgba('play', 1); ctx.beginPath(); ctx.arc(rx, ry, 2.5 * UNIT, 0, TAU); ctx.fill();
      } else if (o.uni === 'protect') {
        var b = 10 * scale; ctx.strokeStyle = rgba('protect', 0.9); ctx.beginPath();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) { var qx = x + c[0] * (w / 2 + 8 * scale), qy = y + c[1] * (h / 2 + 8 * scale); ctx.moveTo(qx - c[0] * b, qy); ctx.lineTo(qx, qy); ctx.lineTo(qx, qy - c[1] * b); });
        ctx.stroke();
      } else {
        for (var k = 0; k < 2; k++) { var q = ((t / 2400) + k / 2 + o.drift) % 1; ctx.strokeStyle = rgba('activate', (1 - q) * 0.5); ctx.beginPath(); ctx.ellipse(x, y, w / 2 + q * 40 * scale, h / 2 + q * 40 * scale, 0, 0, TAU); ctx.stroke(); }
      }
      /* la fenetre du media */
      ctx.beginPath(); roundRect(ctx, x - w / 2, y - h / 2, w, h, rad); ctx.closePath();
      ctx.strokeStyle = rgbaHex(acc, o.echo ? 0.55 : 0.85); ctx.lineWidth = o.p.priority === 1 ? 1.5 : 1; ctx.stroke();
      ctx.save(); ctx.clip();
      var src = null, pv = previewFor(o.id);
      if (pv && pv.v.readyState >= 2 && !pv.v.paused) src = pv.v;
      else if (o.p.ok) src = o.p.img;
      if (src) {
        var iw = src.videoWidth || src.naturalWidth || 16, ih = src.videoHeight || src.naturalHeight || 9, sc = Math.max(w / iw, h / ih), dw = iw * sc, dh = ih * sc;
        ctx.drawImage(src, x - dw / 2, y - dh / 2 + (o.p.subject === 'top' ? (dh - h) * 0.3 : 0), dw, dh);
      } else { ctx.fillStyle = rgbaHex(acc, 0.12); ctx.fillRect(x - w / 2, y - h / 2, w, h); }
      if (o.uni === 'protect') { var sl = y - h / 2 + ((t / 2600 + o.drift) % 1) * h; ctx.fillStyle = rgba('protect', 0.35); ctx.fillRect(x - w / 2, sl, w, 1.5); }
      if (o.echo) { ctx.fillStyle = rgbaHex(o.p.accent, 0.18); ctx.fillRect(x - w / 2, y - h / 2, w, h); }
      ctx.restore();
      /* la bulle qui reagit s'eclaire : un seul anneau, aucune geometrie nouvelle */
      var glow = Math.max(mg * 0.6, o.pul * 0.8);
      if (glow > 0.01) {
        ctx.globalAlpha = a * lod * glow;
        ctx.strokeStyle = rgbaHex(acc, 0.95); ctx.lineWidth = 2;
        ctx.beginPath(); roundRect(ctx, x - w / 2 - 5 * scale, y - h / 2 - 5 * scale, w + 10 * scale, h + 10 * scale, rad + 3); ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = a * lod;
      }
    }
    ctx.restore();
    o.sx = x; o.sy = y; o.sw = w; o.sh = h; o.drawn = true; o.visible = true;
  }
  function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); }
  var ripples = [];
  function drawRipples(t) {
    for (var i = ripples.length - 1; i >= 0; i--) {
      /* l'horodatage du rAF peut preceder now() de quelques dizaines de ms sous charge : jamais de rayon negatif */
      var r = ripples[i], age = Math.max(0, t - r.t0); if (age > 760) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(r.c || 'n', (1 - age / 760) * 0.7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, 10 + age * 0.4, 0, TAU); ctx.stroke();
    }
  }
  /* ---------- affordance tactile : dire que les bulles se touchent ----------
     Une ligne d'instruction qui cherche une bande libre, la derive au repos (dans drawObject),
     la reaction magnetique au doigt, une pulsation occasionnelle, l'indice du premier affichage
     et les retours optionnels (tic Web Audio, vibration). Tout passe par la boucle unique :
     aucun timer, aucune allocation par image. */
  var ptr = { x: 0, y: 0, has: false };
  var magO = null;                                                  /* la bulle la plus proche du doigt */
  var pulse = { o: null, t0: 0, next: 0, on: false };
  var hint = { st: CFG.hint ? 'ready' : 'off', o: null, t0: 0, fx: 0, fy: 0, tx: 0, ty: 0, x: 0, y: 0, hit: false };
  var pseed = 1013;                                                 /* tirage propre a la pulsation : le seed de la disposition ne bouge pas */
  function prand() { pseed = (pseed * 1103515245 + 12345) % 2147483648; return pseed / 2147483648; }
  /* les ecrans ou une bulle est touchable */
  function liveScreen() { var s = S.screen; return s === 'galaxy' || s === 'tour' || s === 'attract' || s === 'project'; }
  /* la bulle visible la plus proche d'un point, sans allocation */
  function nearest(x, y, r) {
    var best = null, bd = r * r, i, o, dx, dy, d;
    for (i = 0; i < OBJ.length; i++) { o = OBJ[i]; if (o.uni !== S.uni || !o.visible) continue; dx = x - o.sx; dy = y - o.sy; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
    for (i = 0; i < ECHO.length; i++) { o = ECHO[i]; if (o.uni !== S.uni || !o.visible) continue; dx = x - o.sx; dy = y - o.sy; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
    return best;
  }
  function stepMagnet() {
    if (!ptr.has || S.open || S.converging || cam.z < 0.55 || !liveScreen()) { magO = null; return; }
    magO = nearest(ptr.x, ptr.y, MAG_R * UNIT);
  }
  /* une bulle au hasard pulse toutes les 6 a 10 s, jamais pendant un mouvement de camera */
  function stepPulse(t) {
    if (pulse.on && t - pulse.t0 >= PULSE_MS) pulse.on = false;
    if (pulse.on) return;
    if (!pulse.next) { pulse.next = t + PULSE_MIN + prand() * PULSE_VAR; return; }
    if (t < pulse.next) return;
    if (S.open || S.converging || tween || cam.z < 0.55 || !liveScreen()) { pulse.next = t + 800; return; }
    var o = pickVisible(); if (!o) { pulse.next = t + 800; return; }
    pulse.o = o; pulse.t0 = t; pulse.on = true; pulse.next = t + PULSE_MIN + prand() * PULSE_VAR;
  }
  function pickVisible() {
    var n = 0, i, o;
    for (i = 0; i < OBJ.length; i++) { o = OBJ[i]; if (o.uni === S.uni && o.visible && o.alpha > 0.6 && o !== magO) n++; }
    if (!n) return null;
    var k = Math.floor(prand() * n);
    for (i = 0; i < OBJ.length; i++) { o = OBJ[i]; if (o.uni === S.uni && o.visible && o.alpha > 0.6 && o !== magO) { if (k-- <= 0) return o; } }
    return null;
  }
  function pulseAmp(o, t) { if (!pulse.on || pulse.o !== o) return 0; var k = (t - pulse.t0) / PULSE_MS; return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI); }
  /* l'indice du premier affichage : un point part du centre, touche une vraie bulle qui reagit,
     puis s'efface. Une seule fois par instance, annule par tout vrai evenement de pointeur. */
  function stepHint() {
    if (hint.st === 'running') {
      var o = hint.o, age = now() - hint.t0;
      if (!o || !o.visible || S.open || S.converging) { endHint(); return; }
      var e = easeInOut(clamp(age / HINT_TRAVEL, 0, 1));
      hint.tx = o.sx; hint.ty = o.sy;                                 /* la bulle derive : le point la suit */
      hint.x = lerp(hint.fx, hint.tx, e); hint.y = lerp(hint.fy, hint.ty, e);
      if (age >= HINT_TRAVEL && !hint.hit) { hint.hit = true; ripple(o.sx, o.sy, o.uni); o.mag = 1; }
      if (age >= HINT_MS) endHint();
      return;
    }
    if (hint.st !== 'ready' || S.open || S.converging || tween || cam.z < 0.85) return;
    if (S.screen !== 'galaxy' && S.screen !== 'tour') return;
    var target = hintTarget(); if (!target) return;
    hint.st = 'running'; hint.o = target; hint.t0 = now(); hint.hit = false;
    hint.fx = CX + 22 * UNIT; hint.fy = CY + 28 * UNIT; hint.x = hint.fx; hint.y = hint.fy;
  }
  function endHint() { hint.st = 'done'; hint.o = null; }
  /* la cible : un projet emblematique visible, proche du centre mais pas dessus */
  function hintTarget() {
    var best = null, bs = -1e9, i, o, d, s;
    for (i = 0; i < OBJ.length; i++) {
      o = OBJ[i]; if (o.uni !== S.uni || !o.visible || o.alpha < 0.7) continue;
      d = Math.hypot(o.sx - CX, o.sy - CY); if (d < 70 * UNIT) continue;
      s = (o.p.priority === 1 ? 2400 : 0) - d;
      if (s > bs) { bs = s; best = o; }
    }
    return best;
  }
  function drawHint() {
    if (hint.st !== 'running') return;
    var age = now() - hint.t0, a = age < HINT_TRAVEL ? 1 : clamp(1 - (age - HINT_TRAVEL - 180) / 520, 0, 1);
    if (a <= 0.01) return;
    var k = S.uni || 'n', r = 4.6 * UNIT, i, ka;
    ctx.globalAlpha = a;
    /* une courte traine : le point se lit comme un deplacement, pas comme un clignotement */
    if (age < HINT_TRAVEL) {
      for (i = 1; i <= 3; i++) {
        ka = (age - i * 90) / HINT_TRAVEL; if (ka <= 0) break;
        ka = easeInOut(ka);
        ctx.fillStyle = rgba(k, 0.42 - i * 0.1);
        ctx.beginPath(); ctx.arc(lerp(hint.fx, hint.tx, ka), lerp(hint.fy, hint.ty, ka), r * (1 - i * 0.22), 0, TAU); ctx.fill();
      }
    }
    ctx.fillStyle = rgba(k, 0.95); ctx.beginPath(); ctx.arc(hint.x, hint.y, r, 0, TAU); ctx.fill();
    /* le halo en anneaux : pas de degrade alloue a chaque image */
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(k, 0.32); ctx.beginPath(); ctx.arc(hint.x, hint.y, r * 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(k, 0.16); ctx.beginPath(); ctx.arc(hint.x, hint.y, r * 5.2, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  /* retours optionnels : un tic tres leger, une vibration courte. Jamais bloquants, jamais de fichier. */
  var actx = null, actxTried = false, audioState = 'none', ticks = 0, vibes = 0;
  function feedback() {
    if (CFG.haptic && navigator.vibrate) { try { navigator.vibrate(8); vibes++; } catch (e) {} }
    if (!CFG.sound) return;
    try {
      if (!actx) {
        if (actxTried) return;
        actxTried = true;
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { audioState = 'absent'; return; }
        actx = new AC();
      }
      if (actx.state === 'suspended' && actx.resume) { var rp = actx.resume(); if (rp && rp.catch) rp.catch(function () {}); }
      var t0 = actx.currentTime, osc = actx.createOscillator(), g = actx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(1180, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
      osc.connect(g); g.connect(actx.destination);
      osc.onended = function () { try { osc.disconnect(); g.disconnect(); } catch (e) {} };
      osc.start(t0); osc.stop(t0 + 0.09);
      audioState = 'on'; ticks++;
    } catch (e) { audioState = 'blocked'; }
  }
  /* la ligne d'instruction : elle se pose dans une bande libre (le haut de la scene l'est dans
     les trois galaxies), jamais sur une bulle ni sur son nom, et s'efface au premier toucher. */
  var lineEl = $('#gx-touchline'), lineOn = false, lineY = -1, lineW = 0, lineH = 0;
  var LINE_BANDS = CFG.embedded ? [0.075, 0.135, 0.955, 0.895] : [0.075, 0.135, 0.845];
  $('#gx-touchtext').textContent = CFG.texts.touch;
  function measureLine() { if (!lineEl) return; lineW = lineEl.offsetWidth || Math.round(W * 0.3); lineH = lineEl.offsetHeight || Math.round(H * 0.026); lineY = -1; }
  function lineWanted() {
    if (S.touched || !CFG.texts.touch || S.converging || cam.z < 0.55) return false;
    /* un projet ouvert occupe la scene : la ligne revient quand les bulles sont de nouveau la */
    if (S.open) return false;
    if (S.screen === 'galaxy' || S.screen === 'tour' || S.screen === 'attract') return true;
    return S.screen === 'project' && CFG.embedded;
  }
  function stepLine() {
    if (!lineEl) return;
    var want = lineWanted();
    if (want !== lineOn) { lineOn = want; lineEl.classList.toggle('on', want); if (want) measureLine(); }
    if (!want) return;
    if (lineY >= 0 && frames % 20 !== 0) return;
    var lw = lineW + 24 * UNIT, lh = lineH + 18 * UNIT;
    if (S.open) { moveLine(H * LINE_BANDS[0]); return; }              /* un projet occupe l'ecran : la ligne reste en haut */
    if (lineY >= 0 && bandOverlap(lineY, lw, lh) === 0) return;        /* la bande tenue est encore libre : rien ne bouge */
    var bestY = H * (PORT ? 0.06 : LINE_BANDS[0]), bestA = 1e12;
    var bands = PORT ? [0.06, 0.1] : LINE_BANDS;   /* telephone : la ligne reste en haut, le bas est aux portails */
    for (var b = 0; b < bands.length; b++) {
      var y = H * bands[b], area = bandOverlap(y, lw, lh);
      if (area === 0) { bestY = y; bestA = 0; break; }
      if (area < bestA) { bestA = area; bestY = y; }
    }
    moveLine(bestY);
  }
  function moveLine(y) {
    if (Math.abs(y - lineY) < 1) return;
    lineY = y; lineEl.style.transform = 'translate(-50%,' + Math.round(y - lineH / 2) + 'px)';
  }
  /* l'aire de recouvrement entre la bande de texte et les bulles visibles, leur nom compris */
  function bandOverlap(cy, lw, lh) {
    var x0 = CX - lw / 2, x1 = CX + lw / 2, y0 = cy - lh / 2, y1 = cy + lh / 2, area = 0, i;
    for (i = 0; i < OBJ.length; i++) area += rectHit(OBJ[i], x0, x1, y0, y1);
    for (i = 0; i < ECHO.length; i++) area += rectHit(ECHO[i], x0, x1, y0, y1);
    return area;
  }
  function rectHit(o, x0, x1, y0, y1) {
    if (!o.visible || o.uni !== S.uni) return 0;
    var w = Math.min(x1, o.sx + o.sw / 2 + 18 * UNIT) - Math.max(x0, o.sx - o.sw / 2 - 18 * UNIT);
    var h = Math.min(y1, o.sy + o.sh / 2 + 52 * UNIT) - Math.max(y0, o.sy - o.sh / 2 - 6 * UNIT);
    return w > 0 && h > 0 ? w * h : 0;
  }
  /* l'etat des reactions, pour la Machine et les tests */
  function magnetInfo() {
    var b = null, bm = 0.02, i, o;
    for (i = 0; i < OBJ.length; i++) { o = OBJ[i]; if ((o.mag || 0) > bm) { bm = o.mag; b = o; } }
    for (i = 0; i < ECHO.length; i++) { o = ECHO[i]; if ((o.mag || 0) > bm) { bm = o.mag; b = o; } }
    return { id: b ? b.id : null, scale: b ? Math.round((1 + bm * MAG_SCALE) * 1000) / 1000 : 1, radius: Math.round(MAG_R * UNIT) };
  }

  /* noms sous les objets : HTML positionne chaque image */
  var labelEls = {};
  function ensureLabels() {
    var box = $('#gx-labels'); box.innerHTML = ''; labelEls = {};
    OBJ.concat(ECHO).forEach(function (o) {
      var el = document.createElement('div'); el.className = 'gx-label p' + o.p.priority + (o.echo ? ' echo' : '');
      el.innerHTML = '<b>' + esc(o.p.name) + '</b><span>' + esc(o.echo ? DATA.universes[o.p.universe].label : (o.p.formats && o.p.formats[0]) || '') + '</span>';
      box.appendChild(el); labelEls[(o.echo ? 'e:' : '') + o.id + ':' + o.uni] = el;
    });
    var pb = $('#gx-labels');
    PORTALS.forEach(function (pt) { var el = document.createElement('div'); el.className = 'gx-portal-label'; el.style.color = rgba(pt.to, 0.9); el.textContent = DATA.universes[pt.to].label; pb.appendChild(el); pt.el = el; });
  }
  function placeLabels() {
    var lod = clamp((cam.z - 0.45) / 0.4, 0, 1), scale = cam.z * UNIT;
    OBJ.concat(ECHO).forEach(function (o) {
      var el = labelEls[(o.echo ? 'e:' : '') + o.id + ':' + o.uni]; if (!el) return;
      var vis = o.drawn && lod > 0.3 && o.alpha > 0.05 && spaceMix > 0.5;
      o.visible = !!o.drawn && o.alpha > 0.05;
      if (!vis) { el.style.opacity = '0'; return; }
      el.style.opacity = String(o.alpha * lod * (S.open && S.open !== o.id ? 0.12 : 1));
      el.style.transform = 'translate(' + Math.round(o.sx) + 'px,' + Math.round(o.sy + o.sh / 2 + 14 * scale) + 'px) translateX(-50%)';
      el.classList.toggle('dim', !!S.open && S.open !== o.id);
    });
    PORTALS.forEach(function (pt) { if (!pt.el) return; var x = sx(pt.wx), y = sy(pt.wy) + 52 * scale; pt.el.style.opacity = (lod > 0.5 && spaceMix > 0.5 && !S.open && pt.from === S.uni) ? '1' : '0'; pt.el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-50%)'; });
  }

  /* ---------- previews : les projets emblematiques respirent dans la galaxie ---------- */
  function previewFor(id) { for (var i = 0; i < previews.length; i++) if (previews[i].id === id) return previews[i]; return null; }
  function setPreviews(u) {
    var want = u ? OBJ.filter(function (o) { return o.uni === u && o.p.video && o.p.priority === 1; }).slice(0, CFG.previews).map(function (o) { return o.p; }) : [];
    previews.forEach(function (pv) { if (!want.some(function (p) { return p.id === pv.id; })) { try { pv.v.pause(); pv.v.removeAttribute('src'); pv.v.load(); } catch (e) {} pv.v.remove(); } });
    previews = previews.filter(function (pv) { return want.some(function (p) { return p.id === pv.id; }); });
    want.forEach(function (p) {
      if (previewFor(p.id)) return;
      var v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.style.cssText = 'position:absolute;left:-10px;top:-10px;width:8px;height:8px;opacity:0.01;pointer-events:none;';
      v.src = CASES + p.video; HOST.appendChild(v); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      previews.push({ id: p.id, v: v });
    });
  }

  /* ---------- ecrans ---------- */
  function setScreen(sc) { S.screen = sc; HOST.setAttribute('data-screen', sc); }
  function goEnter() {
    if (CFG.embedded) { startTour(); return; }
    if (CFG.single && OPT.autoEnter) { clearTimers(); setScreen('enter'); enterUniverse(); return; }
    clearTimers(); closeProjectNow(); setPreviews(null); absorb = null; reveal = null; S.uni = null; S.open = null; S.attract = false;
    /* un nouveau visiteur arrive : la ligne d'instruction revient (l'indice, lui, ne rejoue pas) */
    S.touched = false; ptr.has = false; magO = null;
    setScreen('enter'); HOST.style.setProperty('--acc', 'var(--ink)');
    $('#gx-enter').classList.add('on'); $('#gx-nuclei').classList.remove('on'); $('#gx-uni').classList.remove('on'); $('#gx-attract').classList.remove('on');
    $$('.gx-nu').forEach(function (el) { el.classList.remove('is-on', 'is-off'); });
    camTo(viewAll(), 1200, easeInOut);
    armIdle();
  }
  function goUniverses(fromGalaxy) {
    clearTimers(); closeProjectNow(); setPreviews(null); absorb = null; S.uni = null; S.open = null;
    setScreen('universes'); HOST.style.setProperty('--acc', 'var(--ink)');
    $('#gx-enter').classList.remove('on'); $('#gx-uni').classList.remove('on');
    $$('.gx-nu').forEach(function (el) { el.classList.remove('is-on', 'is-off'); });
    camTo(viewAll(), fromGalaxy ? TIMES.zoomOut : 900, easeInOut, function () { layoutNuclei(); });
    later(function () { layoutNuclei(); $('#gx-nuclei').classList.add('on'); }, fromGalaxy ? 600 : 250);
    armIdle();
  }
  function dive(u, fast) {
    if (!WORLD[u]) return;
    clearTimers(); closeProjectNow(); S.uni = u; S.open = null;
    HOST.style.setProperty('--acc', 'var(--' + u + ')');
    /* 1. le noyau choisi absorbe les deux autres */
    $$('.gx-nu').forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-u') === u); el.classList.toggle('is-off', el.getAttribute('data-u') !== u); });
    absorb = { to: u, t0: now() };
    var wait = fast ? 200 : TIMES.absorb;
    later(function () {
      /* 2. la camera plonge dans sa matiere, 3. les projets apparaissent progressivement */
      $('#gx-nuclei').classList.remove('on'); absorb = null;
      setScreen(S.attract ? 'attract' : S.tour ? 'tour' : 'galaxy');
      var order = {}, objs = objectsOf(u).slice().sort(function (a, b) { return a.p.priority - b.p.priority || Math.hypot(a.wx - WORLD[u].x, a.wy - WORLD[u].y) - Math.hypot(b.wx - WORLD[u].x, b.wy - WORLD[u].y); });
      objs.forEach(function (o, i) { order[o.id] = i; });
      reveal = { t0: now() + TIMES.dive * 0.45, order: order, uni: u };
      camTo(viewGalaxy(u), TIMES.dive, easeInOut, function () { reveal = null; setPreviews(u); });
      later(function () { $('#gx-unilabel').textContent = 'UNIVERSES'; if (!S.attract && !S.tour && !CFG.embedded) $('#gx-uni').classList.add('on'); }, TIMES.dive + 400);
    }, wait);
    armIdle();
  }
  /* voler d'une galaxie a une autre sans remonter */
  function fly(u, done) {
    if (!WORLD[u]) return;
    clearTimers(); closeProjectNow(); S.uni = u; S.open = null; setPreviews(null);
    HOST.style.setProperty('--acc', 'var(--' + u + ')');
    setScreen(S.attract ? 'attract' : S.tour ? 'tour' : 'galaxy');
    var order = {}; objectsOf(u).forEach(function (o, i) { order[o.id] = i; });
    reveal = { t0: now() + TIMES.fly * 0.6, order: order, uni: u };
    camTo(viewGalaxy(u), TIMES.fly, easeInOut, function () { reveal = null; setPreviews(u); if (done) done(); });
    armIdle();
  }

  /* ---------- projet ouvert ---------- */
  var openSeq = 0;
  function layoutFor(p) {
    if (p.orientation !== 'portrait') return 'land';
    return p.subject && p.subject !== 'center' ? 'p-asym' : 'p-center';
  }
  function openProject(id, opts) {
    var o = objById(id); if (dead || !o || !o.p) return;
    var p = o.p, seq = ++openSeq; opts = opts || {};
    if (CFG.single && !S.open) S.roam = { x: cam.x, y: cam.y, z: cam.z };   /* le retour ramene la ou on se baladait */
    clearTimers(); S.open = id; S.lastOpenAt = now();
    if (!S.attract && !S.tour) setScreen('project');
    HOST.style.setProperty('--acc', 'var(--' + p.universe + ')');
    $('#gx-uni').classList.remove('on');
    var stage = $('#gx-stage'), proj = $('#gx-project'), lay = layoutFor(p);
    proj.className = 'gx-project ' + lay;
    stage.className = 'gx-stage ' + lay + (p.useful && (p.useful[1] - p.useful[0]) < 12 ? ' short' : '') + ((p.orientation === 'portrait' && (o.p.width || 0) && o.p.width < 600) ? ' lowres' : '');
    /* 1. la video part de l'objet, 2. elle devient la scene */
    /* la scene nait de l'objet : transform et opacity seulement (compositeur), jamais de
       geometrie animee sur le fil principal, qui se bloque quand les videos se decodent */
    stage.style.transition = 'none'; stage.style.transform = stageFrom(o);
    void stage.offsetWidth; stage.style.transition = ''; stage.classList.add('on');
    void stage.offsetWidth; stage.style.transform = 'none';
    var v = $('#gx-video'), bg = $('#gx-bgimg'), im = $('#gx-mainimg');
    stage.classList.remove('failed'); im.hidden = true; v.style.display = '';
    /* portrait : les bandes laterales sont l'affiche du projet en miroir, assombrie (une image, pas un second
       decodage video : un miroir video coutait deux tiers du framerate sur le vrai GPU) */
    if (lay === 'land') { bg.hidden = true; bg.removeAttribute('src'); } else { bg.src = POSTERS + p.poster; bg.hidden = false; }
    if (p.video) {
      var start = p.useful ? p.useful[0] : 0, end = p.useful ? p.useful[1] : 0;
      v.onerror = function () { if (seq !== openSeq) return; stage.classList.add('failed'); im.src = POSTERS + p.poster; im.hidden = false; };
      v.onloadedmetadata = function () { if (seq !== openSeq) return; if (start > 0 && start < v.duration) { try { v.currentTime = start; } catch (e) {} } };
      v.ontimeupdate = function () { if (end > 0 && v.currentTime >= end) { try { v.currentTime = start; } catch (e) {} } };
      v.onended = function () { try { v.currentTime = start; } catch (e) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); };
      v.loop = false; v.src = CASES + p.video; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    } else {
      v.style.display = 'none'; im.src = POSTERS + (p.image || p.poster); im.hidden = false;
    }
    /* 3. le nom, une phrase, les KPI verifies ; 4. les projets lies en satellites, le retour */
    var tags = [DATA.universes[p.universe].label].concat((p.also || []).map(function (u) { return DATA.universes[u].label; }));
    $('#gx-text').innerHTML = '<div class="gx-mono acc tag">' + esc(tags.join(' · ')) + (p.formats && p.formats.length ? ' · ' + esc(p.formats[0]) : '') + '</div>' +
      '<h2 class="gx-name">' + esc(p.name) + '</h2>' +
      '<div class="gx-short">' + esc(p.short) + '</div>' +
      (p.link ? '<a class="gx-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.linkLabel || 'Open') + ' \u2197</a>' : '') +
      (p.kpis && p.kpis.length ? '<div class="gx-kpis">' + p.kpis.slice(0, 2).map(function (k) { return '<div class="gx-kpi"><b>' + esc(k.value) + '</b><span class="gx-mono">' + esc(k.label) + '</span></div>'; }).join('') + '</div>' : '');
    var rel = (p.related || []).map(function (rid) { return BY[rid]; }).filter(Boolean).slice(0, 3);
    $('#gx-related').innerHTML = '<span class="gx-mono">RELATED</span>' + rel.map(function (q) { return '<button type="button" class="gx-sat ' + q.universe + '" data-g="sat" data-id="' + q.id + '" data-name="' + esc(q.name) + '"><img src="' + POSTERS + esc(q.poster) + '" alt=""></button>'; }).join('');
    camTo({ x: o.wx, y: o.wy, z: cam.z }, TIMES.open, easeInOut);
    later(function () { if (seq !== openSeq) return; $('#gx-text').classList.add('on'); }, TIMES.open * 0.8);
    later(function () { if (seq !== openSeq) return; $('#gx-related').classList.add('on'); if (!S.attract && !S.tour) $('#gx-back').classList.add('on'); }, TIMES.open + 300);
    armIdle();
  }
  /* transform qui pose la scene plein ecran sur l'objet : meme centre, echelle uniforme */
  function stageFrom(o) {
    if (!o || !o.visible) return 'translate(0px,0px) scale(0.12)';
    var sc = Math.max(o.sw / W, o.sh / H, 0.04);
    return 'translate(' + Math.round(o.sx - CX) + 'px,' + Math.round(o.sy - CY) + 'px) scale(' + sc.toFixed(3) + ')';
  }
  function closeProject(done) {
    if (dead) return;
    var id = S.open; if (!id) { if (done) done(); return; }
    var o = objById(id), seq = ++openSeq, stage = $('#gx-stage');
    $('#gx-text').classList.remove('on'); $('#gx-related').classList.remove('on'); $('#gx-back').classList.remove('on');
    /* la scene revient dans son objet, puis s'eteint */
    stage.style.transform = stageFrom(o);
    stage.classList.remove('on');
    S.open = null;
    later(function () { if (seq !== openSeq) return; unloadStage(); if (done) done(); }, TIMES.open);
  }
  function closeProjectNow() { if (!S.open) return; openSeq++; S.open = null; $('#gx-text').classList.remove('on'); $('#gx-related').classList.remove('on'); $('#gx-back').classList.remove('on'); $('#gx-stage').classList.remove('on'); unloadStage(); }
  function unloadStage() {
    var v = $('#gx-video'); try { v.pause(); v.onerror = null; v.ontimeupdate = null; v.onended = null; v.onloadedmetadata = null; v.removeAttribute('src'); v.load(); } catch (e) {}
    $('#gx-mainimg').hidden = true; $('#gx-bgimg').hidden = true; $('#gx-bgimg').removeAttribute('src');
    /* le DOM du projet ferme ne reste pas en memoire */
    $('#gx-text').innerHTML = ''; $('#gx-related').innerHTML = '';
  }
  function backToGalaxy() {
    if (!S.open) return;
    var u = S.uni;
    closeProject(function () { setScreen('galaxy'); if (!CFG.embedded) $('#gx-uni').classList.add('on'); });
    camTo(CFG.single && S.roam ? S.roam : viewGalaxy(u), TIMES.open + 200, easeInOut);
    armIdle();
  }
  /* galaxie unique : la molette ou le pave tactile zooment autour du pointeur */
  if (CFG.single) HOST.addEventListener('wheel', function (e) {
    return; /* the mouse wheel scrolls the page, it never zooms the galaxy */
    e.preventDefault(); tween = null;
    var wx = toWorldX(RX(e)), wy = toWorldY(RY(e)), nz = clamp(cam.z * Math.exp(-e.deltaY * 0.0015), 0.42, 1.35);
    var E3 = GE(); cam.z = nz; cam.x = clamp(wx - (RX(e) - CX) / (nz * UNIT), -E3.rx * 0.9, E3.rx * 0.9); cam.y = clamp(wy - (RY(e) - CY) / (nz * UNIT), -E3.ry * 0.9, E3.ry * 0.9);
    S.lastTouch = now(); armIdle();
  }, { passive: false });
  /* un satellite : meme galaxie -> on ouvre ; autre galaxie -> on vole puis on ouvre */
  function openRelated(id) {
    var q = BY[id]; if (!q) return;
    if (q.universe === S.uni) { closeProject(function () { openProject(id); }); return; }
    closeProject(function () { fly(q.universe, function () { later(function () { openProject(id); }, 300); }); });
  }

  /* ---------- attract : la machine se montre seule ---------- */
  var idleT = null, attractRun = 0;
  function armIdle() {
    if (idleT) clearTimeout(idleT); idleT = null;
    if (CFG.embedded) { if (!S.tour) idleT = setTimeout(resumeTour, CFG.resumeMs); return; }
    if (S.screen === 'enter' || S.attract) return;
    idleT = setTimeout(startAttract, CFG.attractMs);
  }
  function startAttract() {
    if (S.attract || S.screen === 'enter') return;
    var run = ++attractRun; S.attract = true; setScreen('attract');
    $('#gx-attract').classList.add('on'); $('#gx-uni').classList.remove('on'); $('#gx-back').classList.remove('on');
    var steps = [];
    function step(fn, ms) { steps.push({ fn: fn, ms: ms }); }
    if (CFG.single) {
      step(function () { closeProject(); setPreviews(null); S.uni = null; camTo(viewAll(), TIMES.zoomOut, easeInOut); }, TIMES.zoomOut + 1800);
      step(function () { dive('protect', true); }, TIMES.dive + 2400);
      OBJ.filter(function (o) { return o.p.priority === 1; }).slice(0, 4).forEach(function (star) {
        step(function () { openProject(star.id, { attract: true }); }, CFG.attractHoldMs);
        step(function () { closeProject(); camTo(viewGalaxy('protect'), TIMES.open, easeInOut); }, TIMES.open + 900);
      });
      step(function () { setPreviews(null); camTo(viewAll(), TIMES.zoomOut, easeInOut); }, TIMES.zoomOut + 1500);
      step(function () { S.attract = false; goEnter(); }, 0);
      var j = 0;
      (function nx() { if (run !== attractRun || !S.attract) return; var st = steps[j++]; if (!st) return; st.fn(); if (steps[j]) later(nx, st.ms); })();
      return;
    }
    /* 1. vue globale */
    step(function () { closeProject(); setPreviews(null); S.uni = null; camTo(viewAll(), TIMES.zoomOut, easeInOut); later(function () { layoutNuclei(); $('#gx-nuclei').classList.add('on'); $$('.gx-nu').forEach(function (el) { el.classList.remove('is-on', 'is-off'); }); }, TIMES.zoomOut - 600); }, TIMES.zoomOut + 1800);
    /* 2. traversee des trois galaxies, un projet emblematique dans chacune */
    UNI.forEach(function (u, i) {
      var star = OBJ.filter(function (o) { return o.uni === u && o.p.priority === 1; }).sort(function (a, b) { return a.id.localeCompare(b.id); })[i % 2 === 0 ? 0 : 1] || OBJ.filter(function (o) { return o.uni === u; })[0];
      if (i === 0) step(function () { dive(u); }, TIMES.absorb + TIMES.dive + 2600);
      else step(function () { fly(u); }, TIMES.fly + 2200);
      if (star) step(function () { openProject(star.id, { attract: true }); }, CFG.attractHoldMs);
      step(function () { closeProject(); camTo(viewGalaxy(u), TIMES.open, easeInOut); }, TIMES.open + 600);
    });
    /* 3. retour a la vue globale puis a l'entree */
    step(function () { setPreviews(null); camTo(viewAll(), TIMES.zoomOut, easeInOut); }, TIMES.zoomOut + 1500);
    step(function () { S.attract = false; goEnter(); }, 0);
    var i = 0;
    function next() { if (run !== attractRun || !S.attract) return; var s = steps[i++]; if (!s) return; s.fn(); if (steps[i]) later(next, s.ms); }
    next();
  }
  /* toute interaction rend la main la ou en est la machine */
  function stopAttract() {
    if (!S.attract) return false;
    attractRun++; S.attract = false; clearTimers(); $('#gx-attract').classList.remove('on');
    if (S.open) { setScreen('project'); $('#gx-text').classList.add('on'); $('#gx-related').classList.add('on'); $('#gx-back').classList.add('on'); }
    else if (S.uni && cam.z > 0.6) { setScreen('galaxy'); reveal = null; setPreviews(S.uni); if (!CFG.embedded) $('#gx-uni').classList.add('on'); if (tween) tween.done = null; }
    else if (CFG.single) { dive('protect', true); }
    else { S.uni = null; setScreen('universes'); camTo(viewAll(), 700, easeOut); layoutNuclei(); $('#gx-nuclei').classList.add('on'); $$('.gx-nu').forEach(function (el) { el.classList.remove('is-on', 'is-off'); }); }
    armIdle();
    return true;
  }

  /* ---------- visite guidee (mode embarque) : la galaxie se montre pendant la generation ----------
     Une liste de lecture couvre tous les projets, univers par univers, en commencant par
     l'univers choisi ; quand tout a ete vu, une nouvelle liste melangee repart sans
     reprendre les derniers projets vus. Un toucher rend la main ; la visite reprend apres
     resumeMs sans toucher. ready() demande la convergence a la prochaine frontiere de
     segment (jamais au milieu d'une video), convergeCapMs au plus tard. */
  var tourRun = 0, tourPos = 0, playlist = [], convergeCapT = null, convergeDone = null;
  function shuffle(list) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function buildPlaylist(first) {
    var order = UNI.slice(); if (first && UNI.indexOf(first) !== -1) order = [first].concat(UNI.filter(function (u) { return u !== first; }));
    var list = [];
    order.forEach(function (u) {
      var objs = OBJ.filter(function (o) { return o.uni === u; });
      var p1 = shuffle(objs.filter(function (o) { return o.p.priority === 1; })), rest = shuffle(objs.filter(function (o) { return o.p.priority !== 1; }));
      p1.concat(rest).forEach(function (o) { list.push({ uni: u, id: o.id }); });
    });
    /* les derniers projets vus ne reviennent pas tout de suite */
    var recent = S.seen.slice(-4);
    return list.filter(function (it) { return recent.indexOf(it.id) === -1; }).concat(list.filter(function (it) { return recent.indexOf(it.id) !== -1; }));
  }
  function startTour() {
    var run = ++tourRun; S.tour = true; S.attract = false; clearTimers();
    if (idleT) clearTimeout(idleT); idleT = null;
    playlist = buildPlaylist(CFG.startUniverse); tourPos = 0;
    /* ouverture : les trois univers un instant, puis la plongee dans l'univers choisi */
    closeProjectNow(); setPreviews(null); S.uni = null; S.open = null; absorb = null; reveal = null;
    setScreen('tour'); HOST.style.setProperty('--acc', 'var(--ink)');
    camSnap(viewAll()); layoutNuclei(); $('#gx-nuclei').classList.add('on'); $$('.gx-nu').forEach(function (el) { el.classList.remove('is-on', 'is-off'); });
    later(function () { if (run !== tourRun || !S.tour) return; tourStep(run); }, 1800);
  }
  function tourStep(run) {
    if (dead || run !== tourRun || !S.tour || S.converging) return;
    if (S.wantConverge) { converge(); return; }
    if (tourPos >= playlist.length) { playlist = buildPlaylist(S.uni); tourPos = 0; }
    var it = playlist[tourPos++]; if (!it) return;
    var go = function () {
      if (run !== tourRun || !S.tour || S.converging) return;
      if (S.wantConverge) { converge(); return; }
      openProject(it.id, { tour: true }); S.seen.push(it.id);
      var o = objById(it.id), useful = o && o.p.useful ? (o.p.useful[1] - o.p.useful[0]) * 1000 : 0;
      var hold = Math.max(6000, Math.min(CFG.holdMs, useful || CFG.holdMs));
      later(function () {
        if (run !== tourRun || !S.tour) return;
        closeProject(function () { if (run !== tourRun || !S.tour) return; camTo(viewGalaxy(it.uni), TIMES.open, easeInOut); later(function () { tourStep(run); }, 700); });
      }, hold);
    };
    if (S.uni !== it.uni) {
      /* premiere plongee avec l amorce armee : la galaxie reste visible le temps que le point lumineux touche une bulle */
      if (!S.uni || cam.z < 0.6) { S.tour = true; dive(it.uni); later(go, TIMES.absorb + TIMES.dive + (hint.st === 'ready' ? HINT_MS + 1300 : 900)); }
      else { fly(it.uni); later(go, TIMES.fly + 700); }
    } else later(go, 300);
  }
  /* un toucher du visiteur : la visite se met en pause, il explore ; elle reprend seule apres resumeMs */
  function pauseTour() {
    if (!CFG.embedded || !S.tour) return false;
    tourRun++; S.tour = false; clearTimers();
    if (S.open) { setScreen('project'); $('#gx-text').classList.add('on'); $('#gx-related').classList.add('on'); $('#gx-back').classList.add('on'); }
    else if (S.uni && cam.z > 0.6) { setScreen('galaxy'); reveal = null; setPreviews(S.uni); if (tween) tween.done = null; }
    else { S.uni = null; setScreen('universes'); camTo(viewAll(), 700, easeOut); layoutNuclei(); $('#gx-nuclei').classList.add('on'); }
    if (S.wantConverge) { if (convergeCapT) clearTimeout(convergeCapT); convergeCapT = setTimeout(function () { converge(); }, 4000); }
    armIdle();
    return true;
  }
  function resumeTour() {
    if (dead || !CFG.embedded || S.tour || S.converging) return;
    if (S.wantConverge) { converge(); return; }
    var run = ++tourRun; S.tour = true; clearTimers();
    setScreen('tour'); $('#gx-back').classList.remove('on');
    if (S.open) { closeProject(function () { later(function () { tourStep(run); }, 500); }); return; }
    tourStep(run);
  }
  /* la generation est prete : on finit le segment en cours, puis on converge */
  function ready(done) {
    if (S.wantConverge || S.converging) { if (done) convergeDone = done; return; }
    S.wantConverge = true; convergeDone = done || null;
    if (!S.tour) { if (idleT) clearTimeout(idleT); idleT = setTimeout(function () { converge(); }, 4000); }
    convergeCapT = setTimeout(function () { converge(); }, CFG.convergeCapMs);
  }
  /* la galaxie se referme : les objets s'effacent, la camera remonte, l'espace se resserre vers le centre */
  function converge() {
    if (S.converging) return;
    S.converging = true; S.tour = false; tourRun++; clearTimers();
    if (idleT) clearTimeout(idleT); idleT = null; if (convergeCapT) clearTimeout(convergeCapT); convergeCapT = null;
    $('#gx-text').classList.remove('on'); $('#gx-related').classList.remove('on'); $('#gx-back').classList.remove('on'); $('#gx-nuclei').classList.remove('on');
    var stage = $('#gx-stage'); stage.classList.remove('on');
    S.open = null; openSeq++; setPreviews(null);
    setScreen('converge');
    var finished = false;
    function finish() {
      if (finished || dead) return; finished = true;
      unloadStage(); HOST.classList.add('is-out');
      setTimeout(function () { var d = convergeDone; convergeDone = null; if (d) d(); }, 450);
    }
    camTo({ x: 0, y: 0, z: Math.max(0.16, viewAll().z * 0.5) }, 1600, easeInOut, finish);
    /* filet : si le navigateur retient ses images (onglet masque, Chrome headless apres le dechargement d une video), la fin arrive quand meme a l heure */
    setTimeout(finish, 1600 + 700);
  }
  var dead = false;
  function destroy() {
    dead = true; running = false; tourRun++; S.tour = false; clearTimers(); if (idleT) clearTimeout(idleT); idleT = null; if (convergeCapT) clearTimeout(convergeCapT);
    unloadStage(); setPreviews(null); window.removeEventListener('resize', resize);
    /* les reactions ne survivent pas a l'instance : cible, pulsation, indice, contexte audio */
    magO = null; pulse.o = null; pulse.on = false; hint.o = null; hint.st = 'done'; ptr.has = false;
    lineEl = null; lineOn = false;
    if (actx && actx.close) { try { actx.close(); } catch (e) {} } actx = null;
    HOST.innerHTML = ''; HOST.classList.remove('gx', 'embedded', 'is-out');
  }

  /* ---------- toucher ---------- */
  var down = null;
  function ripple(x, y, c) { ripples.push({ x: x, y: y, t0: now(), c: c }); if (ripples.length > 8) ripples.shift(); }
  HOST.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') document.body.classList.add('touch');
    S.lastTouch = now();
    ptr.x = RX(e); ptr.y = RY(e); ptr.has = true;
    if (hint.st === 'running') endHint();
    var btn = e.target.closest('button'); if (btn) { btn.classList.add('is-down'); setTimeout(function () { btn.classList.remove('is-down'); }, 160); }
    /* la ligne d'instruction a fait son travail au premier toucher dans la galaxie (l'entree et les univers ne comptent pas) */
    if (S.screen !== 'boot' && S.screen !== 'enter' && S.screen !== 'universes') { S.touched = true; if (hint.st === 'ready') hint.st = 'off'; }
    /* reponse immediate : onde et grossissement sur la bulle touchee, avant toute camera et toute ouverture */
    if (!btn && !S.open && liveScreen()) {
      var hit = hitObject(RX(e), RY(e)) || nearest(RX(e), RY(e), MAG_R * UNIT);
      if (hit) { magO = hit; hit.mag = 1; ripple(hit.sx, hit.sy, hit.uni); }
    }
    ripple(RX(e), RY(e), S.uni || 'n');
    feedback();
    down = { x: RX(e), y: RY(e), px: e.clientX, py: e.clientY, sy: 0, pt: e.pointerType, t: now(), cx: cam.x, cy: cam.y, moved: false, btn: !!btn, consumed: false };
    if (S.converging) { down.consumed = true; return; }
    if (stopAttract()) { down.consumed = true; return; }
    if (pauseTour()) { down.consumed = true; return; }
    if (S.screen === 'enter') { down.consumed = true; enterUniverse(); return; }
  }, { passive: true });
  HOST.addEventListener('pointermove', function (e) {
    /* le doigt ou la souris passe : la bulle la plus proche reagit (resolue dans la boucle) */
    ptr.x = RX(e); ptr.y = RY(e); ptr.has = true;
    if (hint.st === 'running') endHint();
    if (!down || down.consumed || down.btn) return;
    var dx = e.clientX - down.px, dy = e.clientY - down.py;
    if (!down.moved && Math.hypot(dx, dy) < 9) return;
    if (S.screen !== 'galaxy') return;
    down.moved = true; tween = null;
    var c = WORLD[S.uni], rx = CFG.single ? GE().rx * 0.9 : GR * 0.55, ry = CFG.single ? GE().ry * 0.9 : GR * 0.5;
    cam.x = clamp(down.cx - dx / (cam.z * UNIT), c.x - rx, c.x + rx);
    var wantY = down.cy - dy / (cam.z * UNIT);
    cam.y = clamp(wantY, c.y - ry, c.y + ry);
    /* on a phone, a drag that pushes past the top or bottom edge of the galaxy scrolls the page instead */
    if (down.pt === 'touch' && CFG.single) {
      var over = Math.round((wantY - cam.y) * cam.z * UNIT);
      if (over !== down.sy) { window.scrollBy(0, over - down.sy); down.sy = over; }
    }
  }, { passive: true });
  HOST.addEventListener('pointerup', function (e) {
    /* un doigt ne survole pas : il quitte la scene en se levant, la bulle revient a sa taille */
    if (e.pointerType === 'touch') ptr.has = false;
    var d = down; down = null; if (!d || d.consumed || d.moved) return;
    S.lastTouch = now(); armIdle();
    var btn = e.target.closest('button[data-g]');
    if (btn) { var g = btn.getAttribute('data-g'); if (g === 'universes') goUniverses(true); else if (g === 'back') backToGalaxy(); else if (g === 'sat') openRelated(btn.getAttribute('data-id')); return; }
    if (S.screen === 'project' && S.open) { if (e.target.closest && e.target.closest('a')) return; if (now() - (S.lastOpenAt || 0) > 800) backToGalaxy(); return; }
    if (S.screen === 'universes') { var u = hitNucleus(RX(e), RY(e)); if (u) dive(u); return; }
    if (S.screen === 'galaxy') {
      var pt = hitPortal(RX(e), RY(e)); if (pt) { fly(pt.to); return; }
      var o = hitObject(RX(e), RY(e)); if (!o) return;
      if (o.echo) { fly(o.p.universe, function () { later(function () { openProject(o.id); }, 300); }); return; }
      openProject(o.id); return;
    }
  }, { passive: true });
  HOST.addEventListener('pointercancel', function () { down = null; ptr.has = false; });
  HOST.addEventListener('pointerleave', function () { ptr.has = false; });
  function hitNucleus(x, y) { var best = null, bd = 1e9; UNI.forEach(function (u) { var n = NUC[u]; if (!n) return; var d = Math.hypot(x - n.x, y - n.y); if (d < 230 * UNIT && d < bd) { bd = d; best = u; } }); return best; }
  function hitObject(x, y) {
    var best = null, bd = 1e9;
    objectsOf(S.uni).forEach(function (o) { if (!o.visible) return; var m = 22 * UNIT; if (x >= o.sx - o.sw / 2 - m && x <= o.sx + o.sw / 2 + m && y >= o.sy - o.sh / 2 - m && y <= o.sy + o.sh / 2 + 34 * UNIT) { var d = Math.hypot(x - o.sx, y - o.sy); if (d < bd) { bd = d; best = o; } } });
    return best;
  }
  function hitPortal(x, y) { var best = null; PORTALS.forEach(function (pt) { if (pt.from !== S.uni) return; if (Math.hypot(x - sx(pt.wx), y - sy(pt.wy)) < 70 * UNIT) best = pt; }); return best; }
  function enterUniverse() {
    if (CFG.single) { $('#gx-enter').classList.remove('on'); setScreen('universes'); camSnap(viewAll()); later(function () { dive('protect', true); }, 250); armIdle(); return; }
    setScreen('universes'); $('#gx-enter').classList.remove('on');
    HOST.style.setProperty('--acc', 'var(--ink)');
    camSnap(viewAll()); layoutNuclei();
    later(function () { $('#gx-nuclei').classList.add('on'); }, 500);
    armIdle();
  }
  /* operateur : appui long de trois secondes en bas a gauche */
  var opT = null;
  $('#gx-op-zone').addEventListener('pointerdown', function () { opT = setTimeout(showSheet, 3000); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { $('#gx-op-zone').addEventListener(ev, function () { if (opT) clearTimeout(opT); opT = null; }); });
  function showSheet() {
    if ($('#gx-sheet')) return;
    var d = document.createElement('div'); d.className = 'gx-sheet'; d.id = 'gx-sheet';
    d.innerHTML = '<button type="button" data-op="restart">RESTART</button><button type="button" data-op="reload">RELOAD</button><button type="button" data-op="close">CLOSE</button>';
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-op]'); if (!b) return; var op = b.getAttribute('data-op'); d.remove(); if (op === 'restart') goEnter(); else if (op === 'reload') location.reload(); });
    HOST.appendChild(d);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { $$('video', HOST).forEach(function (v) { try { v.pause(); } catch (e) {} }); } else { last = 0; previews.forEach(function (pv) { var pr = pv.v.play(); if (pr && pr.catch) pr.catch(function () {}); }); var v = $('#gx-video'); if (S.open && v && v.getAttribute('src')) { var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {}); } } });

  /* ---------- demarrage ---------- */
  var readyResolve, readyP = new Promise(function (res) { readyResolve = res; });
  function init(data) {
    if (dead) return;
    build(data); resize(); makeSpace(); loadFeline(MARK); renderNuclei(); ensureLabels();
    camSnap(viewAll());
    running = true; requestAnimationFrame(frame);
    goEnter(); readyResolve(api);
  }
  var dataP = OPT.data ? Promise.resolve(OPT.data) : fetch('galaxy/projects.json').then(function (r) { return r.json(); });
  dataP.then(init).catch(function (e) {
    $('#gx-enter').classList.add('on'); $('#gx-enter-title').textContent = 'THE UNIVERSE IS LOADING.'; console.error('galaxy data', e);
  });

  /* ---------- API (tests et Machine) ---------- */
  var api = {
    state: function () { var st = $('#gx-stage'), r = st ? st.getBoundingClientRect() : null, im = $('#gx-mainimg'); return { screen: S.screen, uni: S.uni, open: S.open, attract: S.attract, tour: S.tour, wantConverge: S.wantConverge, converging: S.converging, seen: S.seen.slice(), seq: openSeq, stage: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), st.classList.contains('on') ? 1 : 0] : null, img: im ? { hidden: im.hidden, complete: im.complete, w: im.naturalWidth, src: (im.getAttribute('src') || '').split('/').pop() } : null, cam: { x: Math.round(cam.x), y: Math.round(cam.y), z: Math.round(cam.z * 1000) / 1000 }, tween: !!tween, previews: previews.map(function (p) { return p.id; }), objects: OBJ.length, echoes: ECHO.length, lite: S.lite,
      /* affordance tactile */
      touched: S.touched, hint: hint.st === 'ready' ? 'off' : hint.st, magnet: magnetInfo(),
      pulse: { id: pulse.o ? pulse.o.id : null, t0: Math.round(pulse.t0), on: !!pulse.on }, ripples: ripples.length,
      line: { on: lineOn, text: CFG.texts.touch, y: Math.round(lineY) },
      feedback: { sound: !!CFG.sound, haptic: !!CFG.haptic, audio: audioState, ticks: ticks, vibes: vibes } }; },
    perf: function () { return { fps: Math.round(1000 / Math.max(1, dtAvg)), frameMs: Math.round(dtAvg * 10) / 10, lite: S.lite, autoLite: S.autoLite, stars: STARS.length }; },
    objects: function () { return OBJ.concat(ECHO).map(function (o) { return { id: o.id, uni: o.uni, echo: o.echo, x: Math.round(o.sx || 0), y: Math.round(o.sy || 0), w: Math.round(o.sw || 0), h: Math.round(o.sh || 0), visible: !!o.visible, alpha: Math.round(o.alpha * 100) / 100, mag: Math.round((o.mag || 0) * 100) / 100, pul: Math.round((o.pul || 0) * 100) / 100 }; }); },
    data: function () { return DATA; },
    enter: enterUniverse, dive: dive, fly: fly, open: openProject, back: backToGalaxy, universes: function () { goUniverses(true); }, restart: goEnter, attract: startAttract, stopAttract: stopAttract,
    hit: function (x, y) { var o = hitObject(x, y), pt = hitPortal(x, y); return { object: o ? o.id + (o.echo ? '*' : '') : null, portal: pt ? pt.to : null, nucleus: hitNucleus(x, y) }; },
    tour: startTour, pauseTour: pauseTour, resumeTour: resumeTour, ready: ready, converge: converge, destroy: destroy, whenReady: readyP,
    matter: function () { return { protect: (MATTER.protect || []).length, fel: FEL.length, lite: !!S.lite }; },
    config: CFG, times: TIMES, host: HOST
  };
  return api;
  }
  window.createWildcatGalaxy = createGalaxy;
  /* route autonome : le conteneur #galaxy existe, la galaxie se monte seule */
  
})();
