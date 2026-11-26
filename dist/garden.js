const Garden = ((catalog) => {
  const minute = 60_000;
  const weatherInterval = 3 * minute;
  const plotsPerFarm = 12;
  const landPrices = Object.freeze([100_000, 250_000, 500_000]);

  function validPlotCount(count) {
    return Number.isInteger(count) && count >= plotsPerFarm &&
      count <= plotsPerFarm * (1 + landPrices.length) && count % plotsPerFarm === 0;
  }

  function nextLand(state) {
    const index = state.plots.length / plotsPerFarm - 1;
    const cost = landPrices[index];
    return cost === undefined ? null : { index, cost };
  }

  function buyLand(state, index) {
    const offer = nextLand(state);
    if (!offer || offer.index !== index || state.money < offer.cost) return false;
    state.money -= offer.cost;
    state.plots.push(...Array(plotsPerFarm).fill(null));
    return true;
  }

  function ownsPlot(state, index) {
    return Number.isInteger(Number(index)) && Object.hasOwn(state.plots, index);
  }
  const originalCrops = {
    carrot: { name: "ニンジン", icon: "🥕", tier: "コモン", cost: 10, base: 22, weight: 0.28, seconds: 18, stock: 12, chance: 1 },
    strawberry: { name: "イチゴ", icon: "🍓", tier: "コモン", cost: 50, base: 36, weight: 0.14, seconds: 42, repeat: 30, stock: 6, chance: 1 },
    blueberry: { name: "ブルーベリー", icon: "🫐", tier: "アンコモン", cost: 110, base: 80, weight: 0.3, seconds: 65, repeat: 48, stock: 4, chance: 0.85 },
    tomato: { name: "トマト", icon: "🍅", tier: "アンコモン", cost: 220, base: 150, weight: 0.42, seconds: 95, repeat: 60, stock: 4, chance: 0.65 },
    watermelon: { name: "スイカ", icon: "🍉", tier: "レア", cost: 600, base: 950, weight: 4, seconds: 140, stock: 3, chance: 0.4 },
    grape: { name: "ブドウ", icon: "🍇", tier: "レジェンダリー", cost: 1_600, base: 950, weight: 0.6, seconds: 185, repeat: 105, stock: 2, chance: 0.22 },
    mango: { name: "マンゴー", icon: "🥭", tier: "ミシカル", cost: 8_000, base: 4_500, weight: 0.72, seconds: 300, repeat: 160, stock: 1, chance: 0.01 },
    sunflower: { name: "ひまわり", icon: "🌻", tier: "プリズマティック", cost: 35_000, base: 50_000, weight: 1.8, seconds: 430, stock: 1, chance: 0.0025 },
  };
  const crops = { ...catalog.seeds, watermelon: originalCrops.watermelon };
  for (const [key, item] of Object.entries(originalCrops)) {
    crops[key].weight = item.weight;
  }
  const gear = {
    ...catalog.gear,
    rod: { name: "避雷針", icon: "⚡", cost: 340, stock: 3, chance: 1, description: "雷雨で実った作物を感電させる。3回まで" },
    spray: { name: "変異スプレー", icon: "🧪", cost: 550, stock: 2, chance: 0.5, description: "鑑定画面で作物1つにランダムな変異を付与" },
    lock: { name: "お気に入りロック", icon: "🔒", cost: 120, stock: 3, chance: 1, description: "鑑定画面から作物を収穫ロック" },
  };
  const eggs = {
    meadow: { name: "草原の卵", icon: "🥚", cost: 380, stock: 3, chance: 1, seconds: 100, pets: ["bee","bear"] },
    forest: { name: "森の卵", icon: "🐣", cost: 1800, stock: 2, chance: 0.45, seconds: 210, pets: ["dragonfly","tanuki"] },
  };
  const mutations = {
    Wet: ["濡れ", 2], Chilled: ["冷却", 2], Frozen: ["凍結", 10],
    Shocked: ["感電", 100], Celestial: ["天体", 120], Pollinated: ["受粉", 3],
  };
  const goldMultiplier = 20;
  const petInterval = 90_000;
  const pets = {
    bee: { name: "ミツバチ", icon: "🐝", effects: ["Pollinated"] },
    bear: { name: "シロクマ", icon: "🐻‍❄️", effects: ["Chilled"] },
    dragonfly: { name: "トンボ", icon: "🦋", effects: ["Gold"] },
    tanuki: { name: "タヌキ", icon: "🦝", effects: ["Wet", "Chilled", "Pollinated", "Shocked"] },
  };
  function petEffectLabel(effect) {
    const [name, multiplier] = effect === "Gold" ? ["ゴールド", goldMultiplier] : mutations[effect];
    return `${name}（売値×${multiplier}）`;
  }

  const skies = {
    sun: { name: "晴れ", icon: "☀️", detail: "穏やかな天気", speed: 1 },
    rain: { name: "雨", icon: "🌧️", detail: "成長速度2倍・濡れ", speed: 2, mutation: "Wet", chance: 0.70 },
    snow: { name: "霜", icon: "❄️", detail: "作物に冷却が付くことがある", speed: 1, mutation: "Chilled", chance: 0.65 },
    storm: { name: "雷雨", icon: "⛈️", detail: "落雷で感電のチャンス", speed: 2, mutation: "Shocked", chance: 0.12 },
    meteor: { name: "流星群", icon: "🌠", detail: "星が当たると天体変異", speed: 1, mutation: "Celestial", chance: 0.15 },
  };
  const catalogs = { seeds: catalog.seeds, gear: catalog.gear, eggs };

  function random(key) {
    let hash = 2166136261;
    for (const character of String(key)) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
  }

  function restockInterval(tab) {
    return (tab === "eggs" ? 30 : 5) * minute;
  }

  function stock(tab, now, state) {
    const cycle = Math.floor(now / restockInterval(tab));
    const purchased = state.purchases[tab];
    return Object.entries(catalogs[tab]).map(([key, item]) => {
      const roll = random(`stock/${tab}/${key}/${cycle}`);
      const min = item.minStock ?? item.stock;
      const quantity = min + Math.floor(random(`amount/${tab}/${key}/${cycle}`) * (item.stock - min + 1));
      const total = !item.status && roll < item.chance ? quantity : 0;
      const used = purchased?.cycle === cycle ? (purchased.items[key] ?? 0) : 0;
      return { key, item, left: Math.max(0, total - used) };
    });
  }

  function buy(state, tab, key, now) {
    const offer = stock(tab, now, state).find(row => row.key === key);
    if (!offer?.left || state.money < offer.item.cost) return false;
    const cycle = Math.floor(now / restockInterval(tab));
    if (state.purchases[tab]?.cycle !== cycle) state.purchases[tab] = { cycle, items: {} };
    const items = state.purchases[tab].items;
    items[key] = (items[key] ?? 0) + 1;
    state.money -= offer.item.cost;
    if (tab === "eggs") {
      const id = state.serial++;
      state.incubating.push({ id, key, ends: now + offer.item.seconds * 1_000 });
    } else {
      state[tab][key] = (state[tab][key] ?? 0) + 1;
    }
    return true;
  }

  function weather(now) {
    const roll = random(`weather/${Math.floor(now / weatherInterval)}`);
    if (roll < 0.48) return skies.sun;
    if (roll < 0.73) return skies.rain;
    if (roll < 0.88) return skies.snow;
    if (roll < 0.97) return skies.storm;
    return skies.meteor;
  }

  function plant(state, index, key) {
    if (!ownsPlot(state, index) || !Object.hasOwn(crops, key) || !state.seeds[key] || state.plots[index]) return false;
    state.seeds[key]--;
    state.plots[index] = {
      key, id: state.serial++, generation: 0, progress: 0,
      fruit: null, locked: false, lastWeather: -1,
    };
    return true;
  }

  function create(now) {
    const state = {
      version: 1, time: now, salt: Math.random().toString(36).slice(2), serial: 1, money: 150,
      seeds: { carrot: 3, strawberry: 1 }, gear: {}, purchases: {}, basket: [],
      plots: Array(plotsPerFarm).fill(null), boost: null, rod: 0, incubating: [], pets: [], activePet: null,
    };
    return state;
  }

  function mutate(fruit, kind) {
    if (kind === "Gold") {
      if (fruit.variant === "Rainbow") return false;
      const changed = fruit.variant !== "Gold";
      fruit.variant = "Gold";
      return changed;
    }
    if (fruit.mods.includes(kind)) return false;
    const coldOrWet = ["Wet", "Chilled"].includes(kind);
    if (coldOrWet && fruit.mods.includes("Frozen")) return false;
    if (coldOrWet && fruit.mods.includes(kind === "Wet" ? "Chilled" : "Wet")) {
      fruit.mods = fruit.mods.filter(mod => !["Wet", "Chilled"].includes(mod));
      fruit.mods.push("Frozen");
    } else {
      fruit.mods.push(kind);
    }
    return true;
  }

  function makeFruit(state, plot, boost) {
    const crop = crops[plot.key];
    const seed = `${state.salt}/${plot.id}/${plot.generation}`;
    const boosted = boost === "sprinkler" || boost?.endsWith("Sprinkler") || boost === "master";
    const strong = boost === "master" || boost === "superSprinkler";
    const boostWeight = strong ? 1.55 : boosted ? 1.2 : 1;
    const boostChance = strong ? 3 : boosted ? 1.6 : 1;
    const giant = random(seed + "/giant") < 0.025 * boostChance ? 2.75 : 1;
    const weight = Math.max(0.01, Math.round(crop.weight * (0.75 + random(seed + "/weight") * 0.6) * boostWeight * giant * 100) / 100);
    const roll = random(seed + "/variant");
    const variant = roll < 0.001 * boostChance ? "Rainbow" : roll < 0.011 * boostChance ? "Gold" : null;
    return { key: plot.key, weight, variant, mods: [] };
  }

  function value(fruit) {
    const crop = crops[fruit.key];
    const variant = fruit.variant === "Rainbow" ? 50 : fruit.variant === "Gold" ? goldMultiplier : 1;
    const environment = fruit.mods.reduce((sum, key) => sum + mutations[key][1] - 1, 1);
    return Math.max(1, Math.round(crop.base * (fruit.weight / crop.weight) ** 2 * variant * environment));
  }

  function duration(plot) {
    const crop = crops[plot.key];
    return (plot.generation ? crop.repeat : crop.seconds) * 1000;
  }

  function advancePlot(state, plot, elapsed, speed, sky, cycle, boost) {
    if (!plot.fruit) {
      plot.progress = Math.min(duration(plot), plot.progress + elapsed * speed);
      if (plot.progress < duration(plot)) return;
      plot.fruit = makeFruit(state, plot, boost);
      if (boost && random(`${state.salt}/sprinkler/${plot.id}/${plot.generation}`) < 0.6) mutate(plot.fruit, "Wet");
    }
    if (sky.mutation && plot.lastWeather !== cycle) {
      plot.lastWeather = cycle;
      const roll = random(`${state.salt}/${plot.id}/${plot.generation}/${cycle}`);
      const rod = sky === skies.storm && state.rod > 0;
      if (rod || roll < sky.chance) {
        if (mutate(plot.fruit, sky.mutation) && rod) state.rod--;
      }
    }
  }

  function petEffect(state, tick) {
    const available = state.plots.filter(plot => plot?.fruit);
    if (!state.activePet || !available.length) return;
    const seed = `${state.salt}/pet/${tick}`;
    const plot = available[Math.floor(random(seed) * available.length)];
    const effects = pets[state.activePet]?.effects ?? pets.tanuki.effects;
    mutate(plot.fruit, effects[Math.floor(random(seed + "/mix") * effects.length)]);
  }

  function advance(state, now) {
    if (now <= state.time) return;
    // An old save needs only a limited weather history. Growth still completes over this window.
    let from = Math.max(state.time, now - 30 * 24 * 60 * minute);
    while (from < now && state.plots.some(Boolean)) {
      const cycle = Math.floor(from / weatherInterval);
      const petTick = Math.floor(from / petInterval) + 1;
      const boost = state.boost?.ends > from ? state.boost : null;
      const sky = weather(from);
      const speed = sky.speed * (gear[boost?.key]?.speed ?? 1);
      let until = Math.min(now, (cycle + 1) * weatherInterval,
        state.activePet ? petTick * petInterval : Infinity, boost?.ends ?? Infinity);
      for (const plot of state.plots) {
        if (!plot) continue;
        // Already mature fruit encounters this weather before fruit that ripens later.
        if (plot.fruit) advancePlot(state, plot, 0, speed, sky, cycle, boost?.key);
        else until = Math.min(until, from + Math.max(1, Math.ceil((duration(plot) - plot.progress) / speed)));
      }
      for (const plot of state.plots) {
        if (plot && !plot.fruit) advancePlot(state, plot, until - from, speed, sky, cycle, boost?.key);
      }
      if (until === petTick * petInterval) petEffect(state, petTick);
      from = until;
    }
    state.time = now;
    if (state.boost?.ends <= now) state.boost = null;
  }

  function harvest(state, index) {
    const plot = state.plots[index];
    if (!plot?.fruit || plot.locked) return false;
    state.basket.push(plot.fruit);
    if (crops[plot.key].repeat) {
      plot.progress = 0;
      plot.generation++;
      plot.fruit = null;
      plot.lastWeather = -1;
    } else {
      state.plots[index] = null;
    }
    return true;
  }

  function transplant(state, source, target) {
    const plot = state.plots[source];
    if (!ownsPlot(state, target) || !plot || plot.locked || state.plots[target] || !state.gear.trowel) return false;
    state.plots[target] = plot;
    state.plots[source] = null;
    state.gear.trowel--;
    return true;
  }

  function sell(state) {
    const total = state.basket.reduce((sum, fruit) => sum + value(fruit), 0);
    state.money += total;
    state.basket = [];
    return total;
  }

  function useGear(state, key, now, plot) {
    if (!state.gear[key]) return false;
    if (gear[key]?.speed) {
      if (state.boost) return false;
      state.boost = { key, ends: now + gear[key].minutes * minute };
    } else if (gear[key]?.avatarEffect) {
      state.avatarEffects ??= {};
      state.avatarEffects[gear[key].avatarEffect] = { key, ends: now + minute };
    } else if (key === "rod") {
      state.rod += 3;
    } else if (key === "lock" && plot && !plot.locked) {
      plot.locked = true;
    } else if (key === "spray" && plot?.fruit) {
      const options = ["Wet", "Chilled", "Pollinated", "Shocked", "Celestial"];
      const roll = Math.floor(Math.random() * options.length);
      const success = options.slice(roll).concat(options.slice(0, roll)).some(kind => mutate(plot.fruit, kind));
      if (!success) return false;
    } else {
      return false;
    }
    state.gear[key]--;
    return true;
  }

  function hatch(state, id, now) {
    const index = state.incubating.findIndex(egg => egg.id === id && egg.ends <= now);
    if (index === -1) return null;
    const [egg] = state.incubating.splice(index, 1);
    const pool = eggs[egg.key].pets;
    const pet = pool[Math.floor(random(`${state.salt}/egg/${id}`) * pool.length)];
    state.pets.push(pet);
    state.activePet ??= pet;
    return pet;
  }

  return { crops, gear, eggs, pets, petInterval, petEffectLabel, mutations, weatherInterval, restockInterval, stock, buy,
    plotsPerFarm, validPlotCount, nextLand, buyLand, weather, value, plant, create, advance, harvest, transplant, sell, useGear, hatch, duration };
})(typeof FarmCatalog === "undefined" ? require("./catalog.js") : FarmCatalog);

if (typeof module !== "undefined") module.exports = Garden;
