const storageKey = "komorebi-garden-v1";
const number = new Intl.NumberFormat("ja-JP");
const format = value => number.format(value);
const byId = id => document.getElementById(id);
const dialog = byId("dialog");
let tab = "seeds";
let dialogPlot = null;
let confirmClear = false;
let toastTimer;
let savedText;

function restore() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (save.version === 1 && save.plots.length === 12 && Number.isFinite(save.time)) {
      savedText = raw;
      return save;
    }
  } catch {
    // Storage may be unavailable in a restricted browser session.
  }
  return null;
}

const started = Date.now();
let state = restore() ?? Garden.create(started);
let selected = Object.keys(state.seeds).find(key => state.seeds[key] > 0);
const readyBefore = state.plots.filter(plot => plot?.fruit).length;
const lastPlayed = state.time;
Garden.advance(state, started);

function save() {
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(storageKey, raw);
    savedText = raw;
  } catch {
    byId("save-label").textContent = "ブラウザへの保存が利用できません";
  }
}

function sync() {
  try {
    if (localStorage.getItem(storageKey) !== savedText) {
      state = restore() ?? state;
      chooseSeed();
    }
  } catch {
    // Continue with this tab's in-memory game.
  }
}

function chooseSeed() {
  if (!state.seeds[selected]) selected = Object.keys(state.seeds).find(key => state.seeds[key] > 0);
}

function clock(ms) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

