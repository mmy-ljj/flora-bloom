// Count only deliberate open -> closed -> open breaths. One random draw per cycle.
export class WitherCycle {
  constructor({ minCycles = 3, chance = .3, random = Math.random, holdMs = 120 } = {}) {
    this.minCycles = minCycles;
    this.chance = chance;
    this.random = random;
    this.holdMs = holdMs;
    this.reset();
  }

  reset() {
    this.cycles = 0;
    this.phase = "await-open";
    this.candidate = null;
    this.candidateAt = 0;
    this.triggered = false;
  }

  interrupt() {
    // A tracking gap cannot complete a half-finished breath with a different hand.
    this.phase = "await-open";
    this.candidate = null;
  }

  update(openness, now) {
    if (this.triggered || !Number.isFinite(openness)) return { cycles: this.cycles, triggered: false };
    const target = this.phase === "open" ? "closed" : "open";
    const crossed = target === "closed" ? openness <= .25 : openness >= .86;
    if (!crossed) {
      this.candidate = null;
      return { cycles: this.cycles, triggered: false };
    }
    if (this.candidate !== target) {
      this.candidate = target;
      this.candidateAt = now;
    }
    if (now - this.candidateAt < this.holdMs) return { cycles: this.cycles, triggered: false };
    this.candidate = null;
    if (target === "closed") {
      this.phase = "closed";
      return { cycles: this.cycles, triggered: false };
    }
    const completed = this.phase === "closed";
    this.phase = "open";
    if (completed) this.cycles += 1;
    const triggered = completed && this.cycles >= this.minCycles && this.random() < this.chance;
    if (triggered) this.triggered = true;
    return { cycles: this.cycles, triggered };
  }
}
