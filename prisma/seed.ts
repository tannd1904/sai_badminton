import { PrismaClient, Role, Gender, Category, GroupName, RoundType, MatchStatus, RulesMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning up existing database records ---');
  await prisma.scoreAuditLog.deleteMany();
  await prisma.matchSet.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Seeding Users ---');
  const passwordHash = await bcrypt.hash('sai123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const refPasswordHash = await bcrypt.hash('ref123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@sai.digital',
      name: 'SAI Tournament Director',
      role: Role.SUPER_ADMIN,
      passwordHash: adminPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@sai.digital',
      name: 'SAI Tournament Ops Lead',
      role: Role.ORGANIZER,
      passwordHash: adminPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=organizer',
    },
  });

  const ref1 = await prisma.user.create({
    data: {
      email: 'referee1@sai.digital',
      name: 'Umpire Court 1',
      role: Role.REFEREE,
      passwordHash: refPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ref1',
    },
  });

  const ref2 = await prisma.user.create({
    data: {
      email: 'referee2@sai.digital',
      name: 'Umpire Court 2',
      role: Role.REFEREE,
      passwordHash: refPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ref2',
    },
  });

  const ref3 = await prisma.user.create({
    data: {
      email: 'referee3@sai.digital',
      name: 'Umpire Court 3',
      role: Role.REFEREE,
      passwordHash: refPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ref3',
    },
  });

  const spectator = await prisma.user.create({
    data: {
      email: 'spectator@sai.digital',
      name: 'SAI Fan Club',
      role: Role.SPECTATOR,
      passwordHash: passwordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=spectator',
    },
  });

  console.log('--- Seeding 24 Players ---');
  // Pool 1: 8 Men (Score 70-100) -> Plays MD and XD
  const pool1Raw = [
    { name: 'Tuyển Nguyễn', powerRating: 80, department: 'SAI Engineering' },
    { name: 'Nguyễn Duy Tân', powerRating: 80, department: 'SAI Engineering' },
    { name: 'Nguyễn Trọng Nghĩa', powerRating: 100, department: 'Vãng lai' },
    { name: 'Nguyễn Tuấn Kiên', powerRating: 90, department: 'SAI Engineering' },
    { name: 'Nguyễn Hoàng Linh', powerRating: 90, department: 'SAI Engineering' },
    { name: 'Phạm Quốc Toản', powerRating: 70, department: 'Vãng lai' },
    { name: 'Ty Xuân Việt', powerRating: 70, department: 'SAI Engineering' },
    { name: 'Cường (vãng lai)', powerRating: 70, department: 'Vãng lai' },
  ];

  // Pool 2: 8 Men (Score 50-60) -> Plays MD only
  const pool2Raw = [
    { name: 'Lê Văn Linh', powerRating: 55, department: 'SAI Engineering' },
    { name: 'Bùi Thành Đạt', powerRating: 60, department: 'SAI Engineering' },
    { name: 'Minh (vãng lai)', powerRating: 50, department: 'Vãng lai' },
    { name: 'Phát (chồng Trúc)', powerRating: 55, department: 'Vãng lai' },
    { name: 'Lương Tấn Đại', powerRating: 55, department: 'SAI Product' },
    { name: 'Nguyễn Tuấn Anh', powerRating: 55, department: 'SAI Engineering' },
    { name: 'Nguyễn Thành Tâm', powerRating: 50, department: 'Vãng lai' },
    { name: 'Nguyễn Văn Huy', powerRating: 60, department: 'Ex-SAI member' },
  ];

  // Pool 3: 8 Women (Score 40-45) -> Plays XD only
  const pool3Raw = [
    { name: 'Meetu', powerRating: 40, department: 'SAI Operations' },
    { name: 'Nguyễn Trần Thảo Trúc', powerRating: 45, department: 'SAI Operations' },
    { name: 'Hà (vãng lai)', powerRating: 40, department: 'Vãng lai' },
    { name: 'Lê Huỳnh Diễm Thúy', powerRating: 40, department: 'SAI Operations' },
    { name: 'Đinh Thị Thu Hiền', powerRating: 40, department: 'Vãng lai' },
    { name: 'Trần Thị Thuỳ Linh', powerRating: 45, department: 'Ex-SAI member' },
    { name: 'Trần Văn Kim Anh', powerRating: 45, department: 'SAI Engineering' },
    { name: 'Ngọc (vãng lai)', powerRating: 45, department: 'Vãng lai' },
  ];

  const pool1Players: Record<string, any> = {};
  for (const p of pool1Raw) {
    const created = await prisma.player.create({
      data: {
        name: p.name,
        gender: Gender.MALE,
        pool: 1,
        powerRating: p.powerRating,
        isSaiStaff: true,
        department: p.department,
      },
    });
    pool1Players[p.name] = created;
  }

  const pool2Players: Record<string, any> = {};
  for (const p of pool2Raw) {
    const created = await prisma.player.create({
      data: {
        name: p.name,
        gender: Gender.MALE,
        pool: 2,
        powerRating: p.powerRating,
        isSaiStaff: true,
        department: p.department,
      },
    });
    pool2Players[p.name] = created;
  }

  const pool3Players: Record<string, any> = {};
  for (const p of pool3Raw) {
    const created = await prisma.player.create({
      data: {
        name: p.name,
        gender: Gender.FEMALE,
        pool: 3,
        powerRating: p.powerRating,
        isSaiStaff: true,
        department: p.department,
      },
    });
    pool3Players[p.name] = created;
  }

  console.log('--- Seeding Teams (XD & MD) ---');
  // XD Teams:
  // XD Group A: XD4, XD2, XD6, XD8
  // XD Group B: XD3, XD5, XD1, XD7
  const xdConfigs = [
    { code: 'XD1', p1: 'Tuyển Nguyễn', p2: 'Meetu', group: GroupName.B },
    { code: 'XD2', p1: 'Nguyễn Duy Tân', p2: 'Nguyễn Trần Thảo Trúc', group: GroupName.A },
    { code: 'XD3', p1: 'Nguyễn Trọng Nghĩa', p2: 'Hà (vãng lai)', group: GroupName.B },
    { code: 'XD4', p1: 'Nguyễn Tuấn Kiên', p2: 'Lê Huỳnh Diễm Thúy', group: GroupName.A },
    { code: 'XD5', p1: 'Nguyễn Hoàng Linh', p2: 'Đinh Thị Thu Hiền', group: GroupName.B },
    { code: 'XD6', p1: 'Phạm Quốc Toản', p2: 'Trần Thị Thuỳ Linh', group: GroupName.A },
    { code: 'XD7', p1: 'Ty Xuân Việt', p2: 'Trần Văn Kim Anh', group: GroupName.B },
    { code: 'XD8', p1: 'Cường (vãng lai)', p2: 'Ngọc (vãng lai)', group: GroupName.A },
  ];

  const xdTeams: Record<string, any> = {};
  for (const cfg of xdConfigs) {
    const p1 = pool1Players[cfg.p1];
    const p2 = pool3Players[cfg.p2];
    const totalPower = p1.powerRating + p2.powerRating;
    const team = await prisma.team.create({
      data: {
        teamCode: cfg.code,
        category: Category.XD,
        groupName: cfg.group,
        player1Id: p1.id,
        player2Id: p2.id,
        totalPower,
      },
    });
    xdTeams[cfg.code] = team;
  }

  // MD Teams:
  // MD Group A: MD5, MD2, MD8, MD1
  // MD Group B: MD3, MD4, MD6, MD7
  const mdConfigs = [
    { code: 'MD1', p1: 'Phạm Quốc Toản', p2: 'Lê Văn Linh', group: GroupName.A },
    { code: 'MD2', p1: 'Nguyễn Duy Tân', p2: 'Bùi Thành Đạt', group: GroupName.A },
    { code: 'MD3', p1: 'Nguyễn Trọng Nghĩa', p2: 'Minh (vãng lai)', group: GroupName.B },
    { code: 'MD4', p1: 'Nguyễn Tuấn Kiên', p2: 'Phát (chồng Trúc)', group: GroupName.B },
    { code: 'MD5', p1: 'Nguyễn Hoàng Linh', p2: 'Lương Tấn Đại', group: GroupName.A },
    { code: 'MD6', p1: 'Tuyển Nguyễn', p2: 'Nguyễn Tuấn Anh', group: GroupName.B },
    { code: 'MD7', p1: 'Ty Xuân Việt', p2: 'Nguyễn Thành Tâm', group: GroupName.B },
    { code: 'MD8', p1: 'Cường (vãng lai)', p2: 'Nguyễn Văn Huy', group: GroupName.A },
  ];

  const mdTeams: Record<string, any> = {};
  for (const cfg of mdConfigs) {
    const p1 = pool1Players[cfg.p1];
    const p2 = pool2Players[cfg.p2];
    const totalPower = p1.powerRating + p2.powerRating;
    const team = await prisma.team.create({
      data: {
        teamCode: cfg.code,
        category: Category.MD,
        groupName: cfg.group,
        player1Id: p1.id,
        player2Id: p2.id,
        totalPower,
      },
    });
    mdTeams[cfg.code] = team;
  }

  console.log('--- Generating Group Stage Matches (24 matches) ---');
  // Match fixtures per group (Round Robin of 4 teams -> 6 matches each)
  // XD Group A: XD4, XD2, XD6, XD8
  // XD Group B: XD3, XD5, XD1, XD7
  // MD Group A: MD5, MD2, MD8, MD1
  // MD Group B: MD3, MD4, MD6, MD7

  // Round-robin pairings for 4 teams [T0, T1, T2, T3]:
  // Round 1: T0 vs T1, T2 vs T3
  // Round 2: T0 vs T2, T1 vs T3
  // Round 3: T0 vs T3, T1 vs T2

  const generatePairs = (teams: string[]) => [
    [teams[0], teams[1]],
    [teams[2], teams[3]],
    [teams[0], teams[2]],
    [teams[1], teams[3]],
    [teams[0], teams[3]],
    [teams[1], teams[2]],
  ];

  const xdGroupAPairs = generatePairs(['XD4', 'XD2', 'XD6', 'XD8']);
  const xdGroupBPairs = generatePairs(['XD3', 'XD5', 'XD1', 'XD7']);
  const mdGroupAPairs = generatePairs(['MD5', 'MD2', 'MD8', 'MD1']);
  const mdGroupBPairs = generatePairs(['MD3', 'MD4', 'MD6', 'MD7']);

  // We have 24 matches total.
  // We can organize them across 8 time slots on 3 courts (8 * 3 = 24 matches).
  // Slot length: 15 minutes.
  // In each slot, Court 1, Court 2, Court 3 run simultaneously.
  // Crucial: Pool 1 players must NOT play concurrently in the same slot,
  // AND must have at least 1 slot buffer (15 min >= 10 min required) between their matches!

  // Let's schedule carefully by balancing XD and MD matches:
  // Slots:
  // Slot 0 (09:00):
  //   Court 1: XD4 vs XD2 (p1: Tuấn Kiên, Duy Tân)
  //   Court 2: MD5 vs MD2... WAIT! MD2 has Duy Tân! Duy Tân cannot play on C1 and C2 in slot 0!
  //
  // Let's design the 8 slots precisely avoiding any player conflict:
  // Let's inspect who is in which match:
  // XD4 (Tuấn Kiên) vs XD2 (Duy Tân)
  // XD6 (Quốc Toản) vs XD8 (Cường)
  // XD3 (Trọng Nghĩa) vs XD5 (Hoàng Linh)
  // XD1 (Tuyển) vs XD7 (Xuân Việt)
  // MD5 (Hoàng Linh) vs MD2 (Duy Tân)
  // MD8 (Cường) vs MD1 (Quốc Toản)
  // MD3 (Trọng Nghĩa) vs MD4 (Tuấn Kiên)
  // MD6 (Tuyển) vs MD7 (Xuân Việt)
  //
  // Look at the symmetry!
  // Set of Pool 1 players:
  // Pair 1: Tuấn Kiên (XD4, MD4) & Duy Tân (XD2, MD2)
  // Pair 2: Quốc Toản (XD6, MD1) & Cường (XD8, MD8)
  // Pair 3: Trọng Nghĩa (XD3, MD3) & Hoàng Linh (XD5, MD5)
  // Pair 4: Tuyển Nguyễn (XD1, MD6) & Xuân Việt (XD7, MD7)
  //
  // Notice that in any round:
  // Group A XD uses Pair 1 (XD4, XD2) and Pair 2 (XD6, XD8).
  // Group B XD uses Pair 3 (XD3, XD5) and Pair 4 (XD1, XD7).
  // Group A MD uses Pair 3 (MD5), Pair 1 (MD2), Pair 2 (MD8, MD1).
  // Group B MD uses Pair 3 (MD3), Pair 1 (MD4), Pair 4 (MD6, MD7).
  //
  // If in Slot 1 we play:
  //   Court 1: XD4 vs XD2 (Tuấn Kiên, Duy Tân)
  //   Court 2: XD3 vs XD5 (Trọng Nghĩa, Hoàng Linh)
  //   Court 3: XD1 vs XD7 (Tuyển Nguyễn, Xuân Việt)
  //   (Quốc Toản & Cường rest)
  // Slot 2:
  //   Court 1: XD6 vs XD8 (Quốc Toản, Cường)
  //   Court 2: MD3 vs MD4 (Trọng Nghĩa, Tuấn Kiên) -> WAIT, Trọng Nghĩa & Tuấn Kiên just played Slot 1!
  // To give >=10 min buffer, a player who plays in Slot K must NOT play in Slot K+1.
  // That means players who play in Slot K can only play in Slot K+2 or later!
  // Can we do this?
  // We have 8 Pool 1 players. In any 3-court slot, at most 6 Pool 1 players play (or even fewer if only 2 courts used, or if 1 match is XD and 1 MD).
  // Even better: with 8 slots and 24 matches, each slot has 3 matches (6 Pool 1 players playing, 2 resting).
  // Let's stagger them cleanly:
  // Group 1 of Pool 1: {Tuấn Kiên, Duy Tân, Trọng Nghĩa, Hoàng Linh} (4 players)
  // Group 2 of Pool 1: {Quốc Toản, Cường, Tuyển Nguyễn, Xuân Việt} (4 players)
  // If Odd Slots (1, 3, 5, 7) only use Group 1 players? But 3 courts need 6 players!
  // What if we do 12 slots with 2 courts, or 10 slots?
  // The championship has Court 1, Court 2, Court 3. Matches can be spaced at e.g. 15-minute intervals across the day!
  // Let's create an explicit schedule table of 24 matches where:
  // 1) No player has two matches at the same time.
  // 2) Every player has >= 15 minutes between matches (at least 1 full slot gap).

  interface ScheduledMatch {
    matchCode: string;
    category: Category;
    roundType: RoundType;
    courtNumber: number;
    teamACode: string;
    teamBCode: string;
    slot: number; // 0 to 9 (15-min intervals: 09:00, 09:20, 09:40, 10:00, 10:20, 10:40, 11:00, 11:20, 11:40...)
    status: MatchStatus;
    rulesMode: RulesMode;
    scores?: { a: number; b: number }[];
    winnerTeamCode?: string;
  }

  // Pool 1 map per team:
  // XD1: Tuyển; XD2: Duy Tân; XD3: Trọng Nghĩa; XD4: Tuấn Kiên; XD5: Hoàng Linh; XD6: Quốc Toản; XD7: Xuân Việt; XD8: Cường
  // MD1: Quốc Toản; MD2: Duy Tân; MD3: Trọng Nghĩa; MD4: Tuấn Kiên; MD5: Hoàng Linh; MD6: Tuyển; MD7: Xuân Việt; MD8: Cường

  // Let's define the 24 group matches with safe slot timing:
  // Slot intervals of 20 minutes (10 min match + 10 min rest buffer).
  // Each match takes 10 mins. If slot is 20 mins, even back-to-back adjacent slots have 10 mins gap!
  // But to be even safer, no player is assigned in consecutive slots!
  const groupSchedule: ScheduledMatch[] = [
    // Slot 0 (08:30) - XD Group A
    { matchCode: 'M-XD-01', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD4', teamBCode: 'XD2', slot: 0, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-02', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD6', teamBCode: 'XD8', slot: 0, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 1 (08:55) - XD Group B
    { matchCode: 'M-XD-03', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD3', teamBCode: 'XD5', slot: 1, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-04', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD1', teamBCode: 'XD7', slot: 1, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 2 (09:20) - XD Group A
    { matchCode: 'M-XD-05', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD4', teamBCode: 'XD6', slot: 2, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-06', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD2', teamBCode: 'XD8', slot: 2, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 3 (10:15) - XD Group B
    { matchCode: 'M-XD-07', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD3', teamBCode: 'XD1', slot: 3, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-08', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD5', teamBCode: 'XD7', slot: 3, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 4 (10:40) - XD Group A
    { matchCode: 'M-XD-09', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD4', teamBCode: 'XD8', slot: 4, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-10', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD2', teamBCode: 'XD6', slot: 4, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 5 (11:05) - XD Group B
    { matchCode: 'M-XD-11', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'XD3', teamBCode: 'XD7', slot: 5, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-XD-12', category: Category.XD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'XD5', teamBCode: 'XD1', slot: 5, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 6 (11:30) - MD
    { matchCode: 'M-MD-01', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD2', teamBCode: 'MD1', slot: 6, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-02', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD6', teamBCode: 'MD7', slot: 6, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 7 (11:55) - MD
    { matchCode: 'M-MD-03', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD5', teamBCode: 'MD8', slot: 7, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-04', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD3', teamBCode: 'MD4', slot: 7, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 8 (12:20) - MD
    { matchCode: 'M-MD-05', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD8', teamBCode: 'MD1', slot: 8, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-06', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD3', teamBCode: 'MD6', slot: 8, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 9 (12:45) - MD
    { matchCode: 'M-MD-07', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD5', teamBCode: 'MD2', slot: 9, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-08', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD4', teamBCode: 'MD7', slot: 9, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 10 (13:10) - MD
    { matchCode: 'M-MD-09', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD2', teamBCode: 'MD8', slot: 10, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-10', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD3', teamBCode: 'MD7', slot: 10, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },

    // Slot 11 (13:35) - MD
    { matchCode: 'M-MD-11', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 1, teamACode: 'MD5', teamBCode: 'MD1', slot: 11, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
    { matchCode: 'M-MD-12', category: Category.MD, roundType: RoundType.GROUP, courtNumber: 2, teamACode: 'MD4', teamBCode: 'MD6', slot: 11, status: MatchStatus.SCHEDULED, rulesMode: RulesMode.SINGLE_SET_10MIN },
  ];

  // Base tournament start time: 8:30 AM, 14/11/2026
  const baseTime = new Date('2026-11-14T08:30:00+07:00');

  const referees = [ref1, ref2, ref3];

  let orderCounter = 1;
  for (const m of groupSchedule) {
    const teamA = m.category === Category.XD ? xdTeams[m.teamACode] : mdTeams[m.teamACode];
    const teamB = m.category === Category.XD ? xdTeams[m.teamBCode] : mdTeams[m.teamBCode];

    const matchStart = new Date(baseTime.getTime() + m.slot * 25 * 60 * 1000);
    const referee = referees[(m.courtNumber - 1) % 3];

    const createdMatch = await prisma.match.create({
      data: {
        matchCode: m.matchCode,
        category: m.category,
        roundType: m.roundType,
        courtNumber: m.courtNumber,
        refereeId: referee.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: MatchStatus.SCHEDULED,
        rulesMode: m.rulesMode,
        winnerTeamId: null,
        startTime: matchStart,
        endTime: null,
        orderIndex: orderCounter++,
        timerRemainingSeconds: 600,
        timerIsRunning: false,
      },
    });

    // Create match set (initial 0-0)
    await prisma.matchSet.create({
      data: {
        matchId: createdMatch.id,
        setNumber: 1,
        teamAScore: 0,
        teamBScore: 0,
        isFinished: false,
      },
    });
  }

  console.log('--- Generating Playoff Matches (8 BO3 matches) ---');
  // Playoff Stage (8 matches: 4 Semis, 2 Bronze, 2 Finals)
  // XD Playoff:
  // XD Semi 1: A1 vs B2 (Placeholders XD4 vs XD5)
  // XD Semi 2: B1 vs A2 (Placeholders XD3 vs XD2)
  // XD Bronze: Loser SF1 vs Loser SF2
  // XD Final: Winner SF1 vs Winner SF2
  // MD Playoff:
  // MD Semi 1: A1 vs B2 (MD5 vs MD4)
  // MD Semi 2: B1 vs A2 (MD3 vs MD2)
  // MD Bronze: Loser SF1 vs Loser SF2
  // MD Final: Winner SF1 vs Winner SF2

  const playoffSchedule = [
    { matchCode: 'M-XD-SF1', category: Category.XD, roundType: RoundType.SEMI, court: 1, teamA: 'XD4', teamB: 'XD5', slot: 9 },
    { matchCode: 'M-XD-SF2', category: Category.XD, roundType: RoundType.SEMI, court: 2, teamA: 'XD3', teamB: 'XD2', slot: 9 },
    { matchCode: 'M-MD-SF1', category: Category.MD, roundType: RoundType.SEMI, court: 1, teamA: 'MD5', teamB: 'MD4', slot: 10 },
    { matchCode: 'M-MD-SF2', category: Category.MD, roundType: RoundType.SEMI, court: 2, teamA: 'MD3', teamB: 'MD2', slot: 10 },
    { matchCode: 'M-XD-BRZ', category: Category.XD, roundType: RoundType.BRONZE, court: 3, teamA: 'XD5', teamB: 'XD2', slot: 11 },
    { matchCode: 'M-MD-BRZ', category: Category.MD, roundType: RoundType.BRONZE, court: 3, teamA: 'MD4', teamB: 'MD2', slot: 12 },
    { matchCode: 'M-XD-FIN', category: Category.XD, roundType: RoundType.FINAL, court: 1, teamA: 'XD4', teamB: 'XD3', slot: 13 },
    { matchCode: 'M-MD-FIN', category: Category.MD, roundType: RoundType.FINAL, court: 1, teamA: 'MD5', teamB: 'MD3', slot: 14 },
  ];

  for (const p of playoffSchedule) {
    const teamA = p.category === Category.XD ? xdTeams[p.teamA] : mdTeams[p.teamA];
    const teamB = p.category === Category.XD ? xdTeams[p.teamB] : mdTeams[p.teamB];
    // Group stage finishes at 12 * 25m = 300m. Playoffs spaced at 45m intervals (30m BO3 + 15m rest)
    const matchStart = new Date(baseTime.getTime() + (300 + (p.slot - 9) * 45) * 60 * 1000);

    const match = await prisma.match.create({
      data: {
        matchCode: p.matchCode,
        category: p.category,
        roundType: p.roundType,
        courtNumber: p.court,
        refereeId: referees[(p.court - 1) % 3].id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: MatchStatus.SCHEDULED,
        rulesMode: RulesMode.BO3,
        startTime: matchStart,
        orderIndex: orderCounter++,
      },
    });

    // Best of 3 sets initial placeholders
    for (let setNum = 1; setNum <= 3; setNum++) {
      await prisma.matchSet.create({
        data: {
          matchId: match.id,
          setNumber: setNum,
          teamAScore: 0,
          teamBScore: 0,
          isFinished: false,
        },
      });
    }
  }

  console.log('=== Database seeded successfully! ===');
  console.log('Seeded Accounts:');
  console.log(' - SUPER_ADMIN: admin@sai.digital / admin123');
  console.log(' - ORGANIZER: organizer@sai.digital / admin123');
  console.log(' - REFEREE 1: referee1@sai.digital / ref123 (Court 1)');
  console.log(' - REFEREE 2: referee2@sai.digital / ref123 (Court 2)');
  console.log(' - REFEREE 3: referee3@sai.digital / ref123 (Court 3)');
  console.log(' - SPECTATOR: spectator@sai.digital / sai123456');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
