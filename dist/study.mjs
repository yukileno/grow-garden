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
const questionIds = questions.map(question => question.id);
const questionsById = new Map(questions.map(question => [question.id, question]));

export const playRemaining = state => Number.isFinite(state.playMs)
  ? Math.max(0, Math.min(maxPlayTime, state.playMs))
  : initialPlayTime;

export function spendPlayTime(state, elapsed) {
  state.playMs = Math.max(0, playRemaining(state) - elapsed);
}

export function progress(state) {
  return state.social?.informationSeen ?? 0;
}

function shuffle(ids) {
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function prepare(state) {
  const social = state.social ??= { correct: 0, earned: 0 };
  const order = social.informationOrder;
  if (Array.isArray(order) && order.length === totalQuestions &&
      new Set(order).size === totalQuestions && order.every(id => questionsById.has(id))) {
    return false;
  }
  // Keep questions already completed in the old fixed-order round.
  const index = progress(state) % totalQuestions;
  social.informationOrder = [...questionIds.slice(0, index), ...shuffle(questionIds.slice(index))];
  return true;
}

export function question(state, now = performance.now()) {
  const sequence = progress(state);
  const index = sequence % totalQuestions;
  const entry = questionsById.get(state.social.informationOrder[index]);
  return { ...entry, sequence, index, deadline: now + answerDelay, outcome: null };
}

export function isCurrent(state, problem) {
  return !problem.outcome && problem.sequence === progress(state) &&
    problem.id === state.social?.informationOrder?.[problem.index];
}

function finish(state, problem, outcome) {
  state.social.informationSeen = problem.sequence + 1;
  if (state.social.informationSeen % totalQuestions === 0) {
    const order = shuffle([...questionIds]);
    if (order.length > 1 && order[0] === problem.id) {
      const next = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[next]] = [order[next], order[0]];
    }
    state.social.informationOrder = order;
  }
  problem.outcome = outcome;
}

export function reveal(state, problem, now = performance.now()) {
  if (!isCurrent(state, problem) || now < problem.deadline) return false;
  finish(state, problem, "revealed");
  return true;
}

export function check(state, problem, input, now = performance.now()) {
  if (!isCurrent(state, problem)) return { status: "stale" };
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
