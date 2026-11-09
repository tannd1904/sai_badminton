const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const major = parseInt(process.versions.node.split('.')[0], 10);
const node20Exe = 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\node20\\node-v20.18.0-win-x64\\node.exe';
const node20Dir = 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\node20\\node-v20.18.0-win-x64';

let execPath = process.execPath;
let envPath = process.env.PATH || '';

if (major < 18) {
  if (process.platform === 'win32' && fs.existsSync(node20Exe)) {
    console.log(`[SAI Engine] Node ${process.version} detected (Next.js 14 requires >= v18.17.0).`);
    console.log(`[SAI Engine] Auto-switching to installed Node 20: ${node20Exe}\n`);
    execPath = node20Exe;
    envPath = `${node20Dir};${envPath}`;
  } else {
    console.warn(`[SAI Engine] Warning: Next.js 14 requires Node >= 18. Current: ${process.version}`);
  }
}

// Determine command
const args = process.argv.slice(2);
const cmd = args[0] || 'dev';

let child;
if (cmd === 'build') {
  const prismaCli = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');
  if (fs.existsSync(prismaCli)) {
    try {
      console.log('[SAI Engine] Generating Prisma Client...');
      const { execFileSync } = require('child_process');
      execFileSync(execPath, [prismaCli, 'generate'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PATH: envPath,
        },
      });
    } catch (e) {
      console.warn('[SAI Engine] Warning: prisma generate failed, continuing with build...');
    }
  }

  const nextCli = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
  child = spawn(execPath, [nextCli, 'build'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: envPath,
    },
  });
} else if (cmd === 'seed') {
  const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  child = spawn(execPath, [tsxCli, 'prisma/seed.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: envPath,
    },
  });
} else if (cmd === 'start') {
  const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  child = spawn(execPath, [tsxCli, 'server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
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

