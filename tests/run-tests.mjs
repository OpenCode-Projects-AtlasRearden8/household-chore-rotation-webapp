#!/usr/bin/env node
'use strict';
/**
 * Zero-dependency tests for the pure rotation / swap math in index.html.
 * The tested code is extracted straight from the page's core block, so the
 * tests cannot drift from the app.
 *
 * Run:  node tests/run-tests.mjs
 * Also runnable by opening tests/index.html in a browser (file:// friendly).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const m = html.match(/\/\*__CORE_START__\*\/([\s\S]*?)\/\*__CORE_END__\*\//);
if (!m) {
  console.error('CORE markers not found in index.html');
  process.exit(1);
}
const core = new Function(`
  'use strict';
  ${m[1]}
  return { mod, makeId, todayStr, weekLabel, rotationAssignment, skillScore,
           weeksSince, strengthsAssignment, scoreAssignment, applyTrade,
           makeTradeEntry, bestSkillSwap, addLogEntry, computeReview };
`)();

const {
  mod, rotationAssignment, skillScore, weeksSince, strengthsAssignment,
  scoreAssignment, applyTrade, bestSkillSwap, computeReview, makeTradeEntry,
  weekLabel
} = core;

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.error('  FAIL ' + name); }
}
function eq(name, a, b) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.error('  FAIL ' + name + '\n        got: ' + sa + '\n        want: ' + sb); }
}

/* ---- fixtures: household of three, five chores ---- */
const sam = { id: 'p_sam', name: 'Sam', skills: { c_dishes: -2, c_trash: 1, c_bins: 0, c_bathroom: 1, c_floors: 0 } };
const alex = { id: 'p_alex', name: 'Alex', skills: { c_dishes: 2, c_trash: -1, c_bins: 1, c_bathroom: -1, c_floors: 1 } };
const jo = { id: 'p_jo', name: 'Jo', skills: { c_dishes: 1, c_trash: 0, c_bins: 2, c_bathroom: 0, c_floors: -1 } };
const people = [sam, alex, jo];
const wheel = ['p_sam', 'p_alex', 'p_jo'];
const chores = [
  { id: 'c_dishes', name: 'Dishes', weight: 2, repeat: 1 },
  { id: 'c_trash', name: 'Kitchen trash', weight: 2, repeat: 1 },
  { id: 'c_bins', name: 'Recycling & bins', weight: 1, repeat: 1 },
  { id: 'c_bathroom', name: 'Bathroom', weight: 3, repeat: 1 },
  { id: 'c_floors', name: 'Floors', weight: 2, repeat: 1 }
];

console.log('\nmod(x, m) — negative-safe modulo');
check('mod(0,3)=0', mod(0, 3) === 0);
check('mod(5,3)=2', mod(5, 3) === 2);
check('mod(-1,3)=2 (wheel wraps backwards)', mod(-1, 3) === 2);
check('mod(-7,3)=2', mod(-7, 3) === 2);

console.log('\nrotationAssignment — the joint rotation wheel');
eq('week 0: chores handed out round-robin from wheel start', rotationAssignment(wheel, ['c_dishes', 'c_trash'], 0), { c_dishes: 'p_sam', c_trash: 'p_alex' });
eq('week 1: every chore steps one place around the wheel', rotationAssignment(wheel, ['c_dishes', 'c_trash'], 1), { c_dishes: 'p_alex', c_trash: 'p_jo' });
eq('week 2: steps again', rotationAssignment(wheel, ['c_dishes'], 2), { c_dishes: 'p_jo' });
eq('week 3: full cycle returns to week-0 layout', rotationAssignment(wheel, ['c_dishes'], 3), { c_dishes: 'p_sam' });
const allWeeks = [0, 1, 2, 3, 4].map(w => rotationAssignment(wheel, ['c_dishes'], w).c_dishes);
eq('dishes holder cycles Sam->Alex->Jo->Sam->Alex', allWeeks, ['p_sam', 'p_alex', 'p_jo', 'p_sam', 'p_alex']);

const perWeek = [0, 1, 2].map(w => Object.values(rotationAssignment(wheel, ['a', 'b', 'c'], w)));
eq('every week with 3 chores/3 people uses each person exactly once',
  perWeek.map(x => x.slice().sort()), [['p_alex', 'p_jo', 'p_sam'], ['p_alex', 'p_jo', 'p_sam'], ['p_alex', 'p_jo', 'p_sam']]);

