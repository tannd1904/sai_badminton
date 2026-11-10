export interface PlayoffSlotInfo {
  label: string; // e.g. "Chưa xác định"
  note: string;  // e.g. "Nhất Bảng A (A1)"
  fullTitle: string; // e.g. "Chưa xác định (A1 - Nhất Bảng A)"
}

export function getPlayoffSlotInfo(matchCode: string, slot: 'A' | 'B', locale: string = 'vi'): PlayoffSlotInfo {
  const isVi = locale === 'vi';
  const undetermined = isVi ? 'Chưa xác định' : 'TBD';

  if (matchCode.includes('SF1')) {
    if (slot === 'A') {
      const note = isVi ? 'Nhất Bảng A (A1)' : 'Winner Group A (A1)';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    } else {
      const note = isVi ? 'Nhì Bảng B (B2)' : 'Runner-up Group B (B2)';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    }
  }

  if (matchCode.includes('SF2')) {
    if (slot === 'A') {
      const note = isVi ? 'Nhất Bảng B (B1)' : 'Winner Group B (B1)';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    } else {
      const note = isVi ? 'Nhì Bảng A (A2)' : 'Runner-up Group A (A2)';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    }
  }

  if (matchCode.includes('BRZ')) {
    if (slot === 'A') {
      const note = isVi ? 'Thua Bán Kết 1 (Loser SF1)' : 'Loser Semifinal 1';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    } else {
      const note = isVi ? 'Thua Bán Kết 2 (Loser SF2)' : 'Loser Semifinal 2';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    }
  }

  if (matchCode.includes('FIN')) {
    if (slot === 'A') {
      const note = isVi ? 'Thắng Bán Kết 1 (Winner SF1)' : 'Winner Semifinal 1';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    } else {
      const note = isVi ? 'Thắng Bán Kết 2 (Winner SF2)' : 'Winner Semifinal 2';
      return { label: undetermined, note, fullTitle: `${undetermined} (${note})` };
    }
  }

  return { label: undetermined, note: '', fullTitle: undetermined };
}

