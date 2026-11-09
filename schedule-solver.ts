// Schedule Solver: Finds a conflict-free schedule for 24 group matches across Court 1, 2, 3
// where no player in Pool 1 plays concurrently or within 10 minutes buffer.

const p1Map: Record<string, string> = {
  XD1: 'Tuyển', XD2: 'Duy Tân', XD3: 'Trọng Nghĩa', XD4: 'Tuấn Kiên',
  XD5: 'Hoàng Linh', XD6: 'Quốc Toản', XD7: 'Xuân Việt', XD8: 'Cường',
  MD1: 'Quốc Toản', MD2: 'Duy Tân', MD3: 'Trọng Nghĩa', MD4: 'Tuấn Kiên',
  MD5: 'Hoàng Linh', MD6: 'Tuyển', MD7: 'Xuân Việt', MD8: 'Cường'
};

const xdA = [['XD4','XD2'],['XD6','XD8'],['XD4','XD6'],['XD2','XD8'],['XD4','XD8'],['XD2','XD6']];
const xdB = [['XD3','XD5'],['XD1','XD7'],['XD3','XD1'],['XD5','XD7'],['XD3','XD7'],['XD5','XD1']];
const mdA = [['MD5','MD2'],['MD8','MD1'],['MD5','MD8'],['MD2','MD1'],['MD5','MD1'],['MD2','MD8']];
const mdB = [['MD3','MD4'],['MD6','MD7'],['MD3','MD6'],['MD4','MD7'],['MD3','MD7'],['MD4','MD6']];

interface MatchItem {
  id: string;
  code: string;
  cat: string;
  teamA: string;
  teamB: string;
  players: string[];
}

let idCounter = 1;
const matches: MatchItem[] = [];

xdA.forEach((p, i) => matches.push({
  id: `M-XD-${String(i+1).padStart(2,'0')}`,
  code: `M-XD-${String(i+1).padStart(2,'0')}`,
  cat: 'XD',
  teamA: p[0],
  teamB: p[1],
  players: [p1Map[p[0]], p1Map[p[1]]],
}));

xdB.forEach((p, i) => matches.push({
  id: `M-XD-${String(i+7).padStart(2,'0')}`,
  code: `M-XD-${String(i+7).padStart(2,'0')}`,
  cat: 'XD',
  teamA: p[0],
  teamB: p[1],
  players: [p1Map[p[0]], p1Map[p[1]]],
}));

mdA.forEach((p, i) => matches.push({
  id: `M-MD-${String(i+1).padStart(2,'0')}`,
  code: `M-MD-${String(i+1).padStart(2,'0')}`,
  cat: 'MD',
  teamA: p[0],
  teamB: p[1],
  players: [p1Map[p[0]], p1Map[p[1]]],
}));

mdB.forEach((p, i) => matches.push({
  id: `M-MD-${String(i+7).padStart(2,'0')}`,
  code: `M-MD-${String(i+7).padStart(2,'0')}`,
  cat: 'MD',
  teamA: p[0],
  teamB: p[1],
  players: [p1Map[p[0]], p1Map[p[1]]],
}));

// Backtracking solver to place 24 matches into slots (each slot has 3 courts)
// Rule: In any slot, all 3 matches must have disjoint players (no player plays twice in same slot).
// AND a player playing in slot S cannot play in slot S+1 (at least 1 full slot gap = >=25m buffer >= 10m).
const slots: { slotIndex: number; matches: MatchItem[] }[] = [];
for (let s = 0; s < 10; s++) {
  slots.push({ slotIndex: s, matches: [] });
}

function solve(matchIdx: number): boolean {
  if (matchIdx >= matches.length) return true;
  const m = matches[matchIdx];

  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s];
    if (slot.matches.length >= 3) continue; // court 1, 2, 3 capacity

    // Check same slot conflict
    const playersInSlot = slot.matches.flatMap(item => item.players);
    const hasOverlap = m.players.some(p => playersInSlot.includes(p));
    if (hasOverlap) continue;

    // Check adjacent slot buffer (<10 min rule: cannot play in slot s-1 or s+1)
    const prevPlayers = s > 0 ? slots[s - 1].matches.flatMap(item => item.players) : [];
    const nextPlayers = s < slots.length - 1 ? slots[s + 1].matches.flatMap(item => item.players) : [];

    if (m.players.some(p => prevPlayers.includes(p) || nextPlayers.includes(p))) {
      continue;
    }

    slot.matches.push(m);
    if (solve(matchIdx + 1)) return true;
    slot.matches.pop();
  }

  return false;
}

const success = solve(0);
console.log('Solver success:', success);

if (success) {
  const result: any[] = [];
  slots.forEach((s) => {
    s.matches.forEach((m, courtIdx) => {
      result.push({
        matchCode: m.code,
        category: m.cat,
        courtNumber: courtIdx + 1,
        teamACode: m.teamA,
        teamBCode: m.teamB,
        slot: s.slotIndex,
      });
    });
  });
  console.log(JSON.stringify(result, null, 2));
}
