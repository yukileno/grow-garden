function normalizeAnswer(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/gu, (kana) => String.fromCharCode(kana.charCodeAt(0) - 0x60))
    .replace(/[\s、,・。]/gu, "")
    .replace(/[。．.!！]+$/gu, "");
}

export function gradeAnswer(question, input) {
  const normalized = typeof input === "string" ? normalizeAnswer(input) : "";
  if (!normalized) return { status: "empty" };

  const correct = question.acceptedAnswers.some(
    (answer) => normalizeAnswer(answer) === normalized,
  );
  const matchesKeywords = question.alternativeKeywordGroups?.some((groups) =>
    groups.every((group) =>
      group.some((word) => normalized.includes(normalizeAnswer(word))),
    ),
  );
  return correct || matchesKeywords ? { status: "correct" } : { status: "incorrect", hint: question.hint };
}

