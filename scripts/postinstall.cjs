/* eslint-disable no-console */
const { execSync } = require('node:child_process');

const npmCli = process.env.npm_execpath;
const nodeBin = process.execPath;

const run = (scriptName) => {
  if (npmCli) {
    execSync(`"${nodeBin}" "${npmCli}" run ${scriptName}`, { stdio: 'inherit' });
    return;
  }
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execSync(`${npmCmd} run ${scriptName}`, { stdio: 'inherit' });
};

run('prisma:generate');
run('patch:prisma');
