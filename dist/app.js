import * as Study from "./study.mjs";

const storageKey = "komorebi-garden-v1";
const number = new Intl.NumberFormat("ja-JP");
const format = value => number.format(value);
const byId = id => document.getElementById(id);
const dialog = byId("dialog");
const panel = byId("interface");
const playRewardSeconds = Study.playReward / 1000;
const maxPlayMinutes = Study.maxPlayTime / 60_000;
byId("play-lock-tip").textContent = `社会の問題に1問正解すると、あと${playRewardSeconds}秒遊べます。`;
let tab = "seeds";
let dialogPlot = null;
let confirmClear = false;
let problem;
let transplantSource = null;
let toastTimer;
let savedText;

function restore() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (save.version === 1 && Array.isArray(save.plots) && Garden.validPlotCount(save.plots.length) && Number.isFinite(save.time)) {
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
let lastClock = performance.now();
let countingPlay = shouldCountPlayTime();

function canPlay() {
  return Study.playRemaining(state) > 0;
}

function studying() {
  return dialog.open && dialog.querySelector(".study-heading") !== null;
}

function shouldCountPlayTime() {
  return !document.hidden && !studying() && (panel.hidden || panel.dataset.view === "fallback");
}

function renderPlayTime() {
  const remaining = Study.playRemaining(state);
  const label = byId("play-time");
  const value = `⏳ 残り ${clock(remaining)}`;
  if (label.textContent !== value) label.textContent = value;
  const lock = byId("play-lock");
  if (lock.hidden === (remaining > 0)) return;
  lock.hidden = remaining > 0;
  byId("gameplay").inert = !lock.hidden;
  if (!lock.hidden) {
    panel.hidden = true;
    if (dialog.open && !studying()) dialog.close();
    if (!dialog.open) lock.querySelector("button").focus();
  }
}

function accountPlayTime(resume = shouldCountPlayTime()) {
  sync();
  const now = performance.now();
  if (countingPlay && canPlay()) {
    Study.spendPlayTime(state, Math.max(0, Math.round(now - lastClock)));
    save();
  }
  lastClock = now;
  countingPlay = resume && canPlay();
  renderPlayTime();
}

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
  const buyingLand = tab === "land";
  byId("restock-panel").hidden = buyingLand;
  for (const button of document.querySelectorAll('[data-action="tab"]')) {
    button.setAttribute("aria-pressed", button.dataset.key === tab);
  }
  if (buyingLand) {
    const offer = Garden.nextLand(state);
    byId("market-title").textContent = "土地";
    byId("shop-summary").textContent = `${state.plots.length} 区画を所有中`;
    fill("shop", offer ? `<article class="shop-row">
      <span class="item-icon" aria-hidden="true">🚜</span>
      <div class="shop-info"><strong>追加の畑 ${offer.index + 1}</strong><small>すぐに ${Garden.plotsPerFarm} 区画増えます</small></div>
      <button class="buy" data-action="buy-land" data-key="${offer.index}" aria-label="土地を ${format(offer.cost)} シェックルで購入" ${state.money < offer.cost ? "disabled" : ""}><span class="mini-coin" aria-hidden="true">◈</span> ${format(offer.cost)}</button>
    </article>` : '<p class="muted">すべての土地を購入済みです。</p>');
    return;
  }
  const interval = Garden.restockInterval(tab);
  byId("restock").textContent = clock(interval - (now % interval));
  const offers = Garden.stock(tab, now, state);
  byId("market-title").textContent = { seeds: "種屋", gear: "道具屋", eggs: "卵屋" }[tab];
  byId("shop-summary").textContent = `全 ${offers.length} 種類 · 入荷中 ${offers.filter(offer => offer.left).length} 種類`;
  fill("shop", offers.map(({ key, item, left }) => {
    const description = tab === "seeds"
      ? `${item.tier} · ${item.repeat ? "繰り返し収穫" : "一度だけ収穫"}`
      : item.description ?? `孵化まで ${clock(item.seconds * 1000)}`;
    return `<article class="shop-row">
      <span class="item-icon ${left ? "" : "unavailable"}" aria-hidden="true">${tab === "seeds" ? cropIcon(key) : item.icon}</span>
      <div class="shop-info"><strong>${item.name}</strong><small>${description}</small><small class="${left ? "in-stock" : ""}">${item.status ?? (left ? `在庫 ${left}` : "在庫なし")}</small></div>
      ${item.cost === null ? "" : `<button class="buy" data-action="buy" data-key="${key}" aria-label="${item.name}を ${format(item.cost)} シェックルで購入" ${left && state.money >= item.cost ? "" : "disabled"}><span class="mini-coin" aria-hidden="true">◈</span> ${format(item.cost)}</button>`}
    </article>`;
  }).join(""));
}

