import { expect, test, describe } from "bun:test";

import { getNextGuess } from "../src/utils";

describe("getNextGuess Logic Tests", () => {
  const sampleWordBank = ["apple", "banana", "carrot", "diamond"];

  test("should successfully generate a valid structural phrase", () => {
    const previousGuess = "rock";
    const usedPhrases: string[] = [];

    const result = getNextGuess(previousGuess, usedPhrases, sampleWordBank);

    expect(result.fallbackTriggered).toBe(false);
    expect(result.candidatePhrase).toContain("that destroys this exact rock");

    // Verifies that the starting word came from our bank
    const chosenWord = result.candidatePhrase.split(" ")[0];
    expect(sampleWordBank).toContain(chosenWord!);
  });

  test("should handle splitting complex previous guesses correctly", () => {
    const previousGuess = "apple that destroys this exact rock";
    const usedPhrases: string[] = [];

    const result = getNextGuess(previousGuess, usedPhrases, sampleWordBank);

    // It should target 'apple', not 'rock'
    expect(result.candidatePhrase).toContain("that destroys this exact apple");
    expect(result.candidatePhrase).not.toContain("this exact rock");
  });

  test("should skip words that have already been used for that specific phrase", () => {
    const previousGuess = "rock";
    // Force match the format to block everything except 'diamond'
    const usedPhrases = [
      "apple that destroys this exact rock",
      "banana that destroys this exact rock",
      "carrot that destroys this exact rock",
    ];

    const result = getNextGuess(previousGuess, usedPhrases, sampleWordBank);

    expect(result.fallbackTriggered).toBe(false);
    expect(result.candidatePhrase).toBe(
      "diamond that destroys this exact rock",
    );
  });

  test("should skip the word if it was the immediate previous subject", () => {
    const previousGuess = "apple that destroys this exact rock";
    const usedPhrases: string[] = [];
    const tinyBank = ["apple", "banana"];

    const result = getNextGuess(previousGuess, usedPhrases, tinyBank);

    // 'apple' is in the bank, but it shouldn't destroy itself
    expect(result.candidatePhrase).toBe(
      "banana that destroys this exact apple",
    );
  });

  test("should return fallback payload when combinations are completely exhausted", () => {
    const previousGuess = "rock";
    const usedPhrases = sampleWordBank.map(
      (word) => `${word} that destroys this exact rock`,
    );

    const result = getNextGuess(previousGuess, usedPhrases, sampleWordBank);

    expect(result.fallbackTriggered).toBe(true);
    expect(result.candidatePhrase).toBe("https://rman.dev");
  });
});
