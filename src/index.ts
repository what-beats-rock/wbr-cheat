import type { FightResult } from "whatbeatsrock";
import { submitGuess, saveScore } from "whatbeatsrock";

import {
  LIMIT,
  LOSING_COMBINATIONS,
  TOTAL_RUNS,
  USE_RANDOM_ORDER,
  WORDS,
} from "./config";
import { getNextGuess } from "./utils";

class Program {
  gameId: string;
  score: number;
  previousGuess: string;
  usedPhrases: string[];

  constructor() {
    this.gameId = crypto.randomUUID();
    this.score = 0;
    this.previousGuess = "rock";
    this.usedPhrases = [];
  }

  reset() {
    this.gameId = crypto.randomUUID();
    this.score = 0;
    this.previousGuess = "rock";
    this.usedPhrases = [];
  }

  generateNextGuess(previousGuess: string): string {
    const { candidatePhrase, fallbackTriggered } = getNextGuess(
      previousGuess,
      this.usedPhrases,
      WORDS.slice(0, LIMIT),
      LOSING_COMBINATIONS,
      USE_RANDOM_ORDER,
    );

    if (fallbackTriggered) {
      console.log(
        "\x1b[36m🔄 Word bank fully explored — Submitting final guess\x1b[0m",
      );
    }

    return candidatePhrase;
  }

  async submitScore(
    guess: string,
    data: FightResult,
    prevEmoji: string,
  ): Promise<void> {
    const text = `${guess} ${data.guess_emoji} did not beat ${this.previousGuess} ${prevEmoji}`;

    const payload = { gid: this.gameId, score: this.score, text: text };

    try {
      console.log("Saving highscore...");
      const result = await saveScore({ payload });
      if (!result.ok) {
        console.error(`⚠️ Failed to submit highscore:`, result.error);
      } else {
        console.log("Score saved");
      }
    } catch (error) {
      console.error(`⚠️ Failed to submit highscore:`, error);
    }
  }

  async submitGuess(guess: string): Promise<FightResult> {
    let attempt = 0;
    const payload = { gid: this.gameId, guess, prev: this.previousGuess };

    while (true) {
      const response = await submitGuess({ payload });

      if (response.ok) {
        this.usedPhrases.push(guess);
        return response.data;
      }

      const delay = Math.pow(1.3, attempt) * 30_000;

      attempt++;

      console.log(
        `⚠️ Rate limit or API error detected (${response.error}). Retrying attempt ${attempt} in ${(delay / 1000).toFixed(2)}s...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Runs a single game and returns the losing reason text
  async run(): Promise<string> {
    let prevEmoji = "🪨";
    let guess = this.generateNextGuess(this.previousGuess);

    console.log(`Submitting first guess: "${guess}"`);

    let data = await this.submitGuess(guess);
    let win = data.guess_wins;

    while (win) {
      this.score++;

      const cacheStatus = data.cached
        ? `[🔵 CACHED=${data.cache_count}]`
        : "[🟣 UNCACHED]";
      console.log(
        `✅ Win! ${cacheStatus} Reason: "${data.reason}"\nCurrent Score: ${this.score}`,
      );

      this.previousGuess = guess;
      prevEmoji = data.guess_emoji;

      guess = this.generateNextGuess(this.previousGuess);
      console.log(`Submitting next guess: "${guess}"`);

      data = await this.submitGuess(guess);
      win = data.guess_wins;
    }

    const reason = `Game ID ${this.gameId} (Score: ${this.score}): "${guess}" (${data.guess_emoji}) lost to "${this.previousGuess}" (${prevEmoji}). Reason: "${data.reason}"`;

    console.log(reason);

    await this.submitScore(guess, data, prevEmoji);
    console.log(
      `%cGame Over! Final Score: ${this.score}`,
      "font-weight: bold; color: #00ff00; font-size: 14px;",
    );

    // Return the breakdown text of why the round lost
    return reason;
  }

  // Runs a specific number of games sequentially and prints a summary
  async runSequence(totalRuns: number) {
    const lossReasons: string[] = [];

    for (let i = 1; i <= totalRuns; i++) {
      console.log(`\n============================`);
      console.log(`🚀 STARTING GAME RUN ${i} OF ${totalRuns}`);
      console.log(`============================`);

      try {
        const reason = await this.run();
        lossReasons.push(reason);
      } catch (e) {
        console.error(`🛑 Critical Error in Run ${i}:`, e);
        // @ts-expect-error
        lossReasons.push(`Run ${i} Failed: ${e.message}`);
      }

      // Reset state for the next game if we aren't on the final run
      if (i < totalRuns) {
        this.reset();
      }
    }

    // Output all summary statistics after everything finishes
    console.log(`\n============================`);
    console.log(`📊 ALL RUNS COMPLETE SUMMARY`);
    console.log(`============================`);
    console.log(`Total Matches Executed: ${totalRuns}\n`);
    console.log(`Losing Reasons Breakdown:`);

    lossReasons.forEach((entry, index) => {
      console.log(`[${index + 1}] ${entry}`);
    });
  }
}

try {
  const program = new Program();
  await program.runSequence(TOTAL_RUNS);
} catch (e) {
  console.error(`🛑 Master Runner Failed:`, e);
}
