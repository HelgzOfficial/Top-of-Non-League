// Pure schedule-generation logic, kept dependency-free and exported
// separately from seed-schedule.mjs so it can be unit-tested on its own
// (see scripts/generate-schedule.test.mjs).

// 2026/27 season club allocation (confirmed against isthmian.co.uk and
// Wikipedia in August 2026). Seven clubs changed from the 2025/26 season:
// out went Billericay Town, Canvey Island, Chichester City, Cray Valley
// Paper Mills, Folkestone Invicta, Hashtag United and Potters Bar Town; in
// came AFC Whyteleafe, Eastbourne Borough, Enfield Town, Leatherhead,
// Maldon & Tiptree, Stanway Rovers and Three Bridges.
export const TEAMS = [
  "AFC Whyteleafe", "Aveley", "Brentwood Town", "Burgess Hill Town", "Carshalton Athletic",
  "Chatham Town", "Cheshunt", "Cray Wanderers", "Dartford", "Dulwich Hamlet",
  "Eastbourne Borough", "Enfield Town", "Leatherhead", "Lewes", "Maldon & Tiptree",
  "Ramsgate", "St Albans City", "Stanway Rovers", "Three Bridges", "Welling United",
  "Whitehawk", "Wingate & Finchley",
];

/**
 * Standard "circle method" double round-robin: n teams play every other
 * team home and away once, across (n-1)*2 rounds of n/2 matches each.
 * For 22 teams that's 42 rounds of 11 matches — 462 fixtures, 42 games per
 * team, matching the real Isthmian Premier Division season structure.
 */
export function generateSchedule(teams) {
  const n = teams.length;
  const half = n / 2;
  let arr = teams.slice();
  const firstLeg = [];

  for (let r = 0; r < n - 1; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      let home = arr[i];
      let away = arr[n - 1 - i];
      if (r % 2 === 1 && i === 0) {
        [home, away] = [away, home];
      }
      roundMatches.push({ home, away });
    }
    firstLeg.push(roundMatches);
    arr.splice(1, 0, arr.pop());
  }

  const secondLeg = firstLeg.map((round) => round.map((m) => ({ home: m.away, away: m.home })));
  return firstLeg.concat(secondLeg); // 42 rounds
}
