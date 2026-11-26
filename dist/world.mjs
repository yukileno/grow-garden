import * as THREE from "./three.module.min.js";
import "./app.js";

const world = document.getElementById("world");
const game = window.gardenWorld;
const panel = document.getElementById("interface");
try {
  start();
} catch (error) {
  console.error(error);
  world.innerHTML = '<p class="world-error">3Dを表示できませんでした。ブラウザのWebGL設定を確認してください。<br>左上のボタンで農園メニューを開けます。</p>';
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.world ?? button.dataset.travel;
    if (action === "market" || action === "seeds") showPanel("market");
    if (action === "garden") showPanel("fallback");
    if (action === "sell") showPanel("sell");
    if (action === "close") hidePanel();
    if (action === "help") game.help();
    if (action === "study") game.showStudy();
  });
}

function showPanel(view) {
  panel.dataset.view = view;
  panel.hidden = false;
  game.accountPlayTime();
  if (panel.hidden) return;
  panel.querySelector('[data-world="close"]').focus();
}

function hidePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  game.accountPlayTime();
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.append(renderer.domElement);
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#85c7f2");
  scene.fog = new THREE.Fog("#9bd0f6", 65, 135);
  const camera = new THREE.PerspectiveCamera(58, 1, .1, 175);
  const sky = new THREE.HemisphereLight("#e4f5ff", "#65844b", 1.85);
  scene.add(sky);
  const sun = new THREE.DirectionalLight("#fff0c8", 2.15);
  sun.position.set(-23, 39, 18);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -47, right: 47, top: 48, bottom: -45, near: 1, far: 118 });
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.normalBias = .08;
  scene.add(sun);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  function part(parent, color, x, y, z, w, h, d, shadow = true) {
    if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: .91 }));
    const mesh = new THREE.Mesh(cube, mats.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const colliders = [];
  const block = (x, z, w, d) => colliders.push({ x, z, w: w / 2, d: d / 2 });
  const fixtures = [];
  const plots = [];
  const picks = [];
  const beds = [];
  const farmSigns = [];
  const worldColors = { grass: "#64ac36", path: "#81bc47", soil: "#79502e", post: "#9c662f", rail: "#c28b47" };
  part(scene, "#664a34", 0, -1.44, -6, 100, 2.5, 91, false);
  part(scene, worldColors.grass, 0, -.19, -6, 100, .38, 91, false);
  part(scene, worldColors.path, 0, .001, -6, 9.2, .02, 90, false);
  part(scene, worldColors.path, 0, .003, -22, 98, .026, 8, false);
  const matrix = new THREE.Matrix4();
  const studPositions = [];
  for (let z = -50; z <= 38; z += 1.68) {
    for (let x = -49; x <= 49; x += 1.68) studPositions.push([x, z]);
  }
  const studs = new THREE.InstancedMesh(cube, new THREE.MeshStandardMaterial(), studPositions.length);
  const grassStud = new THREE.Color("#74b844");
  const laneStud = new THREE.Color("#8cc552");
  studPositions.forEach(([x, z], i) => {
    matrix.makeScale(.62, .028, .62).setPosition(x, .026, z);
    studs.setMatrixAt(i, matrix);
    studs.setColorAt(i, Math.abs(x) < 4.6 || Math.abs(z + 22) < 4 ? laneStud : grassStud);
  });
  studs.receiveShadow = true;
  scene.add(studs);

  function sign(parent, label, x, y, z, width, height, color) {
    const tile = document.createElement("canvas");
    tile.width = 512;
    tile.height = 128;
    const context = tile.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, 512, 128);
    context.strokeStyle = "#ffffff43";
    context.lineWidth = 12;
    context.strokeRect(6, 6, 500, 116);
    context.font = '900 62px "Yu Gothic UI", "Hiragino Sans", Meiryo, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = "#33291c";
    context.lineWidth = 9;
    context.strokeText(label, 256, 68, 465);
    context.fillStyle = "#fffbe0";
    context.fillText(label, 256, 68, 465);
    const texture = new THREE.CanvasTexture(tile);
    texture.colorSpace = THREE.SRGBColorSpace;
    const board = part(parent, "#8e5d30", x, y, z, width, height, .2);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width - .09, height - .07), new THREE.MeshBasicMaterial({ map: texture }));
    face.position.set(x, y, z + .107);
    parent.add(face);
    return board;
  }

  function fence(x1, z1, x2, z2) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const group = new THREE.Group();
    scene.add(group);
    group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    for (const height of [.46, .96]) part(group, worldColors.rail, 0, height, 0, length, .2, .19);
    const segments = Math.max(1, Math.ceil(length / 4));
    for (let i = 0; i <= segments; i++) {
      const x = i / segments * length - length / 2;
      part(group, worldColors.post, x, .67, 0, .32, 1.34, .32);
      part(group, "#dfad64", x, 1.38, 0, .38, .12, .38);
    }
    block(group.position.x, group.position.z, Math.abs(x2 - x1) || .22, Math.abs(z2 - z1) || .22);
  }

  function farm(x, z, id) {
    beds.push({ x, z });
    fence(x - 9, z - 7.2, x + 9, z - 7.2);
    fence(x - 9, z - 7.2, x - 9, z + 7.2);
    fence(x + 9, z - 7.2, x + 9, z + 7.2);
    fence(x - 9, z + 7.2, x - 2, z + 7.2);
    fence(x + 2, z + 7.2, x + 9, z + 7.2);
    const ownedSign = new THREE.Group();
    scene.add(ownedSign);
    sign(ownedSign, id === 0 ? "わたしの畑" : `わたしの畑 ${id + 1}`, x - 5, 1.87, z + 7.24, 5.25, 1.05, "#4e8b33");
    const vacantSign = new THREE.Group();
    scene.add(vacantSign);
    if (id > 0) sign(vacantSign, "空き農園", x - 5, 1.87, z + 7.24, 5.25, 1.05, "#936637");
    farmSigns.push({ ownedSign, vacantSign, firstPlot: id * Garden.plotsPerFarm });
    for (let row = 0; row < 3; row++) {
      part(scene, "#9f6d38", x, .13, z - 4.4 + row * 4.35, 15.8, .26, 3.6);
      for (let col = 0; col < 4; col++) {
        const px = x + (col - 1.5) * 3.9;
        const pz = z - 4.4 + row * 4.35;
        const bed = part(scene, worldColors.soil, px, .29, pz, 3.78, .28, 3.4);
        for (let ridge = -1; ridge <= 1; ridge++) {
          part(scene, "#8e6037", px, .435, pz + ridge * .79, 3.68, .06, .3, false);
        }
        const crop = new THREE.Group();
        scene.add(crop);
        crop.position.set(px, .46, pz);
        const target = { type: "plot", index: id * Garden.plotsPerFarm + row * 4 + col, x: px, z: pz, crop, bed };
        plots.push(target);
        picks.push(bed);
        bed.userData.target = target;
      }
    }
  }
  farm(-14, 0, 0);
  farm(-14, 19, 1);
  farm(14, 0, 2);
  farm(14, 19, 3);

  function person(parent, x, z, outfit, hair, cap = false) {
    const avatar = new THREE.Group();
    parent.add(avatar);
    avatar.position.set(x, 0, z);
    const skin = "#f3bc82";
    part(avatar, outfit, 0, 1.3, 0, .83, .82, .48);
    part(avatar, skin, 0, 1.98, 0, .6, .56, .56);
    part(avatar, hair, 0, 2.25, 0, .65, .19, .65);
    part(avatar, hair, 0, 2.025, -.228, .62, .42, .16);
    part(avatar, "#352b23", -.12, 2.01, .285, .052, .08, .019, false);
    part(avatar, "#352b23", .12, 2.01, .285, .052, .08, .019, false);
    part(avatar, "#915831", 0, 1.9, .286, .13, .035, .017, false);
    if (cap) part(avatar, hair, 0, 2.18, .16, .92, .12, .8);
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(), leg = new THREE.Group();
      avatar.add(arm, leg);
      arm.position.set(side * .57, 1.65, 0);
      leg.position.set(side * .219, .91, 0);
      part(arm, outfit, 0, -.18, 0, .26, .4, .31);
      part(arm, skin, 0, -.47, 0, .26, .24, .28);
      part(leg, "#344c79", 0, -.33, 0, .36, .64, .39);
      part(leg, "#503824", 0, -.8, .065, .38, .19, .54);
      limbs.push({ arm, leg, side });
    }
    return { avatar, limbs };
  }

  function booth(x, z, label, type, color, outfit) {
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);
    boothGroup.position.set(x, 0, z);
    part(boothGroup, "#b58149", 0, .125, 0, 7.5, .25, 5.2);
    part(boothGroup, "#ad7540", 0, 1.06, 1.51, 7.2, 1.55, .81);
    part(boothGroup, "#d1a36b", 0, 1.88, 1.52, 7.48, .22, 1.18);
    part(boothGroup, "#aa7646", 0, 1.41, -2.2, 7.1, 2.55, .25);
    for (const side of [-1, 1]) {
      for (const depth of [-2.15, 2.15]) part(boothGroup, "#926035", side * 3.48, 2.08, depth, .35, 3.85, .35);
    }
    for (let i = 0; i < 9; i++) {
      const awning = part(boothGroup, i % 2 ? "#f9edcc" : color, (i - 4) * .91, 4.02, .16, .92, .19, 5.9);
      awning.rotation.x = .16;
      part(boothGroup, i % 2 ? "#f9edcc" : color, (i - 4) * .91, 3.5, 3.04, .92, .32, .13);
    }
    sign(boothGroup, label, 0, 4.52, 2.24, 7.55, 1.12, color);
    const vendor = person(boothGroup, 0, .12, outfit, "#6e442a", true);
    vendor.avatar.position.y = .28;
    for (const side of [-1, 1]) part(boothGroup, "#bd8d54", side * 2.68, 2.09, 1.66, .73, .41, .7);
    const target = { type, label, x, z: z + 3.9 };
    fixtures.push(target);
    boothGroup.traverse(object => { if (object.isMesh) { object.userData.target = target; picks.push(object); } });
    block(x, z, 7.5, 5.2);
    return target;
  }
  const seeds = booth(-14, -14, "種屋", "seeds", "#2f87ce", "#4e89c8");
  const sell = booth(14, -14, "売却所", "sell", "#d56b38", "#d56b38");
  const classroom = booth(0, -28, "社会教室", "study", "#9154ad", "#a16fba");
  booth(-30, -15, "道具屋", "gear", "#7447a1", "#986dba");
  booth(30, -15, "卵屋", "eggs", "#d59339", "#e7b64e");
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 8.8;
    const height = 5 + (i % 4) * 2.15;
    part(scene, "#796753", x, height / 2 - .18, -47, 9, height, 7);
    part(scene, "#68a03a", x, height - .11, -47, 9.03, .37, 7.05);
  }

  function tree(x, z, size) {
    part(scene, "#835734", x, 1.55 * size, z, .73 * size, 3.1 * size, .71 * size);
    part(scene, "#317338", x, 3.33 * size, z, 3.2 * size, 2.13 * size, 2.9 * size);
    part(scene, "#479841", x + .27 * size, 4.36 * size, z - .13, 2.18 * size, 1.39 * size, 2.2 * size);
    part(scene, "#579b37", x - .84 * size, 3.62 * size, z + .43, 1.72 * size, 1.29 * size, 2.0 * size);
    block(x, z, .7 * size, .7 * size);
  }
  for (let i = 0; i < 16; i++) {
    const amount = .85 + i % 5 * .17;
    tree((i - 7.5) * 5.7, -36 - (i * 7 % 5), amount);
    if (i < 8) tree(i % 2 ? 44 : -44, -24 + i * 7.5, amount);
  }
  for (let i = 0; i < 11; i++) {
    const x = (i - 5) * 16;
    const y = 22 + i % 4 * 3.8;
    const z = -80 + i % 3 * 11;
    part(scene, "#f6fbff", x, y, z, 10, 1.28, 4.3, false);
    part(scene, "#f6fbff", x + 2.3, y + .83, z, 5.7, 1.3, 3.8, false);
  }

  const player = person(scene, -14, 8.25, "#3d8760", "#71503a", true);
  const avatar = player.avatar;
  avatar.rotation.y = Math.PI;
  let yaw = .36, pitch = .43, zoom = 10.7;
  let jumpSpeed = 0, jumpHeight = 0, walk = 0;
  const keys = new Set();
  let nearby = null;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interact = document.getElementById("interact");
  const hotbar = document.getElementById("hotbar");
  const money = document.getElementById("world-money");
  const weather = document.getElementById("world-weather");
  const number = new Intl.NumberFormat("ja-JP");
  const targetPoint = new THREE.Vector3();
  const cameraPoint = new THREE.Vector3();
  const destinations = { seeds, sell, study: classroom, garden: { x: -14, z: 8.1 } };
  const colors = {
    carrot: "#f07128", strawberry: "#e13845", blueberry: "#544cc7", tomato: "#e24a2d",
    watermelon: "#358b42", grape: "#853fbe", mango: "#f2ae32", sunflower: "#ffce3c",
  };
  const rainCount = 220;
  const drops = new Float32Array(rainCount * 6);
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(drops, 3).setUsage(THREE.DynamicDrawUsage));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: "#c9e9ff", transparent: true, opacity: .44 }));
  const rainPattern = Array.from({ length: rainCount }, () => [Math.random(), Math.random(), Math.random()]);
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);

  function updateRain(timestamp) {
    rainPattern.forEach(([a, b, c], i) => {
      const x = avatar.position.x + (a - .5) * 35;
      const z = avatar.position.z + (b - .5) * 34;
      const y = 16 * ((c + (1 - timestamp / 1300 % 1)) % 1);
      drops.set([x, y, z, x + .08, y + .55, z - .06], i * 6);
    });
    rainGeometry.attributes.position.needsUpdate = true;
  }

  function repaintCrop(target, plot) {
    const signature = plot ? [plot.id, plot.generation, plot.fruit?.variant, plot.fruit?.mods.join(), plot.locked].join(":") : "";
    if (target.signature !== signature) {
      target.signature = signature;
      target.crop.clear();
      if (plot) {
        const color = plot.fruit?.variant === "Gold" ? "#ffcc34" : Garden.crops[plot.key].color ?? colors[plot.key];
        const stem = part(target.crop, "#328335", 0, .47, 0, .19, .98, .18);
        const leafA = part(target.crop, "#5da630", -.26, .53, .08, .62, .17, .25);
        const leafB = part(target.crop, "#479d36", .24, .71, -.04, .52, .18, .24);
        leafA.rotation.z = -.37;
        leafB.rotation.z = .43;
        if (plot.fruit) {
          const weight = Math.min(1.65, Math.cbrt(plot.fruit.weight / Garden.crops[plot.key].weight));
          if (plot.key === "carrot") {
            part(target.crop, color, 0, .42, 0, .58 * weight, .82 * weight, .56 * weight);
            part(target.crop, color, 0, .11, 0, .37 * weight, .28 * weight, .38 * weight);
            stem.position.y = .81;
          } else if (["sunflower", "tulip", "briarRose", "moonBloom", "hypnoBloom"].includes(plot.key)) {
            part(target.crop, color, 0, 1.1, 0, 1.03 * weight, 1.03 * weight, .24);
            part(target.crop, "#684021", 0, 1.09, .17, .52 * weight, .54 * weight, .15);
          } else if (plot.key === "bamboo" || plot.key === "cactus") {
            part(target.crop, color, 0, .92, 0, .31, 1.85 * weight, .33);
            part(target.crop, "#7fc44a", -.28, 1.02, .05, .48, .25, .25);
          } else {
            for (let i = -1; i <= 1; i++) {
              const size = (i ? .48 : .68) * weight;
              const tint = plot.fruit.variant === "Rainbow" ? ["#f4467b", "#ffd843", "#7d5cf4"][i + 1] : color;
              part(target.crop, tint, i * .46, .85 + (i === 0 ? .24 : 0), .17, size, size * .9, size);
            }
          }
          if (plot.fruit.mods.length) {
            const glow = plot.fruit.mods.includes("Shocked") ? "#f2ee5c" : "#a0e6ff";
            for (const side of [-1, 1]) {
              const spark = part(target.crop, glow, side * .67, 1.35, .26, .095, .095, .095, false);
              spark.rotation.z = Math.PI / 4;
            }
          }
        }
      }
    }
    if (plot) {
      const ratio = plot.fruit ? 1.18 : .24 + .61 * plot.progress / Garden.duration(plot);
      target.crop.scale.setScalar(ratio);
    }
  }

  let slotKeys = [];
  let lastHud = "";
  function updateHud(now) {
    const state = game.state;
    const inventory = Object.entries(state.seeds).filter(([, count]) => count > 0);
    const signature = JSON.stringify([inventory, game.selected, state.basket.length, state.money]);
    if (lastHud !== signature) {
      lastHud = signature;
      slotKeys = inventory.map(([key]) => key);
      hotbar.innerHTML = inventory.map(([key, count], index) =>
        `<button data-seed="${key}" aria-pressed="${game.selected === key}"><em>${index + 1}</em><b>${key === "blueberry" ? '<i class="blueberry-art"></i>' : Garden.crops[key].icon}</b>${Garden.crops[key].name} ×${count}</button>`
      ).join("") + `<button data-world="bag"><b>🧰</b>道具・ペット</button><button data-world="basket"><b>🧺</b>収穫かご ×${state.basket.length}</button>`;
      money.textContent = number.format(state.money) + " シェックル";
    }
    const current = Garden.weather(now);
    const restock = Math.ceil((300000 - now % 300000) / 1000);
    weather.innerHTML = `${current.icon} ${current.name}<br>入荷まで ${Math.floor(restock / 60)}:${String(restock % 60).padStart(2, "0")}`;
    for (const { ownedSign, vacantSign, firstPlot } of farmSigns) {
      ownedSign.visible = firstPlot < state.plots.length;
      vacantSign.visible = !ownedSign.visible;
    }
    for (const target of plots) repaintCrop(target, state.plots[target.index]);
    rain.visible = current.name === "雨" || current.name === "雷雨";
    scene.background.set(current.name === "雷雨" ? "#7a99b5" : current.name === "流星群" ? "#9299cc" : rain.visible ? "#9ebfd4" : "#85c7f2");
    scene.fog.color.copy(scene.background);
    sun.intensity = current.name === "雷雨" ? 1.25 : 2.15;
  }

  function activate(target) {
    if (!game.canPlay() || !target || !panel.hidden || document.getElementById("dialog").open) return;
    if (target.type === "plot") {
      if (target.index < game.state.plots.length) game.plot(target.index);
    }
    else if (target.type === "sell") showPanel("sell");
    else if (target.type === "study") game.showStudy();
    else {
      game.shop(target.type);
      showPanel("market");
    }
  }

  function range(target) {
    return Math.hypot(avatar.position.x - target.x, avatar.position.z - target.z);
  }

  function warp(key) {
    const target = destinations[key];
    if (!target) return;
    hidePanel();
    document.activeElement?.blur();
    avatar.position.set(target.x, 0, target.z);
    avatar.rotation.y = Math.PI;
    yaw = key === "garden" ? .34 : 0;
    jumpHeight = jumpSpeed = 0;
    keys.clear();
    updateCamera(true);
  }

  function updateCamera(snap) {
    targetPoint.set(avatar.position.x, 1.15 + avatar.position.y, avatar.position.z);
    cameraPoint.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    cameraPoint.multiplyScalar(zoom).add(targetPoint);
    camera.position.lerp(cameraPoint, snap ? 1 : .25);
    camera.lookAt(targetPoint);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }
  resize();
  window.addEventListener("resize", resize);

  const aliases = { arrowup: "w", arrowleft: "a", arrowdown: "s", arrowright: "d", " ": "jump" };
  const movement = ["w", "a", "s", "d", "jump", "shift"];
  let studyShortcutHeld = false;
  window.addEventListener("keydown", event => {
    const key = aliases[event.key.toLowerCase()] ?? event.key.toLowerCase();
    if (key === "e" && event.repeat && studyShortcutHeld) {
      event.preventDefault();
      return;
    }
    if (!game.canPlay()) return;
    const dialog = document.getElementById("dialog");
    if (event.key === "Escape" && !panel.hidden && !dialog.open) hidePanel();
    if (event.key === "Escape" && panel.hidden && !dialog.open) game.cancelTransplant();
    if (dialog.open || !panel.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
    if (movement.includes(key)) {
      if (key === "jump" && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      keys.add(key);
    } else if (!event.repeat && key === "e") {
      event.preventDefault();
      studyShortcutHeld = nearby?.type === "study";
      activate(nearby);
    } else if (slotKeys[Number(key) - 1]) game.select(slotKeys[Number(key) - 1]);
  });
  window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();
    if (key === "e") studyShortcutHeld = false;
    keys.delete(aliases[key] ?? key);
  });
  window.addEventListener("blur", () => {
    studyShortcutHeld = false;
    keys.clear();
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const { travel, seed, world: action } = button.dataset;
    if (travel) warp(travel);
    if (seed) game.select(seed);
    if (action === "market") { warp("seeds"); game.shop("seeds"); showPanel("market"); }
    if (action === "close") hidePanel();
    if (action === "bag") showPanel("bag");
    if (action === "basket") showPanel("basket");
    if (action === "help") game.help();
    if (action === "study") { warp("study"); game.showStudy(); }
    if (button === interact) activate(nearby);
  });

  for (const button of document.querySelectorAll("[data-move]")) {
    const key = button.dataset.move;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      keys.add(key);
    });
    button.addEventListener("lostpointercapture", () => keys.delete(key));
  }
  function rotateCamera(dx, dy) {
    yaw -= dx * .006;
    pitch = THREE.MathUtils.clamp(pitch + dy * .004, .12, 1.14);
  }

  let drag = null;
  canvas.addEventListener("contextmenu", event => event.preventDefault());
  canvas.addEventListener("pointerdown", event => {
    if (drag) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
    document.activeElement?.blur();
  });
  canvas.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    rotateCamera(dx, dy);
  });
  canvas.addEventListener("pointerup", event => {
    if (drag?.id !== event.pointerId) return;
    const tap = drag.moved < 8 && event.button === 0;
    drag = null;
    if (!tap) return;
    pointer.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
    ray.setFromCamera(pointer, camera);
    const target = ray.intersectObjects(picks, false)[0]?.object.userData.target;
    if (target && range(target) < (target.type === "plot" ? 6.1 : 5.9)) activate(target);
  });
  canvas.addEventListener("lostpointercapture", () => { drag = null; });
  canvas.addEventListener("wheel", event => {
    if (!game.canPlay() || !panel.hidden || document.getElementById("dialog").open || event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? canvas.clientHeight : 1;
    if (event.shiftKey) {
      // Some browsers route Shift + vertical scroll through deltaX.
      zoom = THREE.MathUtils.clamp(zoom + (event.deltaY || event.deltaX) * unit * .011, 5, 24);
    } else {
      rotateCamera(event.deltaX * unit, event.deltaY * unit);
    }
  }, { passive: false });

  const candidates = [...plots, ...fixtures];
  function soilHeight(x, z) {
    for (const bed of beds) {
      if (Math.abs(x - bed.x) > 7.85) continue;
      for (const offset of [-4.4, -.05, 4.3]) {
        if (Math.abs(z - bed.z - offset) < 1.8) return .44;
      }
    }
    return 0;
  }
  function passable(x, z) {
    return !colliders.some(item => Math.abs(item.x - x) < item.w + .27 && Math.abs(item.z - z) < item.d + .27);
  }
  const clamp = THREE.MathUtils.clamp;
  let prior = performance.now(), nextHud = 0;
  updateCamera(true);
  renderer.setAnimationLoop(timestamp => {
    const dt = Math.min(.04, (timestamp - prior) / 1000);
    prior = timestamp;
    const playing = game.canPlay() && panel.hidden && !document.getElementById("dialog").open;
    if (!game.canPlay()) keys.clear();
    const now = Date.now();
    const effects = game.state.avatarEffects ?? {};
    const active = name => effects[name]?.ends > now;
    avatar.scale.setScalar(active("size") ? (effects.size.key === "supersizeMushroom" ? 1.6 : .58) : 1);
    avatar.visible = !active("visibility");
    const forward = playing ? Number(keys.has("w")) - Number(keys.has("s")) : 0;
    const strafe = playing ? Number(keys.has("d")) - Number(keys.has("a")) : 0;
    if (forward || strafe) {
      const speed = (keys.has("shift") ? 11 : 7.4) * (active("speed") ? 1.65 : 1) * dt / Math.hypot(forward, strafe);
      const dx = (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) * speed;
      const dz = (-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) * speed;
      const x = clamp(avatar.position.x + dx, -48, 48);
      const z = clamp(avatar.position.z + dz, -43, 37);
      if (passable(x, avatar.position.z)) avatar.position.x = x;
      if (passable(avatar.position.x, z)) avatar.position.z = z;
      avatar.rotation.y = Math.atan2(dx, dz);
      walk += dt * 13;
    }
    if (keys.has("jump") && playing && jumpHeight === 0) {
      jumpSpeed = active("jump") ? 12 : 7.5;
      keys.delete("jump");
    }
    if (jumpHeight > 0 || jumpSpeed > 0) jumpSpeed -= 22 * dt;
    jumpHeight = Math.max(0, jumpHeight + jumpSpeed * dt);
    if (!jumpHeight && jumpSpeed < 0) jumpSpeed = 0;
    avatar.position.y = jumpHeight + soilHeight(avatar.position.x, avatar.position.z);
    for (const limb of player.limbs) {
      const swing = forward || strafe ? Math.sin(walk) * limb.side * .61 : 0;
      limb.leg.rotation.x = swing;
      limb.arm.rotation.x = -swing * .78;
    }
    updateCamera(false);
    if (timestamp >= nextHud) {
      updateHud(now);
      nextHud = timestamp + 200;
    }
    let best = 4.4;
    nearby = null;
    for (const target of candidates) {
      if (target.type === "plot" && target.index >= game.state.plots.length) continue;
      const distance = range(target);
      if (distance < best) {
        best = distance;
        nearby = target;
      }
    }
    interact.hidden = !playing || !nearby;
    if (playing && nearby) {
      const plot = game.state.plots[nearby.index];
      const label = nearby.type === "plot"
        ? (plot ? Garden.crops[plot.key].name + "を調べる" : game.transplanting ? "ここに移す" : "種を植える")
        : nearby.label;
      interact.textContent = "E  " + label;
    }
    if (rain.visible) updateRain(timestamp);
    renderer.render(scene, camera);
  });
}
