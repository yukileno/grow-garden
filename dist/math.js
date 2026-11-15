const FarmMath = (() => {
  const playReward = 30_000;
  const playRemaining = state => state.playMs ?? 60_000;

  function spendPlayTime(state, elapsed) {
    state.playMs = Math.max(0, playRemaining(state) - elapsed);
  }
  const modes = {
    add: { label: "たし算", symbol: "＋", reward: 10, tip: "大きい数から、もう一方の数だけ数えてみよう。" },
    subtract: { label: "ひき算", symbol: "−", reward: 15, tip: "引く数にいくつ足すと、最初の数になるかな？" },
    multiply: { label: "かけ算", symbol: "×", reward: 20, tip: "最初の数を、次の数の回数だけ足してみよう。" },
    divide: { label: "わり算", symbol: "÷", reward: 25, tip: "割る数にいくつかけると、最初の数になるかな？" },
  };

  function question(mode, previous) {
    const sample = max => 1 + Math.floor(Math.random() * max);
    let left, right, answer;
    if (mode === "add") {
      left = sample(10);
      right = sample(10);
      answer = left + right;
    } else if (mode === "subtract") {
      left = sample(20);
      right = sample(left);
      answer = left - right;
    } else if (mode === "multiply") {
      left = sample(9);
      right = sample(9);
      answer = left * right;
    } else {
      right = sample(9);
      answer = sample(9);
      left = right * answer;
    }
    // Move to another valid pair when the same calculation is drawn twice.
    if (previous?.mode === mode && previous.left === left && previous.right === right) {
      if (mode === "divide") {
        answer = answer % 9 + 1;
        left = right * answer;
      } else if (mode === "subtract") {
        left = left === 20 ? 19 : left + 1;
        right = Math.min(right, left);
        answer = left - right;
      } else {
        right = right % (mode === "add" ? 10 : 9) + 1;
        answer = mode === "add" ? left + right : left * right;
      }
    }
    return { mode, left, right, answer, solved: false };
  }

  function check(state, problem, input) {
    if (problem.solved) return "solved";
    const normalized = String(input).normalize("NFKC").trim();
    if (!/^\d{1,3}$/.test(normalized)) return "invalid";
    if (Number(normalized) !== problem.answer) return "incorrect";
    const reward = modes[problem.mode].reward;
    state.math ??= { correct: 0, earned: 0 };
    state.math.correct++;
    state.math.earned += reward;
    state.money += reward;
    state.playMs = playRemaining(state) + playReward;
    problem.solved = true;
    return "correct";
  }

  return { modes, question, check, playReward, playRemaining, spendPlayTime };
})();

if (typeof module !== "undefined") module.exports = FarmMath;
