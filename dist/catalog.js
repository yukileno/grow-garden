// Grow a Garden 2 community Wiki shop tables. Growth and sale values are tuned for this farm.
// https://growagarden2.fandom.com/wiki/Seed_Shop
// https://growagarden2.fandom.com/wiki/Gear_Shop
const FarmCatalog = (() => {
  const tiers = ["コモン", "アンコモン", "レア", "エピック", "レジェンダリー", "ミシカル", "スーパー"];
  const seedRows = [
    ["carrot", "ニンジン", "🥕", 0, 1, 3, 4, 100, 18, 0, "#f07128"],
    ["strawberry", "イチゴ", "🍓", 0, 10, 4, 5, 100, 42, 30, "#e13845"],
    ["blueberry", "ブルーベリー", "🫐", 0, 25, 1, 2, 100, 65, 48, "#544cc7"],
    ["tulip", "チューリップ", "🌷", 1, 40, 3, 4, 100, 55, 0, "#ec5187"],
    ["tomato", "トマト", "🍅", 1, 200, 2, 3, 90, 95, 60, "#e24a2d"],
    ["apple", "リンゴ", "🍎", 1, 400, 1, 1, 52.63, 105, 70, "#cb392f"],
    ["bamboo", "竹", "🎋", 2, 700, 7, 11, 80, 110, 0, "#66a33b"],
    ["corn", "トウモロコシ", "🌽", 2, 2500, 1, 1, 25, 120, 78, "#f8ce48"],
    ["cactus", "サボテン", "🌵", 2, 5000, 1, 2, 16.668, 145, 90, "#3d9b5d"],
    ["pineapple", "パイナップル", "🍍", 2, 10000, 1, 3, 12.501, 165, 105, "#e7ae35"],
    ["mushroom", "キノコ", "🍄", 3, 15000, 2, 5, 9.092, 190, 0, "#da5649"],
    ["greenBean", "インゲン豆", "🌱", 3, 20000, 1, 2, 15, 170, 105, "#72aa3b"],
    ["banana", "バナナ", "🍌", 3, 30000, 1, 1, 9, 200, 120, "#f0d124"],
    ["grape", "ブドウ", "🍇", 3, 50000, 1, 1, 6.668, 185, 105, "#853fbe"],
    ["coconut", "ココナッツ", "🥥", 3, 140000, 1, 1, 5.001, 220, 135, "#9c623c"],
    ["mango", "マンゴー", "🥭", 3, 300000, 1, 1, 5.001, 300, 160, "#f2ae32"],
    ["dragonFruit", "ドラゴンフルーツ", "🍈", 4, 120000, 1, 1, 4, 255, 150, "#d73483"],
    ["acorn", "どんぐり", "🌰", 4, 700000, 1, 3, 2.942, 315, 175, "#956138"],
    ["cherry", "サクランボ", "🍒", 4, 1200000, 1, 1, 2.274, 340, 190, "#e3304b"],
    ["sunflower", "ひまわり", "🌻", 4, 5000000, 1, 1, 1.787, 430, 0, "#ffce3c"],
    ["venus", "ハエトリグサ", "🍃", 5, 7000000, 1, 1, 1.43, 430, 250, "#c55559"],
    ["pomegranate", "ザクロ", "🍎", 5, 12000000, 1, 1, .927, 470, 255, "#b62f4d"],
    ["poisonApple", "毒リンゴ", "🍏", 5, 25000000, 1, 1, .533, 510, 285, "#a5bf37"],
    ["venomSpitter", "毒吐き草", "🌿", 5, 30000000, 1, 1, .475, 540, 310, "#71d942"],
    ["briarRose", "いばらのバラ", "🌹", 5, 50000000, 1, 1, .425, 560, 320, "#b44173", "未登場"],
    ["moonBloom", "月の花", "🌙", 6, 65000000, 1, 1, .35, 600, 340, "#a7a3f5"],
    ["hypnoBloom", "まぼろしの花", "🌸", 6, 90000000, 1, 1, .275, 620, 350, "#a746e5", "未登場"],
    ["dragonBreath", "竜の息吹", "🔥", 6, 90000000, 1, 1, .275, 640, 365, "#fb623e"],
  ];
  const seeds = Object.fromEntries(seedRows.map(([key, name, icon, tier, cost, minStock, stock, percent, seconds, repeat, color, status]) => [
    key, { name, icon, tier: tiers[tier], cost, minStock, stock, chance: percent / 100, seconds, repeat, color, status,
      weight: .4 + tier * .3, base: Math.max(5, Math.round(cost * (repeat ? .56 : 1.45))) },
  ]));

  const gearRows = [
    ["sprinkler","普通のスプリンクラー","🚿",0,3000,1,2,50,"5分間、畑の成長と変異を促す",1.5,5],
    ["wateringCan","普通のじょうろ","💧",0,2000,2,5,90,"1分間、畑の成長を促す",1.4,1],
    ["sign","看板","🪧",0,4000,1,1,100,"文字を表示する道具"],
    ["uncommonSprinkler","上級スプリンクラー","🚿",1,10000,1,2,35,"6分間、畑の成長と変異を促す",1.7,6],
    ["rareSprinkler","レアスプリンクラー","💦",2,80000,1,2,25,"8分間、畑の成長と変異を促す",2,8],
    ["trowel","移植ごて","🪴",2,1000,2,3,28,"作物を別の区画へ移す道具"],
    ["jumpMushroom","ジャンプキノコ","🍄",2,1800,1,4,24,"ジャンプ力を一時的に上げる"],
    ["speedMushroom","俊足キノコ","🍄",2,1500,1,5,22,"移動速度を一時的に上げる"],
    ["lantern","ランタン","🏮",2,12000,1,1,100,"暗い場所を照らす","入手不可"],
    ["megaphone","メガホン","📣",2,4000,1,1,100,"音を鳴らす道具"],
    ["shrinkMushroom","縮小キノコ","🍄",3,10000,1,3,10,"体を一時的に小さくする"],
    ["supersizeMushroom","巨大化キノコ","🍄",3,4500,1,3,10,"体を一時的に大きくする"],
    ["gnome","庭の小人","🪴",3,100000,2,5,8,"作物を守る"],
    ["flashbang","閃光玉","💫",3,20000,4,7,7,"対人用の道具"],
    ["pot","植木鉢","🪴",3,300000,1,3,7,"作物を植える鉢"],
    ["master","伝説のスプリンクラー","💦",4,1200000,1,2,4,"10分間、畑の成長・重量・変異を強化",2.4,10],
    ["teleporter","瞬間移動装置","🌀",4,60000,1,3,3,"前方へ瞬間移動する","入手不可"],
    ["invisibilityMushroom","透明キノコ","🍄",4,30000,1,2,4,"姿を一時的に隠す"],
    ["wheelbarrow","手押し車","🛒",4,500000,1,1,100,"他のプレイヤーを運ぶ"],
    ["playerMagnet","引き寄せ磁石","🧲",5,7000000,1,1,100,"近くのプレイヤーを引き寄せる"],
    ["strawberrySniper","イチゴ発射器","🍓",5,13000000,1,1,100,"対人用の道具"],
    ["superWateringCan","スーパーじょうろ","💧",6,1000000,1,2,2,"短時間、畑の成長を大幅に速める",300,.1],
    ["superSprinkler","スーパースプリンクラー","💦",6,3000000,1,2,1.2,"10分間、畑の成長・重量・変異を強化",3,10],
    ["grapple","かぎ縄","🪝",5,10000000,1,1,100,"離れた場所に引っ掛けて移動する","未登場"],
    ["powerHose","強力ホース","💧",null,null,0,0,0,"水を遠くまで飛ばす","本家の有料枠"],
    ["freezeRay","冷凍光線","❄️",null,null,0,0,0,"対人用の道具","本家の有料枠"],
    ["rainbowCarpet","虹のじゅうたん","🌈",null,null,0,0,0,"空を飛んで移動する","本家の有料枠"],
    ["vineWrapper","つる巻き","🌿",null,null,0,0,0,"対人用の道具","本家の有料枠"],
    ["legendaryPetTeleporter","伝説ペット探索装置","🐾",null,null,0,0,0,"野生の伝説ペットを探す","入手不可"],
    ["mythicPetTeleporter","神話ペット探索装置","🐾",null,null,0,0,0,"野生の神話ペットを探す","入手不可"],
    ["superPetTeleporter","スーパーペット探索装置","🐾",null,null,0,0,0,"野生のスーパーペットを探す","入手不可"],
    ["rake","熊手","🍂",null,null,0,0,0,"作物を守る道具","未登場"],
    ["crowbar","バール","🛠️",null,null,0,0,0,"対人用の道具","未登場"],
  ];
  const gear = Object.fromEntries(gearRows.map(([key, name, icon, tier, cost, minStock, stock, percent, description, effect, minutes]) => [
    key, { name, icon, tier: tiers[tier], cost, minStock, stock, chance: percent / 100, description,
      speed: typeof effect === "number" ? effect : undefined, minutes,
      status: typeof effect === "number" ? undefined : effect ?? "図鑑のみ" },
  ]));
  for (const [key, effect] of Object.entries({
    jumpMushroom: "jump", speedMushroom: "speed", shrinkMushroom: "size",
    supersizeMushroom: "size", invisibilityMushroom: "visibility",
  })) {
    gear[key].avatarEffect = effect;
    delete gear[key].status;
  }
  delete gear.trowel.status;
  return { seeds, gear };
})();
if (typeof module !== "undefined") module.exports = FarmCatalog;