console.log('\nweeksSince — recency/fairness memory');
const log = [
  { id: 'l1', type: 'done', personId: 'p_sam', choreId: 'c_dishes', weekIndex: 2, date: '2026-01-01' },
  { id: 'l2', type: 'skip', personId: 'p_jo', choreId: 'c_bins', weekIndex: 3, date: '2026-01-08' }
];
check('Sam did dishes in week 2, so in week 4 it has been 2 weeks', weeksSince('c_dishes', 'p_sam', log, 4) === 2);
check('Sam did not do trash; capped at 4', weeksSince('c_trash', 'p_sam', log, 4) === 4);
check('Jo skipped bins in week 3; week 4 -> 1 week since', weeksSince('c_bins', 'p_jo', log, 4) === 1);
check('future lookups are capped, never negative', weeksSince('c_bathroom', 'p_alex', log, 1) === 4);

console.log('\nstrengthsAssignment — bad at dishes -> not dishes, good at bins -> bins');
const emptyLog = [];
const a0 = strengthsAssignment(wheel, people, chores, 0, emptyLog);
eq('Alex (+2 dishes) gets Dishes, not Sam (-2)', a0.c_dishes, 'p_alex');
eq('Jo (+2 bins) gets Recycling & bins', a0.c_bins, 'p_jo');
eq('Sam (good at bathroom) gets the big bathroom job', a0.c_bathroom, 'p_sam');
check('every chore is assigned to someone on the wheel',
  Object.values(a0).every(p => wheel.includes(p)));
eq('one person, all chores', strengthsAssignment(['p_sam'], [sam], chores, 0, []).c_trash, 'p_sam');

const a1 = strengthsAssignment(wheel, people, chores, 1, []);
eq('week 1: WHEEL UNUSED people get homework — recency also considered', a1.c_dishes, 'p_alex');
check('deterministic: same input twice -> same assignments',
  JSON.stringify(a1) === JSON.stringify(strengthsAssignment(wheel, people, chores, 1, [])));

const strongish = [{ id: 'p_x', name: 'X', skills: { c_w: 2, c_h: 0 } }, { id: 'p_y', name: 'Y', skills: { c_w: -2, c_h: 0 } }];
const strChores = [{ id: 'c_w', name: 'Windows', weight: 3 }, { id: 'c_h', name: 'Half-hour tidy', weight: 1 }];
const strA = strengthsAssignment(['p_x', 'p_y'], strongish, strChores, 0, []);
eq('dreaded chore goes to the person fine with it, comfortable chore to the other', strA, { c_w: 'p_x', c_h: 'p_y' });

console.log('\nscoreAssignment / bestSkillSwap — swap math');
const badAssignment = { c_dishes: 'p_sam', c_trash: 'p_alex', c_bathroom: 'p_alex' };
const goodAssignment = { c_dishes: 'p_alex', c_trash: 'p_sam', c_bathroom: 'p_sam' };
const sBad = scoreAssignment(badAssignment, people, chores.filter(c => ['c_dishes', 'c_trash', 'c_bathroom'].includes(c.id)));
const sGood = scoreAssignment(goodAssignment, people, chores.filter(c => ['c_dishes', 'c_trash', 'c_bathroom'].includes(c.id)));
check('strengths assignment scores strictly higher than mismatched assignment', sGood > sBad);

const alice = { id: 'p_a', name: 'A', skills: { c1: 2, c2: 1 } };
const bbe = { id: 'p_b', name: 'B', skills: { c1: -2, c2: -1 } };
const pairChores = [{ id: 'c1', name: 'C1', weight: 1 }, { id: 'c2', name: 'C2', weight: 1 }];
const pairAssign = { c1: 'p_a', c2: 'p_b' };
const noSwapProbe = bestSkillSwap(pairAssign, [alice, bbe], pairChores);
check('already-optimal assignment has no improving swap', noSwapProbe === null);
const reversed = { c1: 'p_b', c2: 'p_a' };
const fix = bestSkillSwap(reversed, [alice, bbe], pairChores);
check('mismatched 2-person assignment finds the improving swap', fix !== null);

const swap = bestSkillSwap(badAssignment, people, chores.filter(c => ['c_dishes', 'c_trash', 'c_bathroom'].includes(c.id)));
check('mismatched 3-chore assignment has an improving swap available', swap !== null);

const baseScore = scoreAssignment(badAssignment, people, chores.filter(c => ['c_dishes', 'c_trash', 'c_bathroom'].includes(c.id)));
const afterSwap = applyTrade(badAssignment, swap.choreA, swap.choreB);
check('applyTrade swaps exactly the two chosen people',
  afterSwap[swap.choreA] === badAssignment[swap.choreB] && afterSwap[swap.choreB] === badAssignment[swap.choreA] &&
  Object.keys(afterSwap).length === Object.keys(badAssignment).length);
