const readline = require('readline');
const { spawnSync } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('================================================================');
console.log('   SAI Badminton Championship - Setup Supabase / Cloud Database');
console.log('================================================================\n');

rl.question('Dan duong dan Supabase DATABASE_URL vao day roi nhan Enter:\n> ', (url) => {
  rl.close();

  const dbUrl = (url || '').trim();
  if (!dbUrl) {
    console.error('\n❌ Ban chua nhap DATABASE_URL! Vui long chay lai.');
    process.exit(1);
  }

  console.log('\n[1/2] Dang tao cac bang du lieu tren Supabase Database...');
  const pushRes = spawnSync(
    'npx',
    ['prisma', 'db', 'push', '--accept-data-loss'],
    {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    }
  );

  if (pushRes.status !== 0) {
    console.error('\n❌ Loi khi tao bang tren database. Vui long kiem tra lai DATABASE_URL!');
    process.exit(pushRes.status || 1);
  }

  console.log('\n[2/2] Dang nap danh sach 24 VDV, 16 cap dau & tai khoan BTC/Trong tai...');
  const seedRes = spawnSync(
    'node',
    ['launcher.js', 'seed'],
    {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    }
  );

  if (seedRes.status !== 0) {
    console.error('\n❌ Loi khi seed du lieu. Vui long kiem tra lai!');
    process.exit(seedRes.status || 1);
  }

  console.log('\n================================================================');
  console.log('   ✅ HOAN TAT THIET LAP SUPABASE DATABASE THANH CONG!');
  console.log('================================================================');
  console.log('Gio day ban co the bat dau Web Service tren Render de su dung.\n');
});