function notice(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

const markup = new Map();
function fill(id, html) {
  if (markup.get(id) === html) return;
  const container = byId(id);
  const active = container.contains(document.activeElement) ? document.activeElement : null;
  container.innerHTML = html;
  if (active?.dataset.action) {
    const replacement = [...container.querySelectorAll("button")].find(button =>
      button.dataset.action === active.dataset.action && button.dataset.key === active.dataset.key);
    replacement?.focus({ preventScroll: true });
  }
  markup.set(id, html);
}

function tags(fruit) {
  const mods = fruit.mods.map(key => `<span class="tag">${Garden.mutations[key][0]}</span>`);
  if (fruit.variant) mods.unshift(`<span class="tag ${fruit.variant.toLowerCase()}">${fruit.variant === "Gold" ? "ゴールド" : "レインボー"}</span>`);
  return mods.join("");
}

function cropIcon(key) {
  return key === "blueberry" ? '<i class="blueberry-art" aria-hidden="true"></i>' : Garden.crops[key].icon;
}

function renderPlots() {
  const used = state.plots.filter(Boolean).length;
  byId("plot-count").textContent = `${used} / ${state.plots.length} 区画を使用中`;
  document.querySelector('[data-action="harvest-all"]').disabled = !state.plots.some(plot => plot?.fruit && !plot.locked);
  fill("plots", state.plots.map((plot, index) => {
    if (!plot) return `<button class="plot empty" data-action="plot" data-key="${index}" aria-label="区画 ${index + 1} に種を植える">
      <span class="plot-number">${String(index + 1).padStart(2, "0")}</span><span class="plant-plus">+</span><span class="plot-caption">種を植える</span></button>`;
    const crop = Garden.crops[plot.key];
    const ready = Boolean(plot.fruit);
    const percent = Math.floor(100 * plot.progress / Garden.duration(plot));
    const label = ready ? (plot.locked ? "🔒 ロック中" : "収穫できる") : `成長中 · ${percent}%`;
    return `<button class="plot planted ${ready ? "ready" : ""} ${plot.fruit?.variant?.toLowerCase() ?? ""}" data-action="plot" data-key="${index}" aria-label="区画 ${index + 1} ${crop.name} ${label}">
      <span class="plot-number">${String(index + 1).padStart(2, "0")}</span><span class="crop-icon" aria-hidden="true">${ready ? cropIcon(plot.key) : "🌱"}</span>
      <strong>${crop.name}</strong><span class="plot-caption">${label}</span>
      ${ready ? `<span class="plot-tags">${tags(plot.fruit)}</span>` : `<span class="progress"><i style="width:${percent}%"></i></span>`}</button>`;
  }).join(""));
  const seeds = Object.entries(state.seeds).filter(([, count]) => count > 0);
  fill("seeds", seeds.map(([key, count]) => {
    const crop = Garden.crops[key];
    return `<button class="seed-button" data-action="seed" data-key="${key}" aria-pressed="${selected === key}"><span aria-hidden="true">${cropIcon(key)}</span> ${crop.name} <b>×${count}</b></button>`;
  }).join("") || '<p class="muted">種屋で種を買えます。</p>');
}

function renderShop(now) {
  const interval = Garden.restockInterval(tab);
  byId("restock").textContent = clock(interval - (now % interval));
  for (const button of document.querySelectorAll('[data-action="tab"]')) {
    button.setAttribute("aria-pressed", button.dataset.key === tab);
  }
  fill("shop", Garden.stock(tab, now, state).map(({ key, item, left }) => {
    const description = tab === "seeds"
      ? `${item.tier} · ${item.repeat ? "繰り返し収穫" : "一度だけ収穫"}`
      : item.description ?? `孵化まで ${clock(item.seconds * 1000)}`;
    return `<article class="shop-row">
      <span class="item-icon ${left ? "" : "unavailable"}" aria-hidden="true">${tab === "seeds" ? cropIcon(key) : item.icon}</span>
      <div class="shop-info"><strong>${item.name}</strong><small>${description}</small><small class="${left ? "in-stock" : ""}">${left ? `在庫 ${left}` : "在庫なし"}</small></div>
      <button class="buy" data-action="buy" data-key="${key}" aria-label="${item.name}を ${format(item.cost)} シェックルで購入" ${left && state.money >= item.cost ? "" : "disabled"}><span class="mini-coin" aria-hidden="true">S</span> ${format(item.cost)}</button>
    </article>`;
  }).join(""));
}

function renderEffects(now) {
  const lines = [];
  if (state.boost) lines.push(`<span class="effect">💦 ${Garden.gear[state.boost.key].name} · ${clock(state.boost.ends - now)}</span>`);
  if (state.rod) lines.push(`<span class="effect">⚡ 避雷針 · 残り${state.rod}回</span>`);
  for (const [key, count] of Object.entries(state.gear)) {
    if (count <= 0) continue;
    const gear = Garden.gear[key];
    const usable = ["sprinkler", "master", "rod"].includes(key);
    lines.push(usable
      ? `<button class="seed-button" data-action="gear" data-key="${key}">${gear.icon} ${gear.name} ×${count} を使う</button>`
      : `<span class="effect" title="作物の鑑定画面で使用">${gear.icon} ${gear.name} ×${count}</span>`);
  }
  for (const egg of state.incubating) {
    const offer = Garden.eggs[egg.key];
    lines.push(egg.ends <= now
      ? `<button class="seed-button" data-action="hatch" data-key="${egg.id}">${offer.icon} ${offer.name}を孵す</button>`
      : `<span class="effect">${offer.icon} ${offer.name} · ${clock(egg.ends - now)}</span>`);
  }
  for (const key of new Set(state.pets)) {
    const pet = Garden.pets[key];
    lines.push(`<button class="seed-button" data-action="pet" data-key="${key}" aria-pressed="${state.activePet === key}" title="${pet.description}">${pet.icon} ${pet.name}${state.activePet === key ? " · 活動中" : ""}</button>`);
  }
  byId("effects").hidden = lines.length === 0;
  fill("effects", lines.join(""));
}

function renderBasket() {
  const total = state.basket.reduce((sum, fruit) => sum + Garden.value(fruit), 0);
  byId("basket-count").textContent = `${state.basket.length}個 · 売値 ${format(total)} S`;
  byId("sell").disabled = !total;
  fill("basket-items", state.basket.map(fruit => {
    const crop = Garden.crops[fruit.key];
    return `<div class="basket-item"><span aria-hidden="true">${cropIcon(fruit.key)}</span><div><strong>${crop.name}</strong><small>${fruit.weight.toFixed(2)} kg ${tags(fruit)}</small></div><b>${format(Garden.value(fruit))} S</b></div>`;
  }).join("") || '<p class="basket-empty">収穫した作物がここに入ります。</p>');
}

function render(now) {
  byId("balance").textContent = format(state.money);
  const sky = Garden.weather(now);
  fill("weather", `<span class="weather-icon" aria-hidden="true">${sky.icon}</span><div><strong>${sky.name}</strong><small>${sky.detail}</small><small>次の天気まで ${clock(Garden.weatherInterval - (now % Garden.weatherInterval))}</small></div>`);
  renderPlots();
  renderShop(now);
  renderBasket();
  renderEffects(now);
  if (dialogPlot !== null && dialog.open) renderInspection(dialogPlot);
}

function displayDialog(html) {
  fill("dialog", `<button class="close-button" data-action="close" aria-label="閉じる">×</button>${html}`);
  if (!dialog.open) dialog.showModal();
}

function renderInspection(index) {
  const plot = state.plots[index];
  if (!plot) {
    dialog.close();
    return;
  }
  const crop = Garden.crops[plot.key];
  const fruit = plot.fruit;
  if (confirmClear && !plot.locked) {
    displayDialog(`<h2 id="dialog-title">区画を空ける</h2><p>${crop.name}の株を取り除きます。株と実は回収できません。</p>
      <div class="dialog-actions"><button class="soft-button" data-action="cancel-clear">戻る</button>
      <button class="primary-button" data-action="clear-plot" data-key="${index}">株を取り除く</button></div>`);
    return;
  }
  displayDialog(`<div class="dialog-icon" aria-hidden="true">${fruit ? cropIcon(plot.key) : "🌱"}</div><h2 id="dialog-title">${crop.name}</h2>
    <p>${crop.repeat ? "収穫しても株が残り、また実がなります。" : "収穫すると区画が空きます。"}</p>
    ${fruit ? `<div class="inspection"><span>重さ <b>${fruit.weight.toFixed(2)} kg</b></span><span>売値 <b>${format(Garden.value(fruit))} S</b></span></div>
    <div class="dialog-tags">${tags(fruit) || '<span class="muted">変異なし</span>'}</div>` : `<p>成長中 · ${Math.floor(100 * plot.progress / Garden.duration(plot))}%</p>`}
    <div class="dialog-actions">
      ${fruit ? `<button class="primary-button" data-action="harvest" data-key="${index}" ${plot.locked ? "disabled" : ""}>収穫する</button>` : ""}
      ${plot.locked || state.gear.lock ? `<button class="soft-button" data-action="lock" data-key="${index}">${plot.locked ? "ロックを解除" : "🔒 ロックする"}</button>` : ""}
      ${fruit && state.gear.spray ? `<button class="soft-button" data-action="spray" data-key="${index}">🧪 スプレーを使う</button>` : ""}
      ${!plot.locked ? '<button class="soft-button" data-action="confirm-clear">区画を空ける</button>' : ""}
    </div>`);
}

function help() {
  dialogPlot = null;
  displayDialog(`<div class="dialog-icon" aria-hidden="true">🌱</div><h2 id="dialog-title">遊び方</h2>
    <ol class="help-list"><li>WASDまたは矢印で移動し、ドラッグで視点を回します。スペースでジャンプします。</li>
    <li>下の持ち物から種を装備し、近くの土をクリックするか E を押します。作物を調べると、売値と変異を確認できます。</li>
    <li>SEEDS・GARDEN・SELL でワープできます。売店の店員に近づいて E で取引します。</li></ol>
    <p>農園はブラウザに保存され、閉じている間も作物が育ちます。種屋と道具屋は5分、卵屋は30分ごとに入荷します。</p>`);
}

dialog.setAttribute("aria-labelledby", "dialog-title");
dialog.addEventListener("close", () => {
  dialogPlot = null;
  confirmClear = false;
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const { action, key } = button.dataset;
  const now = Date.now();
  sync();
  Garden.advance(state, now);
  let changed = false;

  switch (action) {
    case "help": help(); break;
    case "close": dialog.close(); break;
    case "tab": tab = key; break;
    case "seed": selected = key; break;
    case "plot":
      if (state.plots[key]) {
        dialogPlot = Number(key);
        renderInspection(dialogPlot);
      } else {
        changed = Garden.plant(state, key, selected);
        notice(changed ? `${Garden.crops[selected].name}の種を植えました` : "種屋で種を用意しましょう");
        chooseSeed();
      }
      break;
    case "buy":
      changed = Garden.buy(state, tab, key, now);
      if (changed && tab === "seeds") selected = key;
      notice(changed ? (tab === "eggs" ? "卵を孵化器に入れました" : "購入しました") : "在庫と残高を確認してください");
      break;
    case "harvest":
      changed = Garden.harvest(state, key);
      if (changed) {
        dialog.close();
        notice("収穫かごに入れました");
      }
      break;
    case "harvest-all": {
      let count = 0;
      state.plots.forEach((_, index) => { if (Garden.harvest(state, index)) count++; });
      changed = count > 0;
      if (changed) notice(`${count}個を収穫かごに入れました`);
      break;
    }
    case "confirm-clear": confirmClear = true; break;
    case "cancel-clear": confirmClear = false; break;
    case "clear-plot":
      if (state.plots[key] && !state.plots[key].locked) {
        state.plots[key] = null;
        dialog.close();
        notice("区画を空けました");
        changed = true;
      }
      break;
    case "sell": {
      const amount = Garden.sell(state);
      changed = amount > 0;
      if (changed) notice(`${format(amount)} シェックルで売却しました`);
      break;
    }
    case "gear":
      changed = Garden.useGear(state, key, now);
      notice(changed ? `${Garden.gear[key].name}を設置しました` : "スプリンクラーは1台ずつ使えます");
      break;
    case "lock":
      if (state.plots[key]?.locked) {
        state.plots[key].locked = false;
        state.gear.lock = (state.gear.lock ?? 0) + 1;
        changed = true;
      } else {
        changed = Garden.useGear(state, "lock", now, state.plots[key]);
      }
      break;
    case "spray":
      changed = Garden.useGear(state, "spray", now, state.plots[key]);
      notice(changed ? "変異スプレーを使いました" : "付与できる変異がありません");
      break;
    case "hatch": {
      const pet = Garden.hatch(state, Number(key), now);
      changed = Boolean(pet);
      if (changed) notice(`${Garden.pets[pet].name}が生まれました`);
      break;
    }
    case "pet":
      if (state.pets.includes(key)) {
        state.activePet = state.activePet === key ? null : key;
        changed = true;
      }
      break;
  }
  if (changed) save();
  render(now);
});

if (savedText === undefined) save();
render(started);
const newReady = state.plots.filter(plot => plot?.fruit).length - readyBefore;
if (started - lastPlayed > 10_000 && newReady > 0) notice(`おかえりなさい。留守の間に${newReady}区画の作物が育ちました`);

function tick() {
  const now = Date.now();
  Garden.advance(state, now);
  render(now);
}

setInterval(tick, 500);
window.addEventListener("storage", event => {
  if (event.key !== storageKey) return;
  sync();
  tick();
});

window.gardenWorld = {
  get state() { return state; },
  get selected() { return selected; },
  select(key) {
    if (state.seeds[key] > 0) {
      selected = key;
      render(Date.now());
    }
  },
  plot(index) {
    document.querySelector(`[data-action="plot"][data-key="${index}"]`)?.click();
  },
  shop(kind) {
    document.querySelector(`[data-action="tab"][data-key="${kind}"]`)?.click();
  },
  help,
};
