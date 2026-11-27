import bank from "./social-questions.mjs";
import { gradeAnswer } from "./grade-answer.mjs";

export const answerDelay = 30_000;
export const playReward = 10_000;
const initialPlayTime = 90_000;
export const maxPlayTime = 180_000;
export const sheckleReward = 10;
export const title = bank.title;
const questions = bank.questions;
export const totalQuestions = questions.length;

export const playRemaining = state => Number.isFinite(state.playMs)
  ? Math.max(0, Math.min(maxPlayTime, state.playMs))
  : initialPlayTime;

export function spendPlayTime(state, elapsed) {
  state.playMs = Math.max(0, playRemaining(state) - elapsed);
}

export function progress(state) {
  return state.social?.informationSeen ?? 0;
}

export function question(state, now = performance.now()) {
  const sequence = progress(state);
  const index = sequence % totalQuestions;
  const entry = questions[index];
  return { ...entry, sequence, index, deadline: now + answerDelay, outcome: null };
}

function current(state, problem) {
  return !problem.outcome && problem.sequence === progress(state);
}

function finish(state, problem, outcome) {
  state.social ??= { correct: 0, earned: 0 };
  state.social.informationSeen = problem.sequence + 1;
  problem.outcome = outcome;
}

export function reveal(state, problem, now = performance.now()) {
  if (!current(state, problem) || now < problem.deadline) return false;
  finish(state, problem, "revealed");
  return true;
}

export function check(state, problem, input, now = performance.now()) {
  if (!current(state, problem)) return { status: "stale" };
  if (reveal(state, problem, now)) return { status: "revealed" };
  const result = gradeAnswer(problem, input);
  if (result.status !== "correct") return result;
  finish(state, problem, "correct");
  state.social.correct++;
  state.social.earned += sheckleReward;
  state.money += sheckleReward;
  state.playMs = Math.min(maxPlayTime, playRemaining(state) + playReward);
  return result;
}