function renderEffects(now) {
  const lines = [];
  if (state.boost) lines.push(`<span class="effect">💦 ${Garden.gear[state.boost.key].name} · ${clock(state.boost.ends - now)}</span>`);
  for (const effect of Object.values(state.avatarEffects ?? {})) {
    if (effect.ends > now) lines.push(`<span class="effect">🍄 ${Garden.gear[effect.key].name} · ${clock(effect.ends - now)}</span>`);
  }
  if (state.rod) lines.push(`<span class="effect">⚡ 避雷針 · 残り${state.rod}回</span>`);
  for (const [key, count] of Object.entries(state.gear)) {
    if (count <= 0) continue;
    const gear = Garden.gear[key];
    const usable = gear.speed || gear.avatarEffect || key === "rod";
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
  if (state.pets.length) {
    lines.push(`<p class="pet-note">活動中のペットは${Garden.petInterval / 1000}秒ごとに、畑の実をランダムに1つ選びます。売値の倍率は、効果が単独で付いた場合です。</p>`);
  }
  for (const key of new Set(state.pets)) {
    const pet = Garden.pets[key];
    const effects = pet.effects.map(Garden.petEffectLabel).join("、");
    lines.push(`<button class="seed-button pet-button" data-action="pet" data-key="${key}" aria-pressed="${state.activePet === key}">
      <strong>${pet.icon} ${pet.name}${state.activePet === key ? " · 活動中" : ""}</strong>
      <span>${effects}${pet.effects.length > 1 ? "からランダムに1つ" : "を付ける"}</span>
    </button>`);
  }
  byId("effects").hidden = lines.length === 0;
  fill("effects", lines.join(""));
}

function renderBasket() {
  const total = state.basket.reduce((sum, fruit) => sum + Garden.value(fruit), 0);
  byId("basket-count").textContent = `${state.basket.length}個 · 売値 ${format(total)} シェックル`;
  byId("sell").disabled = !total;
  fill("basket-items", state.basket.map(fruit => {
    const crop = Garden.crops[fruit.key];
    return `<div class="basket-item"><span aria-hidden="true">${cropIcon(fruit.key)}</span><div><strong>${crop.name}</strong><small>${fruit.weight.toFixed(2)} キロ ${tags(fruit)}</small></div><b>${format(Garden.value(fruit))} シェックル</b></div>`;
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
    ${fruit ? `<div class="inspection"><span>重さ <b>${fruit.weight.toFixed(2)} キロ</b></span><span>売値 <b>${format(Garden.value(fruit))} シェックル</b></span></div>
    <div class="dialog-tags">${tags(fruit) || '<span class="muted">変異なし</span>'}</div>` : `<p>成長中 · ${Math.floor(100 * plot.progress / Garden.duration(plot))}%</p>`}
    <div class="dialog-actions">
      ${fruit ? `<button class="primary-button" data-action="harvest" data-key="${index}" ${plot.locked ? "disabled" : ""}>収穫する</button>` : ""}
      ${plot.locked || state.gear.lock ? `<button class="soft-button" data-action="lock" data-key="${index}">${plot.locked ? "ロックを解除" : "🔒 ロックする"}</button>` : ""}
      ${fruit && state.gear.spray ? `<button class="soft-button" data-action="spray" data-key="${index}">🧪 スプレーを使う</button>` : ""}
      ${!plot.locked && state.gear.trowel ? `<button class="soft-button" data-action="transplant" data-key="${index}">作物を移す</button>` : ""}
      ${!plot.locked ? '<button class="soft-button" data-action="confirm-clear">区画を空ける</button>' : ""}
    </div>`);
}

function help() {
  dialogPlot = null;
  displayDialog(`<div class="dialog-icon" aria-hidden="true">🌱</div><h2 id="dialog-title">遊び方</h2>
    <ol class="help-list"><li>WASDまたは矢印で移動します。タッチパッドを2本指で上下左右になぞるか、画面をドラッグすると視点が回ります。Shiftを押しながらスクロールするとズームします。スペースでジャンプします。</li>
    <li>下の持ち物から種を装備し、近くの土をクリックするか E を押します。作物を調べると、売値と変異を確認できます。</li>
    <li>「種屋」「わたしの畑」「売却所」でワープできます。売店の店員に近づいて E で取引します。</li>
    <li>「社会教室」で正解すると、シェックルがもらえ、農園で遊べる時間が${playRewardSeconds}秒増えます。貯められる時間は最大${maxPlayMinutes}分です。問題を解いている間は持ち時間が減りません。</li></ol>
    <p>農園はブラウザに保存され、閉じている間も作物が育ちます。種屋と道具屋は5分、卵屋は30分ごとに入荷します。</p>`);
}

function escapeText(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function renderStudyVisual({ chart, diagram }) {
  if (chart) {
    const rows = chart.rows.map(([label, value]) => `
      <li class="study-chart-row">
        <span>${escapeText(label)}</span>
        <span class="study-chart-track" aria-hidden="true"><span style="width:${100 * value / chart.max}%"></span></span>
        <strong>${escapeText(String(value) + chart.unit)}</strong>
      </li>`).join("");
    return `<figure class="study-visual">
      <figcaption>${escapeText(chart.title)}</figcaption>
      <ul class="study-chart">${rows}</ul>
    </figure>`;
  }
  if (diagram) {
    const paths = diagram.paths ?? [diagram.steps];
    return `<figure class="study-visual">
      <figcaption>${escapeText(diagram.title)}</figcaption>
      ${paths.map(steps => `<ol class="study-flow">${steps.map(step => `<li>${escapeText(step)}</li>`).join("")}</ol>`).join("")}
    </figure>`;
  }
  return "";
}

function renderStudy() {
  const { correct, earned } = state.social ?? { correct: 0, earned: 0 };
  const remaining = Study.playRemaining(state);
  displayDialog(`<div class="study-heading"><span aria-hidden="true">📚</span><h2 id="dialog-title">社会教室</h2></div>
    <div class="study-problem"><small>${problem.index + 1} / ${Study.totalQuestions} 問</small>
      <p id="study-prompt" tabindex="-1">${escapeText(problem.prompt)}</p>
      ${renderStudyVisual(problem)}
      ${problem.detail ? `<p class="study-material">${escapeText(problem.detail)}</p>` : ""}</div>
    ${problem.outcome
      ? `<div class="study-result" role="status"><strong>${problem.outcome === "correct" ? "正解" : "時間切れ。答えは"}　${escapeText(problem.answer)}</strong>${problem.explanation ? `<p>${escapeText(problem.explanation)}</p>` : ""}
          ${problem.outcome === "correct" ? `<p class="study-reward">${Study.sheckleReward} シェックル獲得。${remaining === Study.maxPlayTime ? `遊べる時間は上限の${maxPlayMinutes}分です。` : `遊べる時間が${playRewardSeconds}秒増えました。`}</p>` : ""}</div>
        <div class="dialog-actions"><button class="primary-button" data-action="study-next">次の問題</button><button class="soft-button" data-action="close">農園に戻る</button></div>`
      : `<p id="study-countdown" aria-live="off">答えの表示まで ${Math.ceil(Study.answerDelay / 1000)}秒</p><form id="study-form" novalidate><label class="study-answer">答えを入力<input id="study-answer" name="answer" type="text" autocomplete="off" autocapitalize="off" maxlength="400" aria-describedby="study-prompt study-feedback"></label><button class="primary-button">答え合わせ</button></form>
         <p id="study-feedback" class="study-feedback" role="status"></p>`}
    <div class="study-record"><span>正解 <b>${format(correct)}問</b></span><span>獲得 <b>${format(earned)} シェックル</b></span><span>遊べる時間 <b>${clock(remaining)}</b> / ${maxPlayMinutes}分</span></div>`);
  updateStudyCountdown();
  const focus = problem.outcome ? '[data-action="study-next"]' : "#study-answer";
  dialog.querySelector(focus)?.focus();
}

function updateStudyCountdown() {
  const countdown = byId("study-countdown");
  if (!countdown) return;
  const seconds = Math.max(0, Math.ceil((problem.deadline - performance.now()) / 1000));
  const text = `答えの表示まで ${seconds}秒`;
  if (countdown.textContent !== text) countdown.textContent = text;
}

function updateStudyTimer() {
  if (!studying() || !problem) return;
  if (problem.sequence + Number(Boolean(problem.outcome)) !== Study.progress(state)) {
    problem = Study.question(state);
    renderStudy();
  } else if (Study.reveal(state, problem)) {
    save();
    renderStudy();
  } else {
    updateStudyCountdown();
  }
}

function showStudy() {
  accountPlayTime(false);
  dialogPlot = null;
  if (!problem || problem.sequence + Number(Boolean(problem.outcome)) !== Study.progress(state)) {
    problem = Study.question(state);
  }
  if (Study.reveal(state, problem)) save();
  renderStudy();
}

document.addEventListener("submit", event => {
  if (event.target.id !== "study-form") return;
  event.preventDefault();
  accountPlayTime(false);
  const now = Date.now();
  Garden.advance(state, now);
  const input = byId("study-answer");
  const result = Study.check(state, problem, input.value);
  if (result.status === "correct") {
    save();
    renderPlayTime();
    render(now);
    renderStudy();
  } else if (result.status === "revealed") {
    save();
    renderStudy();
  } else if (result.status === "stale") {
    problem = Study.question(state);
    renderStudy();
  } else {
    byId("study-feedback").textContent = result.status === "empty" ? "答えを入力してね。" : `もう一度考えてみよう。ヒント　${result.hint}`;
    input.focus();
    input.select();
  }
});

dialog.setAttribute("aria-labelledby", "dialog-title");
dialog.addEventListener("close", () => {
  dialogPlot = null;
  confirmClear = false;
  accountPlayTime();
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const { action, key } = button.dataset;
  const now = Date.now();
  accountPlayTime();
  if (!canPlay() && !["open-study", "study-next", "close"].includes(action)) return;
  Garden.advance(state, now);
  let changed = false;

  switch (action) {
    case "open-study": showStudy(); return;
    case "help": help(); break;
    case "study-next":
      if (!problem?.outcome) break;
      problem = Study.question(state);
      renderStudy();
      return;
    case "close": dialog.close(); break;
    case "tab": tab = key; break;
    case "seed": selected = key; break;
    case "plot":
      if (transplantSource !== null && !state.plots[key]) {
        changed = Garden.transplant(state, transplantSource, key);
        transplantSource = null;
        notice(changed ? "作物を移しました" : "作物を移せませんでした");
        break;
      }
      if (state.plots[key]) {
        dialogPlot = Number(key);
        renderInspection(dialogPlot);
      } else {
        changed = Garden.plant(state, key, selected);
        notice(changed ? `${Garden.crops[selected].name}の種を植えました` : "種屋で種を用意しましょう");
        chooseSeed();
      }
      break;
    case "buy-land":
      changed = Garden.buyLand(state, Number(key));
      notice(changed ? `畑が ${state.plots.length} 区画になりました` : "残高と土地の購入状況を確認してください");
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
    case "transplant":
      transplantSource = Number(key);
      dialog.close();
      notice("移したい空き区画を選んでください");
      break;
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
      notice(changed ? `${Garden.gear[key].name}を使いました` : "先に使った道具の効果が続いています");
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

const initialRemaining = Study.playRemaining(state);
if (savedText === undefined || state.playMs !== initialRemaining) {
  state.playMs = initialRemaining;
  save();
}
render(started);
renderPlayTime();
const newReady = state.plots.filter(plot => plot?.fruit).length - readyBefore;
if (started - lastPlayed > 10_000 && newReady > 0) notice(`おかえりなさい。留守の間に${newReady}区画の作物が育ちました`);

function tick() {
  const now = Date.now();
  Garden.advance(state, now);
  accountPlayTime();
  render(now);
}

setInterval(tick, 500);
setInterval(updateStudyTimer, 200);
document.addEventListener("visibilitychange", () => {
  accountPlayTime();
  updateStudyTimer();
});
window.addEventListener("pagehide", () => accountPlayTime(false));
window.addEventListener("storage", event => {
  if (event.key !== storageKey) return;
  sync();
  renderPlayTime();
  updateStudyTimer();
});

window.gardenWorld = {
  get state() { return state; },
  canPlay,
  accountPlayTime,
  get selected() { return selected; },
  get transplanting() { return transplantSource !== null; },
  cancelTransplant() { transplantSource = null; },
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
  showStudy,
};
