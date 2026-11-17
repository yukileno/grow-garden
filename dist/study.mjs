import bank from "./social-questions.mjs";
import { gradeAnswer } from "./grade-answer.mjs";

export const playReward = 10_000;
const initialPlayTime = 90_000;
export const maxPlayTime = 180_000;
export const sheckleReward = 10;
export const title = bank.title;
export const totalQuestions = bank.questions.length;

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
  return { ...entry, sequence, index, solved: false };
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
