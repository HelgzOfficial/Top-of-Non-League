import { TEAMS, generateSchedule } from "./generate-schedule.mjs";
import assert from "node:assert";

const schedule = generateSchedule(TEAMS);

assert.strictEqual(schedule.length, 42, `expected 42 rounds, got ${schedule.length}`);
schedule.forEach((round, i) => {
  assert.strictEqual(round.length, 11, `round ${i + 1} should have 11 matches, got ${round.length}`);
  const teamsInRound = round.flatMap((m) => [m.home, m.away]);
  assert.strictEqual(new Set(teamsInRound).size, 22, `round ${i + 1} should feature all 22 teams exactly once`);
});

const gamesPlayed = Object.fromEntries(TEAMS.map((t) => [t, 0]));
const opponentsPlayed = Object.fromEntries(TEAMS.map((t) => [t, new Set()]));
const orderedPairsSeen = new Set();

schedule.flat().forEach((m) => {
  gamesPlayed[m.home]++;
  gamesPlayed[m.away]++;
  opponentsPlayed[m.home].add(m.away);
  opponentsPlayed[m.away].add(m.home);
  const pairKey = `${m.home}::${m.away}`;
  assert.ok(!orderedPairsSeen.has(pairKey), `duplicate fixture found: ${pairKey}`);
  orderedPairsSeen.add(pairKey);
});

TEAMS.forEach((t) => {
  assert.strictEqual(gamesPlayed[t], 42, `${t} should play 42 games, played ${gamesPlayed[t]}`);
  assert.strictEqual(opponentsPlayed[t].size, 21, `${t} should face all 21 other teams`);
});

assert.strictEqual(schedule.flat().length, 462, "total fixtures should be 462 (22*21)");

console.log("✅ All schedule invariants hold: 42 rounds, 11 matches/round, 42 games/team, every pair exactly once each way, 462 fixtures total.");
