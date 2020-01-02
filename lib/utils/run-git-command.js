'use strict';

const getRunCmdEnv = require('./getRunCmdEnv');

function runGit(args) {

  return new Promise((resolve, reject) => {
    if (!args.length) {
      reject("run git ==> No arguments were given");
    }

    const runner = require('child_process').spawn('git', args, {
      // keep color
      stdio: 'inherit',
      env: getRunCmdEnv(),
    });
    let stdOutData = '';
    let stderrData = '';

    runner.stdout.on('data', (data) => stdOutData += data);
    runner.stderr.on('data', (data) => stderrData += data);
    runner.on('close', (code) => code != 0 ? reject(stderrData.toString()) : resolve(stdOutData.toString()));
  })
}

module.exports = runGit;
