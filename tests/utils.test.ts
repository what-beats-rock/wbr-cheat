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

  test("should respect useRandomOrder = false (deterministic order)", () => {
    const previousGuess = "rock";
    const usedPhrases: string[] = [];
    const orderedBank = ["banana", "apple", "carrot", "diamond"];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      orderedBank,
      [], // no losing combos
      false, // useRandomOrder = false
    );

    // Should pick the first valid word in array order → "banana"
    expect(result.candidatePhrase).toBe("banana that destroys this exact rock");
    expect(result.fallbackTriggered).toBe(false);
  });

  test("should skip losing combination when previousGuess exactly matches 3-element triple", () => {
    const previousGuess = "soup that destroys this exact strawberry";
    const usedPhrases: string[] = [];
    const wordBank = ["lemon", "apple", "banana"];

    const losingCombinations: [string, string, string][] = [
      ["lemon", "soup", "strawberry"],
    ];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      wordBank,
      losingCombinations,
      false,
    );

    // Should skip "lemon" because previousGuess exactly matches the bad triple
    expect(result.candidatePhrase).toBe("apple that destroys this exact soup");
    expect(result.fallbackTriggered).toBe(false);
  });

  test("should NOT skip losing combination when previousGuess does NOT match the triple context", () => {
    const previousGuess = "soup that destroys this exact cake"; // different context
    const usedPhrases: string[] = [];
    const wordBank = ["lemon", "apple", "banana"];

    const losingCombinations: [string, string, string][] = [
      ["lemon", "soup", "strawberry"],
    ];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      wordBank,
      losingCombinations,
      false,
    );

    // "lemon" should be allowed because the context doesn't match the bad triple
    expect(result.candidatePhrase).toBe("lemon that destroys this exact soup");
    expect(result.fallbackTriggered).toBe(false);
  });

  test("should handle 2-element losing combinations correctly", () => {
    const previousGuess = "rock";
    const usedPhrases: string[] = [];
    const wordBank = ["umbrella", "apple"];

    const losingCombinations: [string, string][] = [["umbrella", "rock"]];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      wordBank,
      losingCombinations,
    );

    // Should skip "umbrella" against "rock"
    expect(result.candidatePhrase).toBe("apple that destroys this exact rock");
  });

  test("should never return a known losing phrase even with random order (3-element)", () => {
    const previousGuess = "soup that destroys this exact strawberry";
    const usedPhrases: string[] = [];
    const wordBank = ["lemon", "apple", "banana"];

    const losingCombinations: [string, string, string][] = [
      ["lemon", "soup", "strawberry"],
    ];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      wordBank,
      losingCombinations,
      true,
    );

    // With random order we can't know which word it picks,
    // but we can assert it never picks the losing one.
    expect(result.candidatePhrase).not.toBe(
      "lemon that destroys this exact soup",
    );
    expect(result.fallbackTriggered).toBe(false);
  });

  test("should never return a known losing phrase even with random order (2-element)", () => {
    const previousGuess = "rock";
    const usedPhrases: string[] = [];
    const wordBank = ["umbrella", "apple", "banana"];

    const losingCombinations: [string, string][] = [["umbrella", "rock"]];

    const result = getNextGuess(
      previousGuess,
      usedPhrases,
      wordBank,
      losingCombinations,
      true,
    );

    expect(result.candidatePhrase).not.toBe(
      "umbrella that destroys this exact rock",
    );
    expect(result.fallbackTriggered).toBe(false);
  });
});
