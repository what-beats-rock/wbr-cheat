export function getNextGuess(
  previousGuess: string,
  usedPhrases: readonly string[],
  wordBank: readonly string[],
  useRandomOrder = true,
): { candidatePhrase: string; fallbackTriggered: boolean } {
  const last = previousGuess.split(" that destroys this exact ");

  const words = useRandomOrder
    ? wordBank.toSorted(() => Math.random() - 0.5)
    : wordBank;

  for (const nextWord of words) {
    const candidatePhrase = `${nextWord} that destroys this exact ${last[0]}`;

    if (usedPhrases.includes(candidatePhrase) || last.includes(nextWord)) {
      continue;
    }

    return { candidatePhrase, fallbackTriggered: false };
  }

  return { candidatePhrase: "https://rman.dev", fallbackTriggered: true };
}
