const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const major = parseInt(process.versions.node.split('.')[0], 10);
const node20Exe = 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\node20\\node-v20.18.0-win-x64\\node.exe';
const node20Dir = 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\node20\\node-v20.18.0-win-x64';

let execPath = process.execPath;
let envPath = process.env.PATH || '';

if (major < 18) {
  if (fs.existsSync(node20Exe)) {
    console.log(`[SAI Engine] Node ${process.version} detected (Next.js 14 requires >= v18.17.0).`);
    console.log(`[SAI Engine] Auto-switching to installed Node 20: ${node20Exe}\n`);
    execPath = node20Exe;
    envPath = `${node20Dir};${envPath}`;
  } else {
    console.error(`\n❌ Error: Next.js 14 requires Node.js >= v18.17.0.`);
    console.error(`Current Node version: ${process.version}`);
    console.error(`Please update your Node.js or add Node 18+ to your PATH.\n`);
    process.exit(1);
  }
}

// Determine command
const args = process.argv.slice(2);
const cmd = args[0] || 'dev';

let child;
if (cmd === 'build') {
  const nextCli = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
  child = spawn(execPath, [nextCli, 'build'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: envPath,
    },
  });
} else {
  // Find tsx binary
  const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  child = spawn(execPath, [tsxCli, 'server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: envPath,
    },
  });
}

child.on('exit', (code) => {
  process.exit(code || 0);
});

