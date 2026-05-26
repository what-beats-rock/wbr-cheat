export function getNextGuess(
  previousGuess: string,
  usedPhrases: readonly string[],
  wordBank: readonly string[],
): { candidatePhrase: string; fallbackTriggered: boolean } {
  const last = previousGuess.split(" that destroys this exact ");

  const shuffledBank = wordBank.toSorted(() => Math.random() - 0.5);

  for (const nextWord of shuffledBank) {
    const candidatePhrase = `${nextWord} that destroys this exact ${last[0]}`;

    if (usedPhrases.includes(candidatePhrase) || last.includes(nextWord)) {
      continue;
    }

    return { candidatePhrase, fallbackTriggered: false };
  }

  return { candidatePhrase: "https://rman.dev", fallbackTriggered: true };
}
