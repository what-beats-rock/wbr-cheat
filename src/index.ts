import type { FightResult } from "whatbeatsrock";
import { submitGuess, saveScore } from "whatbeatsrock";

import { LIMIT, WORDS } from "./config";
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
    );

    if (fallbackTriggered) {
      console.warn(
        `⚠️ Exhausted all combinations in the word bank. Returning fallback url.`,
      );
    }

    return candidatePhrase;
  }

  async submitScore(
    guess: string,
    data: FightResult,
    prevEmoji: string,
  ): Promise<void> {
    const guessEmoji = data.guess_emoji || "❓";
    const text = `${guess} ${guessEmoji} did not beat ${this.previousGuess} ${prevEmoji}`;

    const payload = { gid: this.gameId, score: this.score, text: text };

    try {
      console.log("Saving highscore...");
      await saveScore({ payload });
    } catch (error) {
      console.error(`⚠️ Failed to submit highscore:`, error.message);
    }
  }

  async submitGuess(guess: string) {
    const payload = { gid: this.gameId, guess, prev: this.previousGuess };

    try {
      const responseData = await submitGuess({ payload });

      if ("error" in responseData) {
        return { success: false as const, error: responseData.error };
      }

      this.usedPhrases.push(guess);
      return { success: true as const, data: responseData.data };
    } catch (error) {
      return {
        success: false as const,
        error: error?.message || "An unexpected network error occurred.",
      };
    }
  }

  // Runs a single game and returns the losing reason text
  async run(): Promise<string> {
    let prevEmoji = "🪨";
    let guess = this.generateNextGuess(this.previousGuess);

    console.log(`Submitting first guess: ${guess}`);
    let response = await this.submitGuess(guess);
    if (!response.success) {
      throw new Error(response.error);
    }

    let data = response.data;
    let win = data.guess_wins;

    while (win) {
      this.score++;

      const cacheStatus = data.cached
        ? `[CACHED=${data.cache_count}]`
        : "[UNCACHED]";
      console.log(
        `✅ Win! ${cacheStatus} Reason: "${data.reason}"\nCurrent Score: ${this.score}`,
      );

      this.previousGuess = guess;
      prevEmoji = data.guess_emoji || "❓";

      guess = this.generateNextGuess(this.previousGuess);
      console.log(`Submitting next guess: ${guess}`);

      response = await this.submitGuess(guess);
      if (!response.success) {
        throw new Error(response.error);
      }

      data = response.data;
      win = data.guess_wins;
    }

    console.log(
      `❌ Round lost: ${data.reason}\nFinal score recorded: ${this.score}`,
    );
    await this.submitScore(guess, data, prevEmoji);
    console.log(
      `%cGame Over! Final Score: ${this.score}`,
      "font-weight: bold; color: #00ff00; font-size: 14px;",
    );

    // Return the breakdown text of why the round lost
    const guessEmoji = data.guess_emoji || "❓";
    return `Game ID ${this.gameId} (Score: ${this.score}): ${guess} ${guessEmoji} lost to ${this.previousGuess} ${prevEmoji}. Reason: "${data.reason}"`;
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
        console.error(`🛑 Critical Error in Run ${i}:`, e.message);
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
  await program.runSequence(5);
} catch (e) {
  console.error(`🛑 Master Runner Failed:`, e.message);
}
