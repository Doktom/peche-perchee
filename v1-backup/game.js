// Pêche Perchée — V1
// Boucle : lancer → attendre → ferrer → mouliner → vendre → acheter → recommencer (en mieux)
(() => {
  'use strict';

  const D = window.GAME_DATA;
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  const fmtKg = (w) => (w < 1 ? w.toFixed(2) : w < 100 ? w.toFixed(1) : Math.round(w)) + ' kg';

  const rodById = (id) => D.rods.find((r) => r.id === id);
  const baitById = (id) => D.baits.find((b) => b.id === id);
  const spotById = (id) => D.spots.find((s) => s.id === id);
  const fishById = {};
  D.spots.forEach((sp) => sp.fish.forEach((f) => {
    fishById[f[0]] = { id: f[0], name: f[1], rarity: f[2], w: f[3], v: f[4], fight: f[5], color: f[6], desc: f[7], junk: !!f[8], spot: sp.id };
  }));

  // ---------------------------------------------------------------- Sauvegarde
  const SAVE_KEY = 'pechePerchee_v1';
  const defaultState = () => ({
    money: 0, rod: 'r1', rods: ['r1'], bait: 'b0', baits: {}, bucketLvl: 0, bucket: [],
    spots: ['s1'], spot: 's1', dex: {}, totalCaught: 0, seenWelcome: false,
  });
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
    return defaultState();
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* tant pis */ } }
  const rod = () => rodById(S.rod);
  const bait = () => baitById(S.bait);
  const spot = () => spotById(S.spot);
  const bucketCap = () => D.buckets[S.bucketLvl].cap;

  // ---------------------------------------------------------------- Audio (synthé maison)
  let AC = null;
  function ensureAudio() {
    if (AC) return;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  }
  function beep(freq, dur = 0.12, type = 'sine', vol = 0.15, slide = 0) {
    if (!AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    plop: () => beep(520, 0.18, 'sine', 0.22, -380),
    bite: () => { beep(880, 0.08, 'square', 0.07); setTimeout(() => beep(1175, 0.1, 'square', 0.07), 90); },
    snap: () => { beep(240, 0.35, 'sawtooth', 0.12, -180); },
    escape: () => beep(400, 0.3, 'triangle', 0.12, -250),
    catch: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.15), i * 85)),
    coin: () => { beep(1250, 0.07, 'square', 0.05); setTimeout(() => beep(1660, 0.12, 'square', 0.05), 70); },
    click: () => beep(660, 0.05, 'sine', 0.08),
    tick: () => beep(1800 + Math.random() * 300, 0.02, 'square', 0.025),
    whoosh: () => beep(300, 0.25, 'triangle', 0.08, 500),
  };

  // ---------------------------------------------------------------- Three.js
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 45, 190);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  const CAM_POS = new THREE.Vector3(2.2, 3.3, 4.4);
  const CAM_LOOK = new THREE.Vector3(0, 0.6, -9);

  const matCache = {};
  function M(color, extra) {
    const key = color + (extra ? JSON.stringify(extra) : '');
    if (!matCache[key]) matCache[key] = new THREE.MeshPhongMaterial(Object.assign({ color, flatShading: true, shininess: 6 }, extra || {}));
    return matCache[key];
  }
  function mesh(geo, color, extra) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? M(color, extra) : color);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // Lumières
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8c8e8, 0.75);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.75);
  sunLight.position.set(18, 30, 12);
  sunLight.target.position.set(0, 0, -8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  scene.add(sunLight, sunLight.target);

  // Ciel en dégradé
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom,top,h),1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 20, 12), skyMat);
  scene.add(sky);
  const sunMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  sunMesh.position.set(-70, 60, -300);
  scene.add(sunMesh);

  // Eau animée
  const WATER_SIZE = 360, WATER_SEG = 90;
  const waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEG, WATER_SEG);
  waterGeo.rotateX(-Math.PI / 2);
  const waterBase = Float32Array.from(waterGeo.attributes.position.array);
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, flatShading: true, shininess: 50, specular: 0x2a2a2a, transparent: true, opacity: 0.94 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.z = -100;
  water.receiveShadow = true;
  scene.add(water);
  let waveAmp = 1;
  function waveH(x, z, t) {
    return waveAmp * (0.12 * Math.sin(x * 0.35 + t * 1.1) + 0.08 * Math.sin(z * 0.5 + t * 1.4) + 0.05 * Math.sin((x + z) * 0.8 + t * 2.1));
  }
  function updateWater(t) {
    const arr = waterGeo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) arr[i + 1] = waveH(waterBase[i], waterBase[i + 2] + water.position.z, t);
    waterGeo.attributes.position.needsUpdate = true;
  }

  // Terres (fixes, recolorées selon le spot)
  const landMat = new THREE.MeshPhongMaterial({ color: 0xb9e0a5, flatShading: true, shininess: 4 });
  const hillMat = new THREE.MeshPhongMaterial({ color: 0xa9d6b4, flatShading: true, shininess: 4 });
  function landMass(x, z, r, h, seg) {
    const geo = new THREE.CylinderGeometry(r, r * 1.12, h, seg || 14, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > h / 2 - 0.01) p.setY(i, p.getY(i) + (Math.random() - 0.3) * 0.5); // bosses sur le dessus
    }
    const m = new THREE.Mesh(geo, landMat);
    m.position.set(x, 0.5 - h / 2, z);
    m.receiveShadow = true; m.castShadow = true;
    scene.add(m);
  }
  landMass(0, 30, 27, 3, 20);     // rive où se trouve le ponton
  landMass(-30, -10, 18, 3, 16);  // presqu'île gauche
  landMass(22, -26, 9, 3, 12);    // îlot droit
  for (let i = 0; i < 9; i++) { // collines lointaines
    const r = rand(18, 34);
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), hillMat);
    h.scale.y = rand(0.35, 0.6);
    h.position.set(-140 + i * 36 + rand(-8, 8), -2, rand(-210, -170));
    scene.add(h);
  }

  // Ponton
  const dock = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const plank = mesh(new THREE.BoxGeometry(1.7, 0.12, 0.55), i % 2 ? '#d9b48f' : '#cfa982');
    plank.position.set(rand(-0.03, 0.03), 0.55, 3.6 - i * 0.6);
    plank.rotation.y = rand(-0.03, 0.03);
    dock.add(plank);
  }
  [[-0.75, 3.4], [0.75, 3.4], [-0.75, -1.4], [0.75, -1.4], [-0.75, 1], [0.75, 1]].forEach(([x, z]) => {
    const post = mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.8, 6), '#b08b6a');
    post.position.set(x, -0.2, z);
    dock.add(post);
  });
  scene.add(dock);

  // Le pêcheur
  const player = new THREE.Group();
  const jacket = '#ffb38a';
  const legs = mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.45, 7), '#7e8cc4'); legs.position.y = 0.22;
  const body = mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.75, 7), jacket); body.position.y = 0.8;
  const head = mesh(new THREE.IcosahedronGeometry(0.36, 0), '#ffd9b8'); head.position.y = 1.45;
  const hatBrim = mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 9), '#8fd3c9'); hatBrim.position.y = 1.66;
  const hatTop = mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.3, 8), '#8fd3c9'); hatTop.position.y = 1.83;
  const pompom = mesh(new THREE.IcosahedronGeometry(0.09, 0), '#ff9fb5'); pompom.position.y = 2.02;
  const pack = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.25), '#c5a3e0'); pack.position.set(0, 0.9, 0.38);
  const armR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 5), jacket); armR.position.set(0.38, 0.95, -0.15); armR.rotation.x = 1.1;
  const armL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 5), jacket); armL.position.set(-0.32, 0.9, -0.15); armL.rotation.x = 1.0; armL.rotation.z = -0.5;
  player.add(legs, body, head, hatBrim, hatTop, pompom, pack, armR, armL);
  player.position.set(0, 0.6, -1.0);
  scene.add(player);

  // Canne
  const rodPivot = new THREE.Group();
  rodPivot.position.set(0.32, 0.95, -0.4);
  player.add(rodPivot);
  const rodMat = new THREE.MeshPhongMaterial({ color: 0xc9a27e, flatShading: true, shininess: 30 });
  const rodStick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.045, 2.8, 5), rodMat);
  rodStick.position.y = 1.4; rodStick.castShadow = true;
  const rodHandle = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), '#6d5a7a'); rodHandle.position.y = 0.05;
  const rodReel = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8), '#e0e0e0'); rodReel.rotation.z = Math.PI / 2; rodReel.position.set(0.08, 0.3, 0);
  const rodTip = new THREE.Object3D(); rodTip.position.y = 2.8;
  rodPivot.add(rodStick, rodHandle, rodReel, rodTip);
  const ROD_IDLE = -0.95;
  rodPivot.rotation.x = ROD_IDLE;

  // Le Chat Qui Juge
  const cat = new THREE.Group();
  const catColor = '#c3b1e1';
  const catBody = mesh(new THREE.IcosahedronGeometry(0.28, 0), catColor); catBody.scale.set(1, 0.95, 1.15); catBody.position.y = 0.26;
  const catHead = new THREE.Group(); catHead.position.y = 0.62;
  const catHeadM = mesh(new THREE.IcosahedronGeometry(0.21, 0), catColor);
  const earGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
  const earL = mesh(earGeo, catColor); earL.position.set(-0.11, 0.2, 0); earL.rotation.z = 0.3;
  const earR = mesh(earGeo, catColor); earR.position.set(0.11, 0.2, 0); earR.rotation.z = -0.3;
  const eyeGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const eyeL = mesh(eyeGeo, '#3b2f4a'); eyeL.position.set(-0.075, 0.03, 0.18);
  const eyeR = mesh(eyeGeo, '#3b2f4a'); eyeR.position.set(0.075, 0.03, 0.18);
  const catNose = mesh(new THREE.SphereGeometry(0.022, 5, 3), '#ff9fb5'); catNose.position.set(0, -0.03, 0.2);
  catHead.add(catHeadM, earL, earR, eyeL, eyeR, catNose);
  const catTail = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 5), catColor);
  catTail.position.set(0, 0.2, -0.32); catTail.rotation.x = -0.9;
  cat.add(catBody, catHead, catTail);
  cat.position.set(-0.95, 0.61, -0.6);
  cat.rotation.y = 0.5;
  scene.add(cat);

  // Bouchon + ligne
  const bobber = new THREE.Group();
  const bobTop = mesh(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#ff6b7a');
  const bobBot = mesh(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#ffffff');
  const bobStick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 4), '#ff6b7a'); bobStick.position.y = 0.18;
  bobber.add(bobTop, bobBot, bobStick);
  scene.add(bobber);
  const LINE_N = 24;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_N * 3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  line.frustumCulled = false;
  scene.add(line);

  // Effets : ronds dans l'eau, éclaboussures
  const fx = [];
  const ringGeo = new THREE.RingGeometry(0.25, 0.36, 18); ringGeo.rotateX(-Math.PI / 2);
  function ripple(pos, scale = 1) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.set(pos.x, 0.12, pos.z);
    scene.add(m);
    fx.push({ obj: m, t: 0, life: 1.2, ownMat: true, update(dt, f) { const k = f.t / f.life; m.scale.setScalar(scale * (1 + k * 4)); m.material.opacity = 0.8 * (1 - k); } });
  }
  const dropGeo = new THREE.IcosahedronGeometry(0.07, 0);
  function splash(pos, n = 10, color = '#ffffff') {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(dropGeo, M(color));
      m.position.copy(pos);
      const v = new THREE.Vector3(rand(-1.5, 1.5), rand(2.5, 4.5), rand(-1.5, 1.5));
      scene.add(m);
      fx.push({ obj: m, t: 0, life: 1.2, update(dt) { v.y -= 12 * dt; m.position.addScaledVector(v, dt); if (m.position.y < 0) this.t = this.life; } });
    }
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      f.update(dt, f);
      if (f.t >= f.life) {
        scene.remove(f.obj);
        if (f.ownMat) f.obj.material.dispose();
        fx.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- Décors par spot
  let deco = new THREE.Group();
  scene.add(deco);
  let decoAnim = [];

  function landPoint() {
    const r = Math.random();
    if (r < 0.62) {
      const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * 15;
      return [-30 + Math.abs(Math.cos(a)) * d, -10 + Math.sin(a) * d]; // moitié visible de la presqu'île
    }
    const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * 7;
    return [22 + Math.cos(a) * d, -26 + Math.sin(a) * d];
  }
  function tree(x, z, s, kind, c1, c2) {
    const t = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.2 * s, 5), c2);
    trunk.position.y = 0.6 * s; t.add(trunk);
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) {
        const c = mesh(new THREE.ConeGeometry((1.1 - i * 0.28) * s, 1.3 * s, 6), c1);
        c.position.y = (1.3 + i * 0.65) * s; t.add(c);
      }
    } else if (kind === 'weep') {
      const c = mesh(new THREE.ConeGeometry(1.2 * s, 2.6 * s, 7), c1);
      c.position.y = 2.0 * s; c.rotation.x = Math.PI; t.add(c);
    } else if (kind === 'palm') {
      trunk.scale.set(0.7, 2.4, 0.7); trunk.position.y = 1.4 * s;
      for (let i = 0; i < 6; i++) {
        const leaf = mesh(new THREE.BoxGeometry(1.6 * s, 0.06 * s, 0.4 * s), c1);
        leaf.position.y = 2.9 * s; leaf.rotation.y = (i / 6) * Math.PI * 2; leaf.rotation.z = -0.35;
        leaf.geometry.translate(0.8 * s, 0, 0);
        t.add(leaf);
      }
    } else {
      const c = mesh(new THREE.IcosahedronGeometry(1 * s, 0), c1);
      c.position.y = 1.8 * s; t.add(c);
    }
    t.position.set(x, 0.5, z);
    t.rotation.y = Math.random() * 6;
    deco.add(t);
    return t;
  }
  function rock(x, z, s, c) {
    const r = mesh(new THREE.DodecahedronGeometry(s, 0), c);
    r.position.set(x, 0.2 + s * 0.3, z); r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    deco.add(r); return r;
  }
  function cloud(x, y, z, s, c = '#ffffff') {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.5, 2.6) * s, 0), M(c, { emissive: 0x222222 }));
      p.position.set((i - 1.5) * 2.2 * s, rand(-0.5, 0.6) * s, rand(-0.8, 0.8) * s);
      g.add(p);
    }
    g.position.set(x, y, z);
    deco.add(g);
    const speed = rand(0.6, 1.4);
    decoAnim.push((t, dt) => { g.position.x += speed * dt; if (g.position.x > 160) g.position.x = -160; });
    return g;
  }
  function floater(obj, x, z, amp = 1, spin = 0) {
    obj.position.set(x, 0, z);
    deco.add(obj);
    const ph = Math.random() * 6;
    decoAnim.push((t) => { obj.position.y = waveH(x, z, t) * amp + 0.05; obj.rotation.z = Math.sin(t + ph) * 0.12; obj.rotation.y += spin * 0.01; });
  }
  function eyes(group, y, z, spread, s = 1) {
    const w1 = mesh(new THREE.SphereGeometry(0.22 * s, 7, 5), '#ffffff'); w1.position.set(-spread, y, z);
    const w2 = w1.clone(); w2.position.x = spread;
    const p1 = mesh(new THREE.SphereGeometry(0.11 * s, 6, 4), '#3b2f4a'); p1.position.set(-spread, y, z + 0.17 * s);
    const p2 = p1.clone(); p2.position.x = spread;
    group.add(w1, w2, p1, p2);
  }

  function buildDeco(sp) {
    scene.remove(deco);
    deco.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    deco = new THREE.Group();
    scene.add(deco);
    decoAnim = [];
    const p = sp.pal;

    if (sp.deco !== 'cosmique') for (let i = 0; i < 7; i++) cloud(rand(-150, 150), rand(26, 45), rand(-200, -60), rand(0.8, 1.6));

    if (sp.deco === 'etang') {
      for (let i = 0; i < 26; i++) { const [x, z] = landPoint(); tree(x, z, rand(0.8, 1.6), Math.random() < 0.55 ? 'pine' : 'round', Math.random() < 0.8 ? p.tree : p.tree2, p.trunk); }
      for (let i = 0; i < 8; i++) { const [x, z] = landPoint(); rock(x, z, rand(0.4, 1), '#d7d0e0'); }
      for (let i = 0; i < 20; i++) { // roseaux
        const r = mesh(new THREE.CylinderGeometry(0.03, 0.04, rand(1, 1.8), 4), '#9cc58c');
        r.position.set(rand(-14, -11), 0.4, rand(-4, 6)); r.rotation.z = rand(-0.2, 0.2); deco.add(r);
      }
      // canard en plastique géant
      const duck = new THREE.Group();
      const db = mesh(new THREE.IcosahedronGeometry(0.9, 0), '#ffe066'); db.scale.set(1.2, 0.8, 1);
      const dh = mesh(new THREE.IcosahedronGeometry(0.5, 0), '#ffe066'); dh.position.set(0.8, 0.8, 0);
      const dbk = mesh(new THREE.ConeGeometry(0.2, 0.4, 4), '#ffa94d'); dbk.rotation.z = -Math.PI / 2; dbk.position.set(1.35, 0.75, 0);
      duck.add(db, dh, dbk);
      floater(duck, 9, -22, 1.2);
    } else if (sp.deco === 'regrets') {
      for (let i = 0; i < 22; i++) { const [x, z] = landPoint(); tree(x, z, rand(0.9, 1.5), Math.random() < 0.6 ? 'weep' : 'pine', Math.random() < 0.8 ? p.tree : p.tree2, p.trunk); }
      // une chaise seule au milieu du lac
      const chair = new THREE.Group();
      const seat = mesh(new THREE.BoxGeometry(1, 0.1, 1), '#d8cce6'); seat.position.y = 0.9;
      const back = mesh(new THREE.BoxGeometry(1, 1.1, 0.1), '#d8cce6'); back.position.set(0, 1.45, -0.45);
      chair.add(seat, back);
      [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([x, z]) => { const l = mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), '#bfb1d1'); l.position.set(x, 0.45, z); chair.add(l); });
      chair.position.set(7, -0.3, -18); chair.rotation.y = -0.6; deco.add(chair);
      // nuage personnel au-dessus de la chaise
      const rc = cloud(7, 6, -18, 0.5, '#a9a3bd'); decoAnim.pop();
      decoAnim.push((t) => { rc.position.y = 6 + Math.sin(t) * 0.2; });
    } else if (sp.deco === 'riviere') {
      for (let i = 0; i < 16; i++) { const [x, z] = landPoint(); tree(x, z, rand(0.8, 1.4), 'round', Math.random() < 0.6 ? p.tree : p.tree2, p.trunk); }
      for (let i = 0; i < 14; i++) { const [x, z] = landPoint(); rock(x, z, rand(0.6, 1.6), '#c8b8a8'); }
      // les pierres qui parlent
      [[-6, -16, 1.4], [8, -26, 1.8], [-2, -38, 2.4]].forEach(([x, z, s], i) => {
        const g = new THREE.Group();
        const r = mesh(new THREE.DodecahedronGeometry(s, 0), '#d6c6b6'); g.add(r);
        eyes(g, s * 0.3, s * 0.82, s * 0.32, s * 0.9);
        const mouth = mesh(new THREE.BoxGeometry(s * 0.5, s * 0.1, 0.1), '#8a6f6a'); mouth.position.set(0, -s * 0.2, s * 0.9); g.add(mouth);
        g.position.set(x, s * 0.3, z); g.lookAt(CAM_POS.x, s * 0.3, CAM_POS.z);
        deco.add(g);
        decoAnim.push((t) => { mouth.scale.y = 1 + Math.abs(Math.sin(t * 6 + i * 2)) * 2.5; });
      });
      waveAmp = 1.3;
    } else if (sp.deco === 'gelee') {
      for (let i = 0; i < 14; i++) { const [x, z] = landPoint(); tree(x, z, rand(0.9, 1.4), 'palm', Math.random() < 0.7 ? p.tree : p.tree2, p.trunk); }
      // cubes de gelée flottants
      const jellies = ['#a5e8d4', '#ffd180', '#b39ddb', '#80d8ff'];
      for (let i = 0; i < 9; i++) {
        const j = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), M(pick(jellies), { transparent: true, opacity: 0.75, shininess: 80 }));
        j.castShadow = true;
        const x = rand(-25, 25), z = rand(-60, -14);
        floater(j, x, z, 1.5, 1);
        const ph = Math.random() * 6;
        decoAnim.push((t) => { const k = Math.sin(t * 4 + ph) * 0.08; j.scale.set(1 + k, 1 - k, 1 + k); });
      }
      // cerise géante à l'horizon
      const cherry = new THREE.Group();
      const cb = mesh(new THREE.IcosahedronGeometry(9, 1), '#e53950', { fog: false });
      const st = mesh(new THREE.CylinderGeometry(0.4, 0.5, 12, 5), '#7cb342', { fog: false }); st.position.set(2, 12, 0); st.rotation.z = -0.3;
      cherry.add(cb, st); cherry.position.set(55, 2, -150); deco.add(cherry);
      // parasol
      const par = new THREE.Group();
      const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 5), '#ffffff'); pole.position.y = 1.5;
      const top = mesh(new THREE.ConeGeometry(1.8, 0.8, 8), '#ff8fb1'); top.position.y = 3;
      par.add(pole, top); par.position.set(-16, 0.5, -6); deco.add(par);
    } else if (sp.deco === 'cosmique') {
      // étoiles
      const starGeo = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i < 700; i++) {
        const v = new THREE.Vector3(rand(-1, 1), rand(0.02, 0.7), rand(-1, -0.2)).normalize().multiplyScalar(350);
        pts.push(v.x, v.y, v.z);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false }));
      deco.add(stars);
      decoAnim.push((t) => { stars.rotation.y = t * 0.005; });
      // planètes
      [[-60, 50, -180, 14, '#ff8fb1'], [80, 70, -220, 22, '#80cbc4'], [20, 30, -120, 5, '#ffe08a']].forEach(([x, y, z, r, c], i) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(c, { emissive: 0x332244, fog: false })));
        if (i !== 2) {
          const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 1.9, 24), M('#d1c4e9', { side: THREE.DoubleSide, emissive: 0x332244, fog: false }));
          ring.rotation.x = 1.2; g.add(ring);
        }
        g.position.set(x, y, z); deco.add(g);
        decoAnim.push((t) => { g.rotation.y = t * 0.1; g.position.y = y + Math.sin(t * 0.3 + i) * 2; });
      });
      // champignons-cristaux sur la terre-fromage
      for (let i = 0; i < 16; i++) {
        const [x, z] = landPoint();
        const c = mesh(new THREE.OctahedronGeometry(rand(0.6, 1.6), 0), pick(['#80cbc4', '#ff8fb1', '#b39ddb']), { emissive: 0x221133 });
        c.scale.y = 1.8; c.position.set(x, 1.2, z); deco.add(c);
      }
      for (let i = 0; i < 14; i++) { // trous de fromage
        const [x, z] = landPoint();
        const h = new THREE.Mesh(new THREE.CircleGeometry(rand(0.5, 1.2), 7), M('#e0b850'));
        h.rotation.x = -Math.PI / 2; h.position.set(x, 0.62, z); deco.add(h);
      }
    }
  }

  function applySpot() {
    const sp = spot();
    const p = sp.pal;
    waveAmp = 1;
    skyMat.uniforms.top.value.set(p.skyTop);
    skyMat.uniforms.bottom.value.set(p.skyBottom);
    scene.fog.color.set(p.fog);
    scene.background = new THREE.Color(p.fog);
    waterMat.color.set(p.water);
    landMat.color.set(p.ground);
    hillMat.color.set(p.hills);
    sunMesh.material.color.set(p.sun);
    const night = sp.deco === 'cosmique';
    hemi.intensity = night ? 0.5 : 0.62;
    hemi.groundColor.set(night ? '#5a3f8a' : '#d8c8e8');
    sunLight.intensity = night ? 0.4 : 0.62;
    sunLight.color.set(night ? '#c9b8ff' : '#fff4e0');
    sunMesh.visible = !night;
    buildDeco(sp);
  }

  function applyRod() { rodMat.color.set(rod().color); }

  // ---------------------------------------------------------------- Poisson 3D
  function makeFishMesh(f, w) {
    const g = new THREE.Group();
    const s = clamp(0.28 + Math.log10(1 + w) * 0.32, 0.25, 1.5);
    if (f.junk) {
      const b = mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), f.color);
      b.rotation.set(0.3, 0.5, 0.2); g.add(b);
    } else {
      const bodyM = mesh(new THREE.IcosahedronGeometry(0.6, 0), f.color);
      bodyM.scale.set(1.5, 0.9, 0.55);
      const tail = mesh(new THREE.ConeGeometry(0.45, 0.6, 4), f.color);
      tail.rotation.z = Math.PI / 2; tail.position.x = -1.05;
      const fin = mesh(new THREE.ConeGeometry(0.2, 0.45, 3), f.color);
      fin.position.set(0, 0.55, 0);
      const e1 = mesh(new THREE.SphereGeometry(0.11, 6, 4), '#ffffff'); e1.position.set(0.6, 0.15, 0.25);
      const e2 = e1.clone(); e2.position.z = -0.25;
      const p1 = mesh(new THREE.SphereGeometry(0.055, 5, 3), '#3b2f4a'); p1.position.set(0.68, 0.15, 0.31);
      const p2 = p1.clone(); p2.position.z = -0.31;
      g.add(bodyM, tail, fin, e1, e2, p1, p2);
      if (f.id === 'licorne') { const horn = mesh(new THREE.ConeGeometry(0.08, 0.5, 5), '#fff59d'); horn.position.set(0.75, 0.5, 0); horn.rotation.z = -0.6; g.add(horn); }
      if (f.id === 'kevin' || f.id === 'final') { const halo = mesh(new THREE.TorusGeometry(0.35, 0.05, 4, 12), '#fff59d', { emissive: 0x887722 }); halo.position.set(0.2, 0.95, 0); halo.rotation.x = Math.PI / 2; g.add(halo); }
    }
    g.scale.setScalar(s);
    return g;
  }

  // ---------------------------------------------------------------- UI helpers
  const ui = {
    money: $('#money'), bucketCount: $('#bucket-count'), spotName: $('#spot-name'),
    gearRod: $('#gear-rod'), gearBait: $('#gear-bait'),
    narrator: $('#narrator'), narratorWho: $('#narrator-who'), narratorText: $('#narrator-text'),
    hint: $('#hint'), power: $('#power'), powerFill: $('#power-fill'),
    reel: $('#reel'), reelZone: $('#reel-zone'), reelNeedle: $('#reel-needle'), reelProg: $('#reel-prog-fill'), reelWarn: $('#reel-warn'),
    bang: $('#bang'), catchCard: $('#catch'),
    panelWrap: $('#panel-wrap'), panelTitle: $('#panel-title'), panelTabs: $('#panel-tabs'), panelBody: $('#panel-body'),
  };

  let sayTimer = null;
  function say(text, who = 'Narrateur', dur = 3800) {
    ui.narratorWho.textContent = who;
    ui.narratorText.textContent = text;
    ui.narrator.classList.remove('hidden');
    ui.narrator.style.animation = 'none'; void ui.narrator.offsetWidth; ui.narrator.style.animation = '';
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => ui.narrator.classList.add('hidden'), dur);
  }

  function updateHUD() {
    ui.money.textContent = '🪙 ' + fmt(S.money);
    ui.bucketCount.textContent = `🪣 ${S.bucket.length}/${bucketCap()}`;
    ui.bucketCount.style.color = S.bucket.length >= bucketCap() ? '#d9534f' : '';
    ui.spotName.textContent = '📍 ' + spot().name;
    ui.gearRod.textContent = `🎣 ${rod().name} · ${rod().max} kg`;
    const b = bait();
    ui.gearBait.textContent = `🪱 ${b.name}${b.cost ? ' ×' + (S.baits[b.id] || 0) : ' ∞'}`;
  }

  const HINTS = {
    idle: 'Maintiens clic / Espace pour charger, relâche pour lancer',
    charging: 'Relâche pour lancer !',
    casting: '…',
    waiting: 'Attends que ça morde… (clic = remonter la ligne)',
    bite: 'ÇA MORD ! CLIQUE !',
    reeling: 'Maintiens pour mouliner · garde l\'aiguille dans le vert',
    reelback: '…',
    caught: 'Clic pour continuer',
    snapped: '…',
  };
  function setHint() {
    ui.hint.textContent = HINTS[state] || '';
    ui.hint.classList.toggle('alert', state === 'bite');
  }

  // ---------------------------------------------------------------- Pêche : machine à états
  let state = 'idle';
  let holding = false;
  let T = 0;
  const tipPos = new THREE.Vector3();
  const bobPos = new THREE.Vector3();
  const castFrom = new THREE.Vector3();
  const castTo = new THREE.Vector3();
  let chargeT = 0, power = 0, castT = 0, waitT = 0, biteT = 0, nibbleCD = 0, idleChat = 12, reelBackT = 0, snapT = 0, tickT = 0;
  let hooked = null;  // { fish, w, ratio }
  let R = null;       // état du moulinage
  let caughtFishMesh = null, caughtT = 0;
  const reelBackFrom = new THREE.Vector3();

  function setState(s) { state = s; setHint(); }

  function uiBlocked() { return !ui.panelWrap.classList.contains('hidden'); }

  function startCharge() {
    if (S.bucket.length >= bucketCap()) { say(pick(D.quips.full)); SFX.escape(); return; }
    chargeT = 0; power = 0;
    ui.power.classList.remove('hidden');
    setState('charging');
  }

  function doCast() {
    ui.power.classList.add('hidden');
    // consommation de l'appât
    const b = bait();
    if (b.cost) {
      S.baits[b.id] = (S.baits[b.id] || 0) - 1;
      if (S.baits[b.id] <= 0) { delete S.baits[b.id]; S.bait = 'b0'; setTimeout(() => say(`Plus de ${b.name}. Retour à la mie de pain.`), 1200); }
      save(); updateHUD();
    }
    rodTip.getWorldPosition(castFrom);
    const dist = 3.5 + power * 16 * rod().range;
    castTo.set(rand(-2.5, 2.5) + power * rand(-1, 1), 0, player.position.z - 1 - dist);
    castT = 0;
    SFX.whoosh();
    setState('casting');
    if (power < 0.12) say(pick(D.quips.shortCast));
    else if (Math.random() < 0.35) say(pick(D.quips.cast));
  }

  function land() {
    bobPos.copy(castTo);
    SFX.plop();
    ripple(bobPos); splash(bobPos, 8);
    waitT = rand(2.5, 7.5) / bait().speed;
    nibbleCD = rand(1, 2.5);
    setState('waiting');
  }

  function chooseFish() {
    const sp = spot(), b = bait();
    const pool = sp.fish.map((f) => fishById[f[0]]);
    const weights = pool.map((f) => D.rarities[f.rarity].weight * (f.rarity === 'commun' ? 1 : b.rare));
    let r = Math.random() * weights.reduce((a, c) => a + c, 0);
    let fish = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { fish = pool[i]; break; } }
    const w = fish.w[0] + (fish.w[1] - fish.w[0]) * Math.pow(Math.random(), 1.6);
    return { fish, w, ratio: w / rod().max };
  }

  function bite() {
    hooked = chooseFish();
    biteT = 0.75 + 0.25 / Math.max(1, hooked.fish.fight); // fenêtre de réaction
    SFX.bite();
    ripple(bobPos, 1.3); splash(bobPos, 6);
    ui.bang.classList.remove('hidden');
    setState('bite');
  }

  function hook() {
    ui.bang.classList.add('hidden');
    const f = hooked.fish;
    const ratio = hooked.ratio;
    const diff = f.fight * (0.6 + 0.4 * clamp(ratio, 0, 3));
    R = {
      t: 0, tension: 0.35, progress: 0.3, diff,
      zoneW: clamp(rod().ctrl - 0.035 * f.fight, 0.12, 0.45),
      zoneC: 0.5, jerkT: rand(0.6, 1.4), start: bobPos.clone(), phase: Math.random() * 10,
    };
    holding = true;
    ui.reel.classList.remove('hidden');
    ui.reelWarn.textContent = ratio > 1 ? pick(D.quips.tooHeavy) : '';
    setState('reeling');
  }

  function endReel() {
    ui.reel.classList.add('hidden');
    ui.reel.classList.remove('danger');
    R = null;
  }

  function snapLine() {
    endReel();
    SFX.snap();
    splash(bobPos, 10);
    say(pick(D.quips.snap));
    bobber.visible = false;
    snapT = 1.2;
    setState('snapped');
  }

  function startReelBack() {
    reelBackFrom.copy(bobPos);
    reelBackT = 0;
    ui.bang.classList.add('hidden');
    setState('reelback');
  }

  function landFish() {
    endReel();
    const { fish, w } = hooked;
    const price = Math.max(1, Math.round(fish.v * w));
    const isNew = !S.dex[fish.id];
    S.dex[fish.id] = S.dex[fish.id] || { n: 0, best: 0 };
    S.dex[fish.id].n++;
    S.dex[fish.id].best = Math.max(S.dex[fish.id].best, w);
    S.totalCaught++;
    S.bucket.push({ id: fish.id, w: Math.round(w * 100) / 100, price });
    save(); updateHUD();

    SFX.catch();
    splash(bobPos, 16);
    ripple(bobPos, 1.6);
    caughtFishMesh = makeFishMesh(fish, w);
    caughtFishMesh.position.copy(bobPos);
    scene.add(caughtFishMesh);
    caughtT = 0;
    bobber.visible = false;

    const rar = D.rarities[fish.rarity];
    $('#catch-rarity').textContent = rar.label;
    $('#catch-rarity').style.background = rar.color;
    $('#catch-name').textContent = fish.name;
    $('#catch-weight').textContent = '⚖️ ' + fmtKg(w);
    $('#catch-price').textContent = '🪙 ' + fmt(price);
    $('#catch-desc').textContent = fish.desc;
    $('#catch-new').classList.toggle('hidden', !isNew);
    $('#catch-ok').textContent = S.bucket.length >= bucketCap() ? 'Dans le seau ! (il est plein)' : 'Dans le seau !';
    ui.catchCard.classList.remove('hidden');
    ui.catchCard.style.animation = 'none'; void ui.catchCard.offsetWidth; ui.catchCard.style.animation = '';
    say(pick(fish.junk ? D.quips.junk : D.quips.catch[fish.rarity]), fish.rarity === 'legende' ? 'Narrateur (ému)' : 'Narrateur');
    setState('caught');
  }

  function closeCatch() {
    ui.catchCard.classList.add('hidden');
    if (caughtFishMesh) { scene.remove(caughtFishMesh); caughtFishMesh = null; }
    bobber.visible = true;
    hooked = null;
    setState('idle');
  }

  // ---------------------------------------------------------------- Entrées
  function press() {
    ensureAudio();
    if (uiBlocked()) return;
    switch (state) {
      case 'idle': startCharge(); break;
      case 'waiting': say('Tu remontes la ligne. Le poisson imaginaire est déçu.'); startReelBack(); break;
      case 'bite': hook(); break;
      case 'reeling': holding = true; break;
      case 'caught': closeCatch(); break;
    }
  }
  function release() {
    if (state === 'charging') doCast();
    holding = false;
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
    if (e.code === 'Escape') closePanel();
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') release(); });
  window.addEventListener('blur', () => { holding = false; if (state === 'charging') doCast(); });
  $('#catch-ok').addEventListener('click', () => { SFX.click(); closeCatch(); });

  ui.gearBait.addEventListener('click', () => {
    ensureAudio(); SFX.click();
    if (state !== 'idle') { say("On ne change pas d'appât en pleine action. C'est le règlement."); return; }
    const owned = D.baits.filter((b) => !b.cost || S.baits[b.id] > 0);
    const i = owned.findIndex((b) => b.id === S.bait);
    S.bait = owned[(i + 1) % owned.length].id;
    save(); updateHUD();
    if (owned.length === 1) say("Tu n'as que de la mie de pain. Le chat ricane.");
  });

  // ---------------------------------------------------------------- Panneaux
  let panel = null, shopTab = 'rods';
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    ensureAudio(); SFX.click(); openPanel(b.dataset.open);
  }));
  $('#panel-close').addEventListener('click', () => { SFX.click(); closePanel(); });
  ui.panelWrap.addEventListener('pointerdown', (e) => { if (e.target === ui.panelWrap) closePanel(); });

  function openPanel(name) {
    if (state === 'charging') { ui.power.classList.add('hidden'); setState('idle'); }
    if (name === 'map' && !['idle', 'caught'].includes(state)) { say("Finis ta pêche avant de partir. Le poisson attend une réponse."); return; }
    panel = name;
    holding = false;
    ui.panelWrap.classList.remove('hidden');
    renderPanel();
  }
  function closePanel() { ui.panelWrap.classList.add('hidden'); panel = null; }

  function renderPanel() {
    let title = '', tabs = '', body = '';
    if (panel === 'shop') {
      title = '🛒 Boutique de Jean-Michel Hameçon';
      tabs = [['rods', '🎣 Cannes'], ['baits', '🪱 Appâts'], ['buckets', '🪣 Seaux']]
        .map(([k, l]) => `<button class="tab ${shopTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('');
      body = shopTab === 'rods' ? shopRods() : shopTab === 'baits' ? shopBaits() : shopBuckets();
    } else if (panel === 'bucket') {
      title = '🪣 ' + D.buckets[S.bucketLvl].name;
      body = bucketHTML();
    } else if (panel === 'map') {
      title = '🗺️ Carte des Coins Douteux';
      body = mapHTML();
    } else if (panel === 'dex') {
      title = '📖 Le Poissonnaire';
      body = dexHTML();
    }
    ui.panelTitle.textContent = title;
    ui.panelTabs.innerHTML = tabs;
    ui.panelBody.innerHTML = body;
  }

  const priceTag = (n) => `<span class="price">🪙 ${fmt(n)}</span>`;
  const can = (n) => S.money >= n;

  function shopRods() {
    return `<p class="intro">« Une meilleure canne, c'est de plus gros poissons. Et une plus grosse facture. » — Jean-Michel</p><div class="cards">` +
      D.rods.map((r) => {
        const owned = S.rods.includes(r.id), cur = S.rod === r.id;
        const action = cur ? '<button class="btn" disabled>Équipée</button>'
          : owned ? `<button class="btn ghost" data-act="equipRod" data-id="${r.id}">Équiper</button>`
          : `${priceTag(r.cost)}<button class="btn buy" data-act="buyRod" data-id="${r.id}" ${can(r.cost) ? '' : 'disabled'}>Acheter</button>`;
        return `<div class="card ${cur ? 'current' : ''}">
          <div class="swatch" style="background:${r.color}">🎣</div>
          <div class="info"><div class="title">${r.name}</div><div class="desc">${r.desc}</div>
          <div class="stats"><span>⚖️ ${r.max} kg max</span><span>💪 Puissance ${r.power}</span><span>🎯 Contrôle ${Math.round(r.ctrl * 100)}</span><span>📏 Portée ${Math.round(r.range * 100)}</span></div></div>
          <div class="actions">${action}</div></div>`;
      }).join('') + '</div>';
  }
  function shopBaits() {
    return `<p class="intro">Les appâts attirent les poissons rares et les font mordre plus vite. Vendus par ${D.baitPack}. Un appât est consommé à chaque lancer.</p><div class="cards">` +
      D.baits.map((b) => {
        const cur = S.bait === b.id, n = S.baits[b.id] || 0;
        const action = b.cost
          ? `${priceTag(b.cost)}<button class="btn buy" data-act="buyBait" data-id="${b.id}" ${can(b.cost) ? '' : 'disabled'}>Acheter ×${D.baitPack}</button>${n && !cur ? `<button class="btn ghost" data-act="equipBait" data-id="${b.id}">Utiliser</button>` : ''}`
          : cur ? '<button class="btn" disabled>Utilisée</button>' : `<button class="btn ghost" data-act="equipBait" data-id="${b.id}">Utiliser</button>`;
        return `<div class="card ${cur ? 'current' : ''}">
          <div class="swatch" style="background:#f5eefc">🪱</div>
          <div class="info"><div class="title">${b.name} ${b.cost ? `<span class="tag" style="background:#a98be0">×${n}</span>` : ''}</div><div class="desc">${b.desc}</div>
          <div class="stats"><span>✨ Rareté ×${b.rare}</span><span>⏱️ Touche ×${b.speed}</span></div></div>
          <div class="actions">${action}</div></div>`;
      }).join('') + '</div>';
  }
  function shopBuckets() {
    return `<p class="intro">Plus de place = moins d'allers-retours chez Josiane la poissonnière.</p><div class="cards">` +
      D.buckets.map((b, i) => {
        const cur = S.bucketLvl === i, owned = S.bucketLvl >= i, next = i === S.bucketLvl + 1;
        const action = cur ? '<button class="btn" disabled>Actuel</button>'
          : owned ? '<button class="btn" disabled>Dépassé</button>'
          : next ? `${priceTag(b.cost)}<button class="btn buy" data-act="buyBucket" data-id="${i}" ${can(b.cost) ? '' : 'disabled'}>Acheter</button>`
          : `${priceTag(b.cost)}<button class="btn" disabled>Un à la fois</button>`;
        return `<div class="card ${cur ? 'current' : ''} ${!owned && !next ? 'locked' : ''}">
          <div class="swatch" style="background:#e3f3f1">🪣</div>
          <div class="info"><div class="title">${b.name}</div><div class="stats"><span>📦 ${b.cap} places</span></div></div>
          <div class="actions">${action}</div></div>`;
      }).join('') + '</div>';
  }
  function bucketHTML() {
    if (!S.bucket.length) return '<div class="empty">Ton seau est vide. Il contient seulement tes espoirs, et un peu d\'eau.</div>';
    const total = S.bucket.reduce((a, b) => a + b.price, 0);
    return `<div class="bucket-head"><span>${S.bucket.length}/${bucketCap()} places · Valeur totale ${priceTag(total)}</span>
      <button class="btn sell" data-act="sellAll">💰 Tout vendre à Josiane</button></div><div class="cards">` +
      S.bucket.map((it, i) => {
        const f = fishById[it.id], rar = D.rarities[f.rarity];
        return `<div class="card"><div class="swatch" style="background:${f.color}">${f.junk ? '🧦' : '🐟'}</div>
          <div class="info"><div class="title">${f.name} <span class="tag" style="background:${rar.color}">${rar.label}</span></div>
          <div class="stats"><span>⚖️ ${fmtKg(it.w)}</span></div></div>
          <div class="actions">${priceTag(it.price)}<button class="btn sell" data-act="sell" data-id="${i}">Vendre</button></div></div>`;
      }).join('') + '</div>';
  }
  function mapHTML() {
    return '<p class="intro">Chaque coin a ses poissons. Les plus lointains demandent une canne solide (et du courage).</p><div class="cards">' +
      D.spots.map((sp) => {
        const owned = S.spots.includes(sp.id), cur = S.spot === sp.id;
        const known = sp.fish.filter((f) => S.dex[f[0]]).length;
        const action = cur ? '<button class="btn" disabled>Tu y es</button>'
          : owned ? `<button class="btn buy" data-act="travel" data-id="${sp.id}">Y aller</button>`
          : `${priceTag(sp.cost)}<button class="btn buy" data-act="buySpot" data-id="${sp.id}" ${can(sp.cost) ? '' : 'disabled'}>Débloquer</button>`;
        return `<div class="card ${cur ? 'current' : ''} ${owned ? '' : 'locked'}">
          <div class="swatch" style="background:linear-gradient(${sp.pal.skyTop}, ${sp.pal.water})">${owned ? '📍' : '🔒'}</div>
          <div class="info"><div class="title">${sp.name}</div><div class="desc">${sp.desc}</div>
          <div class="stats"><span>🎣 Canne conseillée : ${sp.rodHint} kg+</span><span>📖 ${known}/${sp.fish.length} espèces</span></div></div>
          <div class="actions">${action}</div></div>`;
      }).join('') + '</div>';
  }
  function dexHTML() {
    const all = Object.keys(fishById).length, known = Object.keys(S.dex).length;
    return `<p class="intro">${known}/${all} espèces découvertes · ${fmt(S.totalCaught)} prises au total. Le chat tient les comptes.</p>` +
      D.spots.map((sp) => `<div class="dex-spot"><h3>${S.spots.includes(sp.id) ? '' : '🔒 '}${sp.name}</h3><div class="dex-grid">` +
        sp.fish.map((fr) => {
          const f = fishById[fr[0]], d = S.dex[f.id], rar = D.rarities[f.rarity];
          return d
            ? `<div class="dex-item"><div class="n">${f.name}</div><span class="tag" style="background:${rar.color}">${rar.label}</span><div>×${d.n} · record ${fmtKg(d.best)}</div></div>`
            : `<div class="dex-item unknown"><div class="n">???</div><span class="tag" style="background:${rar.color}">${rar.label}</span><div>Pas encore pêché</div></div>`;
        }).join('') + '</div></div>').join('') +
      '<div class="reset"><button class="btn ghost" data-act="reset">🗑️ Tout recommencer (même la honte)</button></div>';
  }

  ui.panelTabs.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    SFX.click(); shopTab = t.dataset.tab; renderPanel();
  });

  function spend(n) {
    if (S.money < n) { say(pick(D.quips.poor)); return false; }
    S.money -= n; SFX.coin(); return true;
  }

  ui.panelBody.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case 'buyRod': { const r = rodById(id); if (spend(r.cost)) { S.rods.push(id); S.rod = id; applyRod(); say(pick(D.quips.buy)); } break; }
      case 'equipRod': S.rod = id; applyRod(); SFX.click(); break;
      case 'buyBait': { const bt = baitById(id); if (spend(bt.cost)) { S.baits[id] = (S.baits[id] || 0) + D.baitPack; S.bait = id; say(pick(D.quips.buy)); } break; }
      case 'equipBait': S.bait = id; SFX.click(); break;
      case 'buyBucket': { const i = +id; if (spend(D.buckets[i].cost)) { S.bucketLvl = i; say(pick(D.quips.buy)); } break; }
      case 'sell': {
        const it = S.bucket.splice(+id, 1)[0];
        if (it) { S.money += it.price; SFX.coin(); if (Math.random() < 0.4) say(pick(D.quips.sell), 'Josiane'); }
        break;
      }
      case 'sellAll': {
        const total = S.bucket.reduce((a, c) => a + c.price, 0);
        S.money += total; S.bucket = []; SFX.coin();
        say(`+${fmt(total)} pièces. ` + pick(D.quips.sell), 'Josiane');
        break;
      }
      case 'buySpot': { const sp = spotById(id); if (spend(sp.cost)) { S.spots.push(id); say(`${sp.name} débloqué ! ` + pick(D.quips.buy)); } break; }
      case 'travel': {
        S.spot = id; save(); applySpot(); updateHUD(); closePanel();
        SFX.whoosh(); say(spot().desc, spot().name, 5000);
        setTimeout(() => say(pick(D.quips.travel)), 5200);
        return;
      }
      case 'reset':
        if (confirm('Tout effacer ? Les poissons oublieront ton nom. Le chat, jamais.')) {
          S = defaultState(); save(); applySpot(); applyRod(); updateHUD(); closePanel();
          say(D.quips.welcome[0]);
          return;
        }
        break;
    }
    save(); updateHUD(); renderPanel();
  });

  // ---------------------------------------------------------------- Boucle
  const tmpV = new THREE.Vector3();
  const bangPos = new THREE.Vector3();
  const FISH_SHOW = new THREE.Vector3(0.9, 2.3, -2.8);

  function updateLine() {
    rodTip.getWorldPosition(tipPos);
    const arr = lineGeo.attributes.position.array;
    let sag = 0.4;
    if (state === 'idle' || state === 'charging' || state === 'caught' || state === 'snapped') sag = 0;
    else if (state === 'reeling') sag = 0.25 * (1 - (R ? R.tension : 0.5));
    else if (state === 'casting') sag = 0.1;
    for (let i = 0; i < LINE_N; i++) {
      const t = i / (LINE_N - 1);
      tmpV.lerpVectors(tipPos, bobPos, t);
      tmpV.y -= sag * Math.sin(Math.PI * t);
      arr[i * 3] = tmpV.x; arr[i * 3 + 1] = tmpV.y; arr[i * 3 + 2] = tmpV.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    line.visible = state !== 'snapped' && state !== 'caught';
  }

  function hangBobber(dt) {
    rodTip.getWorldPosition(tipPos);
    bobPos.set(tipPos.x + Math.sin(T * 1.7) * 0.05, tipPos.y - 0.9, tipPos.z + Math.cos(T * 1.3) * 0.05);
  }

  function update(dt) {
    T += dt;
    updateWater(T);
    let rodTarget = ROD_IDLE, rodWobble = 0;

    switch (state) {
      case 'idle':
        hangBobber(dt);
        idleChat -= dt;
        if (idleChat <= 0) { idleChat = rand(25, 45); if (!uiBlocked()) say(pick(D.quips.cat), 'Le Chat Qui Juge'); }
        break;

      case 'charging':
        chargeT += dt;
        power = 1 - Math.abs(((chargeT * 0.85) % 2) - 1); // va-et-vient
        ui.powerFill.style.width = (power * 100).toFixed(1) + '%';
        rodTarget = lerp(ROD_IDLE, 0.55, power);
        hangBobber(dt);
        break;

      case 'casting': {
        castT += dt / 0.75;
        rodTarget = -1.25;
        const t = Math.min(castT, 1);
        bobPos.lerpVectors(castFrom, castTo, t);
        bobPos.y = lerp(castFrom.y, 0.05, t) + Math.sin(Math.PI * t) * (2 + power * 3);
        if (castT >= 1) land();
        break;
      }

      case 'waiting':
        bobPos.y = waveH(bobPos.x, bobPos.z, T) + 0.05;
        waitT -= dt;
        nibbleCD -= dt;
        if (nibbleCD <= 0 && waitT > 1.2 && Math.random() < 0.5 * dt) { // fausse alerte
          nibbleCD = rand(2, 4);
          ripple(bobPos, 0.6);
          bobPos.y -= 0.1;
          if (Math.random() < 0.5) say(pick(D.quips.nibble));
        }
        if (Math.random() < 0.012 * dt * 60 && waitT > 3) { if (Math.random() < 0.05) say(pick(D.quips.wait)); }
        if (waitT <= 0) bite();
        break;

      case 'bite':
        biteT -= dt;
        bobPos.y = waveH(bobPos.x, bobPos.z, T) - 0.18 + Math.sin(T * 30) * 0.06;
        rodWobble = Math.sin(T * 25) * 0.04;
        if (biteT <= 0) { say(pick(D.quips.miss)); SFX.escape(); hooked = null; startReelBack(); }
        break;

      case 'reeling': {
        R.t += dt;
        // la zone verte se balade selon la combativité du poisson
        const half = R.zoneW / 2;
        const swing = 0.5 - half;
        R.zoneC = 0.5 + swing * Math.sin(R.t * (0.55 + 0.45 * R.diff) + R.phase) * (0.6 + 0.4 * Math.sin(R.t * 0.43 + 1.7));
        // tension
        R.tension += (holding ? 0.85 : -0.7) * dt;
        R.jerkT -= dt;
        if (R.jerkT <= 0) {
          R.jerkT = rand(0.5, 1.6) / Math.max(0.5, R.diff);
          R.tension += rand(0.04, 0.13) * R.diff * Math.max(1, hooked.ratio);
          ripple(bobPos, 0.7);
        }
        R.tension = clamp(R.tension, 0, 1.05);
        const inZone = Math.abs(R.tension - R.zoneC) < half;
        const gain = 0.17 * rod().power / (0.6 + R.diff * 0.6) / Math.max(1, hooked.ratio * hooked.ratio);
        R.progress += inZone ? gain * dt : -0.1 * dt;
        if (holding) { tickT -= dt; if (tickT <= 0) { SFX.tick(); tickT = 0.07; } }

        // visuel
        ui.reelZone.style.left = ((R.zoneC - half) * 100) + '%';
        ui.reelZone.style.width = (R.zoneW * 100) + '%';
        ui.reelZone.style.background = inZone ? '#8bd49a' : '#c6e9cd';
        ui.reelNeedle.style.left = (clamp(R.tension, 0, 1) * 100) + '%';
        ui.reelProg.style.width = (clamp(R.progress, 0, 1) * 100) + '%';
        ui.reel.classList.toggle('danger', R.tension > 0.85);

        const near = tmpV.set(player.position.x + 0.3, 0, player.position.z - 2.2);
        const k = clamp(R.progress, 0, 1);
        bobPos.x = lerp(R.start.x, near.x, k) + Math.sin(R.t * 2.3) * 1.2 * (1 - k);
        bobPos.z = lerp(R.start.z, near.z, k);
        bobPos.y = waveH(bobPos.x, bobPos.z, T) - 0.1 + Math.sin(R.t * 18) * 0.04 * R.diff;
        rodTarget = -0.55 + R.tension * 0.25;
        rodWobble = Math.sin(R.t * 30) * 0.02 * (1 + R.tension * 2);
        if (Math.random() < dt * 3) splash(bobPos, 1);

        if (R.tension >= 1) snapLine();
        else if (R.progress <= 0) { endReel(); SFX.escape(); say(pick(D.quips.escape)); hooked = null; startReelBack(); }
        else if (R.progress >= 1) landFish();
        break;
      }

      case 'reelback': {
        reelBackT += dt / 0.6;
        rodTip.getWorldPosition(tipPos);
        const t = Math.min(reelBackT, 1);
        bobPos.lerpVectors(reelBackFrom, tmpV.set(tipPos.x, tipPos.y - 0.9, tipPos.z), t);
        bobPos.y += Math.sin(Math.PI * t) * 1.2;
        if (reelBackT >= 1) setState('idle');
        break;
      }

      case 'snapped':
        snapT -= dt;
        hangBobber(dt);
        if (snapT <= 0) { bobber.visible = true; hooked = null; setState('idle'); }
        break;

      case 'caught':
        hangBobber(dt);
        if (caughtFishMesh) {
          caughtT += dt;
          const t = Math.min(caughtT / 0.8, 1);
          if (!caughtFishMesh.userData.from) caughtFishMesh.userData.from = caughtFishMesh.position.clone();
          if (t < 1) {
            caughtFishMesh.position.lerpVectors(caughtFishMesh.userData.from, FISH_SHOW, t);
            caughtFishMesh.position.y += Math.sin(Math.PI * t) * 2.2;
            caughtFishMesh.rotation.z = t * Math.PI * 4;
          } else {
            caughtFishMesh.position.y = FISH_SHOW.y + Math.sin(caughtT * 3) * 0.1;
            caughtFishMesh.rotation.z = Math.sin(caughtT * 8) * 0.3; // il gigote
            caughtFishMesh.rotation.y = caughtT * 1.2;
          }
        }
        break;
    }

    // canne
    rodPivot.rotation.x = lerp(rodPivot.rotation.x, rodTarget, Math.min(1, dt * (state === 'casting' ? 18 : 8))) + rodWobble;
    bobber.position.copy(bobPos);
    updateLine();

    // marqueur "!"
    if (state === 'bite') {
      bangPos.copy(bobPos); bangPos.y += 0.6; bangPos.project(camera);
      ui.bang.style.left = ((bangPos.x + 1) / 2 * innerWidth) + 'px';
      ui.bang.style.top = ((1 - bangPos.y) / 2 * innerHeight) + 'px';
    }

    // le chat regarde le bouchon, cligne des yeux, remue la queue
    tmpV.copy(bobPos).sub(cat.position);
    const targetYaw = Math.atan2(tmpV.x, tmpV.z) - cat.rotation.y;
    catHead.rotation.y = lerp(catHead.rotation.y, clamp(targetYaw, -1.2, 1.2), dt * 3);
    const blink = (T % 4.3) < 0.12 ? 0.1 : 1;
    eyeL.scale.y = eyeR.scale.y = blink;
    catTail.rotation.z = Math.sin(T * (state === 'reeling' ? 6 : 1.5)) * 0.4;

    // respiration du pêcheur
    body.scale.y = 1 + Math.sin(T * 2) * 0.015;
    head.position.y = 1.45 + Math.sin(T * 2) * 0.01;

    // caméra
    camera.position.set(CAM_POS.x + Math.sin(T * 0.3) * 0.08, CAM_POS.y + Math.sin(T * 0.5) * 0.05, CAM_POS.z);
    if (state === 'reeling' && R && R.tension > 0.8) camera.position.x += (Math.random() - 0.5) * 0.04;
    camera.lookAt(CAM_LOOK);

    decoAnim.forEach((f) => f(T, dt));
    updateFx(dt);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 72 : 55; // portrait : on élargit
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- Démarrage
  if (!spotById(S.spot)) S.spot = 's1';
  if (!rodById(S.rod)) S.rod = 'r1';
  if (!baitById(S.bait)) S.bait = 'b0';
  resize();
  applySpot();
  applyRod();
  updateHUD();
  setHint();
  hangBobber(0);
  if (!S.seenWelcome) {
    S.seenWelcome = true; save();
    setTimeout(() => say(D.quips.welcome[0], 'Narrateur', 5500), 600);
    setTimeout(() => say("Je ne t'aiderai pas. Je juge, c'est tout.", 'Le Chat Qui Juge', 4000), 6500);
  } else {
    setTimeout(() => say(`Re-bonjour. Tu as ${fmt(S.money)} pièces et ${S.bucket.length} trucs dans ton seau.`), 600);
  }
  requestAnimationFrame(loop);

  // Petit accès debug console : PP.money(1000)
  window.PP = { state: () => S, money: (n) => { S.money += n; save(); updateHUD(); } };
})();
