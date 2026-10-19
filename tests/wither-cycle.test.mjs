import assert from "node:assert/strict";
import { WitherCycle } from "../wither-cycle.js";

function hold(cycle, openness, at) {
  cycle.update(openness, at);
  return cycle.update(openness, at + 130);
}

function breath(cycle, at) {
  cycle.update(.65, at);
  hold(cycle, 0, at + 90);
  return hold(cycle, 1, at + 260);
}

const draws = [];
const values = [.9, .2];
const cycle = new WitherCycle({ random: () => { draws.push(1); return values.shift() ?? .9; } });
hold(cycle, 1, 0);
assert.equal(breath(cycle, 300).cycles, 1);
assert.equal(breath(cycle, 900).cycles, 2);
assert.equal(draws.length, 0, "no random draw before the third descent");
assert.equal(cycle.update(.65, 1500).triggered, false);
assert.equal(draws.length, 1, "draw starts during the third closing movement");
assert.equal(cycle.update(.4, 1530).triggered, false);
assert.equal(draws.length, 1, "one draw per descent");
hold(cycle, 0, 1600);
hold(cycle, 1, 1870);
assert.equal(cycle.update(.65, 2100).triggered, true);
assert.equal(draws.length, 2, "fourth descent gets an independent draw");
assert.equal(breath(cycle, 2700).triggered, false, "wither is terminal until reset");
cycle.reset();
assert.equal(cycle.cycles, 0);

const jitter = new WitherCycle({ minCycles: 2, chance: 1 });
hold(jitter, 1, 0);
for (let t = 200; t < 800; t += 30) jitter.update(t % 60 ? .24 : .27, t);
assert.equal(jitter.cycles, 0, "noise near the closed threshold must not count");
hold(jitter, 0, 900);
jitter.interrupt();
assert.equal(hold(jitter, 1, 1200).cycles, 0, "lost tracking cannot complete a breath");
breath(jitter, 1600);
assert.equal(jitter.update(.65, 2200).triggered, true);

const disabled = new WitherCycle({ minCycles: 1, chance: 0, random: () => 0 });
hold(disabled, 1, 0);
assert.equal(breath(disabled, 300).triggered, false);
console.log("wither cycle: seamless closing trigger, 30% draw timing, jitter, loss and reset OK");
