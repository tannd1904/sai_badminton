'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'vi' | 'en';

export const translations = {
  vi: {
    // Navbar
    'nav.liveCourts': 'Trực tiếp các sân',
    'nav.tvScoreboard': 'Màn hình TV',
    'nav.standings': 'Bảng xếp hạng & Nhánh đấu',
    'nav.referee': 'Bảng điểm Trọng tài',
    'nav.organizer': 'Ban tổ chức',
    'nav.login': 'Đăng nhập',
    'nav.logout': 'Đăng xuất',
    'nav.role': 'Vai trò',
    'nav.soundOn': 'Bật âm thanh',
    'nav.soundOff': 'Tắt âm thanh',
    'nav.connected': 'Đã kết nối',
    'nav.connecting': 'Đang kết nối',
    'nav.subTitle': 'Hệ thống Quản lý Giải Cầu lông SAI Digital',

    // Home / Live Courts
    'home.broadcastCenter': 'TRUNG TÂM PHÁT SÓNG TRỰC TIẾP',
    'home.title': 'Giải Cầu Lông SAI Badminton Championship 2026',
    'home.description': 'Khai mạc ngày 14/11/2026. 24 Vận động viên thuộc 3 Nhóm (Pool 1, 2 & 3) tranh tài ở 2 nội dung Đôi Nam Nữ (XD) và Đôi Nam (MD).',
    'home.metric.live': 'Đang thi đấu',
    'home.metric.completed': 'Đã kết thúc',
    'home.metric.upcoming': 'Sắp diễn ra',
    'home.matches': 'Trận',
    'home.filter.category': 'Nội dung:',
    'home.filter.all': 'Tất cả nội dung',
    'home.filter.xd': 'Đôi Nam Nữ (XD)',
    'home.filter.md': 'Đôi Nam (MD)',
    'home.btn.viewStandings': 'Xem BXH & Nhánh đấu',
    'home.btn.refresh': 'Làm mới tỉ số',
    'home.table.title': 'Danh sách toàn bộ các trận đấu & Tiến trình thi đấu',
    'home.table.totalMatches': 'trận đấu đăng ký',
    'home.table.code': 'Mã Trận',
    'home.table.court': 'Sân',
    'home.table.category': 'Nội Dung',
    'home.table.round': 'Vòng',
    'home.table.teamA': 'Đội A (VĐV)',
    'home.table.score': 'Tỉ Số',
    'home.table.teamB': 'Đội B (VĐV)',
    'home.table.status': 'Trạng Thái',
    'home.table.winner': 'Đội Thắng',

    // Court Card
    'court.arena': 'Nhà thi đấu SAI Digital',
    'court.idle': 'Sân đang trống',
    'court.noActiveMatch': 'Hiện không có trận đấu nào trên Sân',
    'court.umpire': 'Trọng tài:',
    'court.assigned': 'Được phân công',
    'court.winner': 'Thắng cuộc:',
    'court.singleSet': '1 Set 21 Điểm',
    'court.set': 'Set',
    'court.onDeckTitle': '⚡ Trận tiếp theo · VĐV chuẩn bị ra sân',

    // Standings & Brackets
    'standings.title': 'Bảng Xếp Hạng & Sơ Đồ Nhánh Đấu',
    'standings.subtitle': 'Cập nhật trực tiếp điểm số, hiệu số set, hiệu số điểm và sơ đồ loại trực tiếp (Bán kết & Chung kết).',
    'standings.tab.xd': 'Đôi Nam Nữ (XD)',
    'standings.tab.md': 'Đôi Nam (MD)',
    'standings.roster.title': '1. Bảng ghép cặp toàn bộ 8 đội',
    'standings.roster.code': 'Mã cặp',
    'standings.roster.male1': 'VĐV Nam (Pool 1)',
    'standings.roster.male1_md': 'VĐV Nam 1 (Pool 1)',
    'standings.roster.female': 'VĐV Nữ (Pool 3)',
    'standings.roster.male2_md': 'VĐV Nam 2 (Pool 2)',
    'standings.roster.totalPower': 'Tổng điểm',
    'standings.group.top2': 'Top 2 mỗi bảng vào Bán kết',
    'standings.table.pos': 'Hạng',
    'standings.table.team': 'Cặp Đấu & VĐV',
    'standings.table.played': 'Trận',
    'standings.table.won': 'Thắng',
    'standings.table.lost': 'Thua',
    'standings.table.setDiff': 'Hiệu số Set',
    'standings.table.ptDiff': 'Hiệu số Điểm',
    'standings.table.points': 'Điểm',
    'standings.playoff.title': 'Sơ Đồ Thi Đấu Vòng Loại Trực Tiếp (Playoffs BO3)',
    'standings.playoff.semi1': 'BÁN KẾT 1 (SF1)',
    'standings.playoff.semi2': 'BÁN KẾT 2 (SF2)',
    'standings.playoff.bronze': 'TRANH HẠNG 3 (BRONZE)',
    'standings.playoff.final': 'CHUNG KẾT VÔ ĐỊCH (FINAL)',
    'standings.playoff.champion': 'VÔ ĐỊCH',

    // Referee
    'referee.court': 'Sân',
    'referee.stopwatchTitle': 'Thời gian thi đấu (Match Stopwatch)',
    'referee.start': 'Bắt đầu',
    'referee.pause': 'Tạm dừng',
    'referee.reset': 'Đặt lại (00:00)',
    'referee.addPoint': '+1 ĐIỂM',
    'referee.undo': 'Undo (-1)',
    'referee.instantUndo': 'Hoàn tác nhanh',
    'referee.switchCourt': 'Đổi sân',
    'referee.finishMatch': 'Kết thúc trận đấu',
    'referee.auditLog': 'Lịch sử ghi điểm',
    'referee.sideLeft': 'Sân Trái',
    'referee.sideRight': 'Sân Phải',
    'referee.verifyTitle': 'Xác Nhận Kết Quả Trận Đấu',
    'referee.verifySubtitle': 'Xác nhận cặp đấu chiến thắng cho mã trận',
    'referee.verifyDuration': 'Thời lượng trận đấu (Duration):',
    'referee.verifyPrompt': 'Vui lòng xác minh tỉ số và chọn cặp vận động viên chiến thắng để lưu thời gian và phát trực tiếp kết quả:',
    'referee.confirmWinner': 'Xác nhận Thắng',
    'referee.cancel': 'Hủy',

    // TV
    'tv.title': 'Bảng Điểm Màn Hình TV - SAI Arena',
    'tv.fullscreen': 'Toàn màn hình',
    'tv.exitFullscreen': 'Thoát toàn màn hình',
    'tv.allCourts': 'Tất cả các sân',

    // Admin
    'admin.title': 'Trung Tâm Điều Hành Giải Đấu (Operations Center)',
    'admin.subtitle': 'Tự động kiểm tra trùng lịch, quản lý VĐV & cặp đấu, cấu hình sân và ghi đè điểm khẩn cấp',
    'admin.tab.schedule': 'Sắp xếp Sân & Lịch đấu',
    'admin.tab.athletes': 'Quản lý Vận động viên',
    'admin.tab.pairs': 'Sắp lại Cặp đấu',
    'admin.tab.override': 'Ghi đè điểm khẩn cấp',
    'admin.tab.webhook': 'Thông báo Webhook',
    'admin.exportCsv': 'Xuất CSV',
    'admin.advanceXd': 'Đẩy BK XD',
    'admin.advanceMd': 'Đẩy BK MD',
    'admin.refresh': 'Làm mới',
    'admin.resetScores': 'Đặt lại điểm',
    'admin.courtSetupTitle': 'Cấu hình Sân thi đấu & Sắp xếp tự động',
    'admin.courtSetupDesc': 'Lựa chọn số lượng sân thực tế (2 Sân hoặc 3 Sân). Hệ thống sẽ tự động phân bổ lại toàn bộ lịch đấu các vòng, chia đều ca 25 phút/trận và cam kết 100% không trùng lịch cho VĐV Pool 1!',
    'admin.court2': '2 Sân (Court 1 & 2)',
    'admin.court3': '3 Sân (Court 1, 2 & 3)',
    'admin.rebalanceBtn': 'Sắp xếp lại lịch đấu',
    'admin.rebalancing': 'Đang sắp xếp...',
    'admin.addAthlete': 'Bổ sung VĐV mới',
    'admin.searchAthlete': 'Tìm tên vận động viên...',

    // Login
    'login.title': 'Đăng Nhập SAI Badminton Championship',
    'login.subtitle': 'Đăng nhập với tài khoản vai trò hoặc chọn đăng nhập 1-chạm dưới đây',
    'login.fastLoginTitle': 'ĐĂNG NHẬP 1-CHẠM THEO VAI TRÒ',
    'login.preSeeded': 'Tài khoản mẫu có sẵn',
    'login.email': 'Địa chỉ Email',
    'login.password': 'Mật khẩu',
    'login.signInBtn': 'Đăng Nhập',
    'login.authenticating': 'Đang xác thực...',
    'login.invalidCredentials': 'Email hoặc mật khẩu không chính xác.',
    'login.dbOffline': '⚠️ Cơ sở dữ liệu PostgreSQL tại localhost:5432 chưa được bật. Vui lòng mở Docker Desktop hoặc chạy lệnh khởi động database.',
    'login.directorTitle': 'Giám đốc Giải đấu',
    'login.directorDesc': 'Toàn quyền điều hành lịch thi đấu, sắp xếp sân, VĐV & ghi đè điểm',
    'login.opsTitle': 'Trưởng Ban Tổ Chức',
    'login.opsDesc': 'Chống trùng lịch Pool 1, quản lý VĐV & thông báo webhook',
    'login.umpire1Title': 'Trọng tài Sân 1',
    'login.umpire1Desc': 'Bảng điểm di động, đồng hồ thi đấu, còi kết thúc & cập nhật tỉ số',
    'login.umpire2Title': 'Trọng tài Sân 2',
    'login.umpire2Desc': 'Phụ trách chấm điểm trực tiếp các trận Sân 2',
    'login.fanTitle': 'Khán giả / Cổ động viên',
    'login.fanDesc': 'Xem trực tiếp tỉ số các sân, BXH & sơ đồ loại trực tiếp',
  },
  en: {
    // Navbar
    'nav.liveCourts': 'Live Courts',
    'nav.tvScoreboard': 'TV Scoreboard',
    'nav.standings': 'Standings & Brackets',
    'nav.referee': 'Referee Touchpad',
    'nav.organizer': 'Organizer Center',
    'nav.login': 'Login',
    'nav.logout': 'Sign Out',
    'nav.role': 'Role',
    'nav.soundOn': 'Sound On',
    'nav.soundOff': 'Sound Off',
    'nav.connected': 'Connected',
    'nav.connecting': 'Connecting',
    'nav.subTitle': 'Badminton Championship Management',

    // Home / Live Courts
    'home.broadcastCenter': 'LIVE BROADCAST CENTER',
    'home.title': 'SAI Badminton Championship 2026',
    'home.description': 'Opening on 14/11/2026. 24 Players across 3 Pools competing in Mixed Doubles (XD) & Men\'s Doubles (MD).',
    'home.metric.live': 'Live Playing',
    'home.metric.completed': 'Completed',
    'home.metric.upcoming': 'Upcoming',
    'home.matches': 'Matches',
    'home.filter.category': 'Category:',
    'home.filter.all': 'All Categories',
    'home.filter.xd': 'Mixed Doubles (XD)',
    'home.filter.md': 'Men\'s Doubles (MD)',
    'home.btn.viewStandings': 'View Standings & Brackets',
    'home.btn.refresh': 'Refresh Scores',
    'home.table.title': 'All Matches Fixture & Live Progress',
    'home.table.totalMatches': 'matches registered',
    'home.table.code': 'Code',
    'home.table.court': 'Court',
    'home.table.category': 'Category',
    'home.table.round': 'Stage',
    'home.table.teamA': 'Team A (Roster)',
    'home.table.score': 'Score',
    'home.table.teamB': 'Team B (Roster)',
    'home.table.status': 'Status',
    'home.table.winner': 'Winner',

    // Court Card
    'court.arena': 'SAI Digital Arena',
    'court.idle': 'Court is Idle',
    'court.noActiveMatch': 'No active match currently on Court',
    'court.umpire': 'Umpire:',
    'court.assigned': 'Assigned Ref',
    'court.winner': 'Winner:',
    'court.singleSet': 'Single Set',
    'court.set': 'Set',
    'court.onDeckTitle': '⚡ On Deck Next · Athletes Prepare',

    // Standings & Brackets
    'standings.title': 'Live Standings & Knockout Brackets',
    'standings.subtitle': 'Real-time standings updated instantly on match completion with automatic tie-breakers and BO3 playoff trees.',
    'standings.tab.xd': 'Mixed Doubles (XD)',
    'standings.tab.md': 'Men\'s Doubles (MD)',
    'standings.roster.title': '1. 8-Team Roster & Pairing Table',
    'standings.roster.code': 'Pair Code',
    'standings.roster.male1': 'Male Athlete (Pool 1)',
    'standings.roster.male1_md': 'Male Athlete 1 (Pool 1)',
    'standings.roster.female': 'Female Athlete (Pool 3)',
    'standings.roster.male2_md': 'Male Athlete 2 (Pool 2)',
    'standings.roster.totalPower': 'Total Power',
    'standings.group.top2': 'Top 2 Advance to Semis',
    'standings.table.pos': 'Pos',
    'standings.table.team': 'Team & Roster',
    'standings.table.played': 'P',
    'standings.table.won': 'W',
    'standings.table.lost': 'L',
    'standings.table.setDiff': 'Set Diff',
    'standings.table.ptDiff': 'Pt Diff',
    'standings.table.points': 'Pts',
    'standings.playoff.title': 'Interactive Knockout Playoff Brackets (Best of 3 Sets)',
    'standings.playoff.semi1': 'SEMIFINAL 1 (SF1)',
    'standings.playoff.semi2': 'SEMIFINAL 2 (SF2)',
    'standings.playoff.bronze': 'BRONZE PLAYOFF',
    'standings.playoff.final': 'CHAMPIONSHIP FINAL',
    'standings.playoff.champion': 'CHAMPION',

    // Referee
    'referee.court': 'Court',
    'referee.stopwatchTitle': 'Match Elapsed Time (Stopwatch)',
    'referee.start': 'Start',
    'referee.pause': 'Pause',
    'referee.reset': 'Reset (00:00)',
    'referee.addPoint': '+1 POINT',
    'referee.undo': 'Undo (-1)',
    'referee.instantUndo': 'Instant Undo',
    'referee.switchCourt': 'Switch Court',
    'referee.finishMatch': 'Finish Match',
    'referee.auditLog': 'Score Audit Log',
    'referee.sideLeft': 'Left Court',
    'referee.sideRight': 'Right Court',
    'referee.verifyTitle': 'Verify Match Completion',
    'referee.verifySubtitle': 'Confirm winner for match',
    'referee.verifyDuration': 'Match Duration:',
    'referee.verifyPrompt': 'Please verify the final score and select the winning team to finalize and broadcast the official result:',
    'referee.confirmWinner': 'Confirm Winner',
    'referee.cancel': 'Cancel',

    // TV
    'tv.title': 'SAI Arena Big-Screen TV Scoreboard',
    'tv.fullscreen': 'Fullscreen',
    'tv.exitFullscreen': 'Exit Fullscreen',
    'tv.allCourts': 'All Courts',

    // Admin
    'admin.title': 'Tournament Operations Control Center',
    'admin.subtitle': 'Automated collision detection, athlete & pairing manager, court configuration and emergency score override',
    'admin.tab.schedule': 'Schedule & Collision Manager',
    'admin.tab.athletes': 'Athlete Management',
    'admin.tab.pairs': 'Team Pairing Manager',
    'admin.tab.override': 'Emergency Score Override',
    'admin.tab.webhook': 'Notification Webhooks',
    'admin.exportCsv': 'Export CSV',
    'admin.advanceXd': 'Advance XD Playoff',
    'admin.advanceMd': 'Advance MD Playoff',
    'admin.refresh': 'Refresh',
    'admin.resetScores': 'Reset Scores',
    'admin.courtSetupTitle': 'Court Configuration & Auto Rebalance',
    'admin.courtSetupDesc': 'Select active courts (2 Courts or 3 Courts). The system will automatically recalculate 25-minute slots across courts, guaranteeing 0 collisions for Pool 1 athletes!',
    'admin.court2': '2 Courts (Court 1 & 2)',
    'admin.court3': '3 Courts (Court 1, 2 & 3)',
    'admin.rebalanceBtn': 'Rebalance Schedule',
    'admin.rebalancing': 'Rebalancing...',
    'admin.addAthlete': 'Add New Athlete',
    'admin.searchAthlete': 'Search athlete name...',

    // Login
    'login.title': 'SAI Badminton Championship Login',
    'login.subtitle': 'Sign in with your role-based credentials or use one-click demo login below',
    'login.fastLoginTitle': '1-CLICK FAST ROLE SIGN-IN',
    'login.preSeeded': 'Pre-seeded accounts',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.signInBtn': 'Sign In',
    'login.authenticating': 'Authenticating...',
    'login.invalidCredentials': 'Invalid email or password.',
    'login.dbOffline': '⚠️ PostgreSQL Database is offline at localhost:5432. Please start Docker Desktop.',
    'login.directorTitle': 'Tournament Director',
    'login.directorDesc': 'Full control over schedule, court setup, roster & score override',
    'login.opsTitle': 'Tournament Ops Lead',
    'login.opsDesc': 'Collision prevention, roster pairing & webhooks',
    'login.umpire1Title': 'Umpire Court 1',
    'login.umpire1Desc': 'Mobile touchpad, match stopwatch, buzzer & score updates',
    'login.umpire2Title': 'Umpire Court 2',
    'login.umpire2Desc': 'Assigned to Court 2 live matches',
    'login.fanTitle': 'Spectator / Fan',
    'login.fanDesc': 'Live courts, animated standings & knockout trees',
  },
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'vi',
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sai_badminton_locale') as Locale;
      if (saved === 'vi' || saved === 'en') {
        setLocaleState(saved);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('sai_badminton_locale', l);
    } catch (e) {}
  };

  const toggleLocale = () => {
    const next = locale === 'vi' ? 'en' : 'vi';
    setLocale(next);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[locale] as Record<string, string>;
    if (dict && dict[key]) {
      return dict[key];
    }
    const fallbackDict = translations['vi'] as Record<string, string>;
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
