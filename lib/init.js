'use strict';

// from publish-please

const path = require('path');
const writeFile = require('fs').writeFileSync;
const chalk = require('chalk');
const getNpmArgs = require('./utils/get-npm-args');

const pathJoin = path.join;

function reportNoConfig() {
  console.log(
    chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
  );
  console.log(chalk.bgRed("!! Unable to setup zf-tools: project's package.json either missing !!"));
  console.log(chalk.bgRed('!! or malformed. Run `npm init` and then reinstall zf-tools.       !!'));
  console.log(
    chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
  );
}

function reportCompletion() {
  console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
  console.log(chalk.bgGreen('!! zf-tools was successfully installed for the project. !!'));
  console.log(chalk.bgGreen('!! Use `npm run pub` command for publishing.       !!'));
  console.log(chalk.bgGreen('!! publishing configuration.                                  !!'));
  console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

function addConfigHooks(cfg, projectDir) {
  if (!cfg.scripts) {
    cfg.scripts = {};
  }

  if (cfg.scripts.pub) {
    return false;
  }

  cfg.scripts = Object.assign(cfg.scripts, {
    dist: 'zf-tools run dist',
    compile: 'zf-tools run compile',
    clean: 'zf-tools run clean',
    start: 'zf-tools run start',
    site: 'zf-tools run site',
    deploy: 'zf-tools run update-self && zf-tools run deploy',
    'just-deploy': 'zf-tools run just-deploy',
    pub: 'zf-tools run update-self && zf-tools run pub',
  });

  if (cfg.scripts.prepublish) {
    cfg.scripts['pre-publish'] = cfg.scripts.prepublish;
  }

  cfg.scripts.prepublish = 'zf-tools run guard';

  writeFile(pathJoin(projectDir, 'package.json'), JSON.stringify(cfg, null, 2));

  return true;
}

function init() {
  const testmode = process.argv.indexOf('--test-mode') > -1;

  if (!testmode) {
    const npmArgs = getNpmArgs();

    if (!npmArgs || !npmArgs.some(arg => /^zf-tools(@\d+\.\d+.\d+)?$/.test(arg))) {
      return;
    }
  }

  // NOTE: <projectDir>/node_modules/antd-tools/lib
  const projectDir = pathJoin(__dirname, '../../../');
  const cfg = require(path.join(projectDir, 'package.json'));

  if (!cfg) {
    reportNoConfig();
    process.exit(1);
  } else if (addConfigHooks(cfg, projectDir)) {
    reportCompletion();
  }
}

init();