check('bestSkillSwap\u2019s claimed gain matches reality',
  Math.abs((scoreAssignment(afterSwap, people, chores.filter(c => ['c_dishes', 'c_trash', 'c_bathroom'].includes(c.id))) - baseScore) - swap.gain) < 1e-9);
check('applyTrade does not mutate the original assignment',
  JSON.stringify(applyTrade(badAssignment, swap.choreA, swap.choreB)) !== JSON.stringify(badAssignment) &&
  badAssignment.c_dishes === 'p_sam');
check('applyTrade with the same chore id twice is harmless', JSON.stringify(applyTrade(badAssignment, 'c_trash', 'c_trash')) === JSON.stringify(badAssignment));

console.log('\napplyTrade + trade log record');
const t = makeTradeEntry('c_dishes', 'c_trash', 'p_sam', 'p_alex', 4, '2026-11-03', true);
check('trade entry records both chores and people', t.choreIdA === 'c_dishes' && t.choreIdB === 'c_trash' && t.personA === 'p_sam' && t.personB === 'p_alex');
check('traded-yesterday flag survives', t.tradedYesterday === true);

console.log('\ncomputeReview — done / skip / cover bookkeeping');
const wk1 = [
  { id: 'e1', type: 'done', personId: 'p_sam', choreId: 'c_bins', weekIndex: 1, date: '2026-01-01' },
  { id: 'e2', type: 'skip', personId: 'p_sam', choreId: 'c_trash', weekIndex: 1, date: '2026-01-02', note: 'rough day' },
  { id: 'e3', type: 'cover', personId: 'p_jo', choreId: 'c_trash', weekIndex: 1, date: '2026-01-03', skipEntryId: 'e2', coveredFor: 'p_sam' },
  { id: 'e4', type: 'trade', choreIdA: 'c_dishes', choreIdB: 'c_bins', personA: 'p_sam', personB: 'p_alex', weekIndex: 1, date: '2026-01-04', tradedYesterday: true }
];
const r1 = computeReview(wk1, 1, people, chores);
eq('Sam: 1 done logged, 1 skip, 1 trade (yesterday-flavoured)',
  { done: r1.stats.p_sam.done, skips: r1.stats.p_sam.skips, trades: r1.stats.p_sam.trades, yesterday: r1.stats.p_sam.yesterdayTrades },
  { done: 1, skips: 1, trades: 1, yesterday: 1 });
eq('Jo covered 1 chore and earned done-credit for it',
  { covers: r1.stats.p_jo.covers, done: r1.stats.p_jo.done, coveredFor: r1.stats.p_jo.coveredFor },
  { covers: 1, done: 1, coveredFor: ['p_sam'] });
eq('skip is fully covered -> no open skips left', r1.openSkips, []);
check('Jo listed as quiet hero', r1.heroes.length === 1 && r1.heroes[0].id === 'p_jo');

const wk2 = [{ id: 'f1', type: 'skip', personId: 'p_alex', choreId: 'c_bins', weekIndex: 2, date: '2026-01-09', note: '' }];
const r2 = computeReview(wk2, 2, people, chores);
eq('uncovered skip stays open with owner and chore', r2.openSkips.length === 1 && r2.openSkips[0].personId === 'p_alex' && r2.openSkips[0].choreId === 'c_bins', true);
const wk2b = wk2.concat([{ id: 'f2', type: 'cover', personId: 'p_sam', choreId: 'c_bins', weekIndex: 2, date: '2026-01-10', skipEntryId: 'f1', coveredFor: 'p_alex' }]);
const r2b = computeReview(wk2b, 2, people, chores);
eq('filing a cover closes the skip', r2b.openSkips, []);
check('reviews of different weeks do not mix', computeReview(wk1, 1, people, chores).stats.p_jo.covers === 1 && r2b.stats.p_jo.covers === 0);

console.log('\nweekLabel');
check('label is stable for week 0', weekLabel(0, '2026-11-03').includes('Nov 3'));
check('week 4 is 28 days later', weekLabel(4, '2026-11-03').includes('Dec 1'));

console.log('\n---------------------------------');
console.log(failed === 0
  ? 'ALL PASS: ' + passed + ' checks green.'
  : failed + ' FAILED, ' + passed + ' passed.');
process.exit(failed === 0 ? 0 : 1);
