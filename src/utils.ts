export function getNextGuess(
  previousGuess: string,
  usedPhrases: readonly string[],
  wordBank: readonly string[],
  losingCombinations: readonly (readonly [string, string, string?])[] = [],
  useRandomOrder = true,
): { candidatePhrase: string; fallbackTriggered: boolean } {
  const last = previousGuess.split(" that destroys this exact ");
  const lastTarget = last[0];

  const words = useRandomOrder
    ? wordBank.toSorted(() => Math.random() - 0.5)
    : wordBank;

  for (const nextWord of words) {
    const candidatePhrase = `${nextWord} that destroys this exact ${lastTarget}`;

    if (usedPhrases.includes(candidatePhrase) || last.includes(nextWord)) {
      continue;
    }

    const isKnownLosing = losingCombinations.some(([a, b, c]) => {
      if (a !== nextWord) return false;
      if (!c) return b === lastTarget;

      const expectedPrev = `${b} that destroys this exact ${c}`;
      return previousGuess === expectedPrev;
    });

    if (isKnownLosing) {
      continue;
    }

    return { candidatePhrase, fallbackTriggered: false };
  }

  return { candidatePhrase: "https://rman.dev", fallbackTriggered: true };
}
