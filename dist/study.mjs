import bank from "./social-questions.mjs";
import { gradeAnswer } from "./grade-answer.mjs";

export const playReward = 10_000;
const initialPlayTime = 90_000;
export const maxPlayTime = 180_000;
export const sheckleReward = 10;
export const title = bank.title;
export const totalQuestions = bank.questions.length;

const materials = {
  "industry-002": { prompt: "鹿児島市では、屋外にパネルを並べて太陽の光を受けています。この方法で電気をつくることを何といいますか。" },
  "industry-004": {
    prompt: "資料を読むと、1990年から2019年にかけて製造業で働く人の数はどう変わりましたか。",
    detail: "1990年 約1,100万人 ／ 2019年 約800万人",
    hint: "1990年と2019年の人数を比べましょう。",
  },
  "industry-005": {
    prompt: "資料で、中小工場が生産額にしめる割合が最も高いのは何工業ですか。",
    detail: "機械工業 28.6％ ／ 金属工業 60.2％ ／ せんい工業 89.8％ ／ 化学工業 48.6％ ／ 食料品工業 72.5％",
  },
  "industry-006": {
    prompt: "機械工業の生産額の71.4％をしめる、働く人が300人以上の工場を何とよびますか。",
  },
  "industry-026": {
    prompt: "資料で、大田区の工場数の割合が最も高い業種は何ですか。",
    detail: "金属 25.0％ ／ 機械 48.5％ ／ 化学 10.0％ ／ 食料品 4.1％ ／ せんい 1.2％ ／ その他 11.2％",
    hint: "資料の割合を比べ、いちばん大きい数を見つけましょう。",
  },
  "industry-030": { prompt: "日本企業の鉄道車両が、ロンドンを首都とする国に輸出されました。その国はどこですか。" },
};

export const playRemaining = state => Number.isFinite(state.playMs)
  ? Math.max(0, Math.min(maxPlayTime, state.playMs))
  : initialPlayTime;

export function spendPlayTime(state, elapsed) {
  state.playMs = Math.max(0, playRemaining(state) - elapsed);
}

export function question(state) {
  const sequence = state.social?.correct ?? 0;
  const index = sequence % totalQuestions;
  const entry = bank.questions[index];
  return { ...entry, ...materials[entry.id], sequence, index, solved: false };
}

export function check(state, problem, input) {
  if (problem.solved || problem.sequence !== (state.social?.correct ?? 0)) return { status: "solved" };
  const result = gradeAnswer(problem, input);
  if (result.status !== "correct") return result;
  state.social ??= { correct: 0, earned: 0 };
  state.social.correct++;
  state.social.earned += sheckleReward;
  state.money += sheckleReward;
  state.playMs = Math.min(maxPlayTime, playRemaining(state) + playReward);
  problem.solved = true;
  return result;
}
