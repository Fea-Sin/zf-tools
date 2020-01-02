'use strict';

const getRunCmdEnv = require('./getRunCmdEnv');
const Promise = require('promise');

function runGit(args) {
  return new Promise((resolve, reject) => {
    if (!args.length) {
      reject('run git ==> No arguments were given');
    }

    const runner = require('child_process').spawn('git', args, {
      env: getRunCmdEnv(),
    });
    let stdOutData = '';
    let stderrData = '';

    runner.stdout.on('data', data => (stdOutData += data));
    runner.stderr.on('data', data => (stderrData += data));
    runner.on('close', code =>
      code != 0 ? reject(stderrData.toString()) : resolve(stdOutData.toString())
    );
  });
}

  // runGit(['status', '--porcelain'])
  // .then(result => {
  //   console.log('run git ----result', result);
  // })
  // .catch(err => {
  //   console.log('run git promise err', err)
  // })

module.exports = runGit;
