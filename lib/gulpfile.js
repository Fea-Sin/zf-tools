const { getProjectPath, injectRequire, getConfig } = require('./utils/projectHelper');

injectRequire();

const merge2 = require('merge2');
const { execSync } = require('child_process');
const through2 = require('through2');
const webpack = require('webpack');
const babel = require('gulp-babel');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const path = require('path');
const watch = require('gulp-watch');
const ts = require('gulp-typescript');
const gulp = require('gulp');
const fs = require('fs');
const rimraf = require('rimraf');
const stripCode = require('gulp-strip-code');
const sourcemaps = require('gulp-sourcemaps');
// const install = require('./install');
const runCmd = require('./runCmd');
const getBabelCommonConfig = require('./getBabelCommonConfig');
// const transformLess = require('./transformLess');
// const getNpm = require('./getNpm');
const selfPackage = require('../package.json');
const getNpmArgs = require('./utils/get-npm-args');
// const { cssInjection } = require('./utils/styleUtil');
// const tsConfig = require('./getTsCommonConfig')();
const replaceLib = require('./replaceLib');
// const checkDeps = require('./lint/checkDeps');
// const checkDiff = require('./lint/checkDiff');
// const apiCollection = require('./apiCollection');
// const sortApiTable = require('./sortApiTable');
const runGit = require('./utils/run-git-command');

const packageJson = require(getProjectPath('package.json'));

const tsDefaultReporter = ts.reporter.defaultReporter();
const cwd = process.cwd();
const libDir = getProjectPath('lib');
const esDir = getProjectPath('es');

function dist(done) {
  rimraf.sync(getProjectPath('dist'));
  process.env.RUN_ENV = 'PRODUCTION';
  const webpackConfig = require(getProjectPath('webpack.config.js'));
  webpack(webpackConfig, (err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
      console.error(info.errors);
    }

    const buildInfo = stats.toString({
      colors: true,
      children: true,
      chunks: false,
      modules: false,
      chunkModules: false,
      hash: false,
      version: false,
    });
    console.log(buildInfo);

    // Additional process of dist finalize
    const { dist: { finalize } = {} } = getConfig();
    if (finalize) {
      console.log('[Dist] Finalization...');
      finalize();
    }

    done(0);
  });
}

function tag() {
  console.log('tagging');
  const { version } = packageJson;

  execSync(`git tag ${version}`);
  execSync(`git push origin ${version}:${version}`);
  execSync(`git push origin master:master`);
  console.log('tagged');
}

const lintWrapper = cmd => done => {
  if (cmd && !Array.isArray(cmd)) {
    console.log('tslint parameter error!');
    process.exit(1);
  }
  const lastCmd = cmd || [];
  const tslintBin = require.resolve('tslint/bin/tslint');
  const tslintConfig = path.join(__dirname, './tslint.json');
  const args = [tslintBin, '-c', tslintConfig, 'components/**/*.tsx'].concat(lastCmd);
  runCmd('node', args, done);
};

// gulp.task(
//   'check-git',
//   gulp.series(done => {
//     console.log('check-git 执行----');
//     runCmd('git', ['status', '--porcelain'], (code, result) => {
//       console.log('check-git 执行----result', result, 'check-git 执行----code', code);
//       if (/^\?\?/m.test(result)) {
//         return done(`There are untracked files in the working tree.\n${result}
//       `);
//       }
//       if (/^M/m.test(result)) {
//         return done(`There are uncommitted changes in the working tree.\n${result}
//       `);
//       }
//       return done();
//     });
//   })
// );

gulp.task(
  'check-git',
  gulp.series(done => {
    console.log('check-git 执行----');

    runGit(['status', '--porcelain'])
      .then(result => {
        console.log('node run git ----result', result);
        if (/^\?\?/m.test(result)) {
          return done(`There are untracked files in the working tree.\n${result}
      `);
        }
        if (/^M/m.test(result)) {
          return done(`There are uncommitted changes in the working tree.\n${result}
      `);
        }
        return done();
      })
      .catch(error => 'Command execution failed');
  })
);

gulp.task(
  'guard',
  gulp.series(done => {
    function reportError() {
      console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
      console.log(chalk.bgRed('!! `npm publish` is forbidden for this package. !!'));
      console.log(chalk.bgRed('!! Use `npm run pub` instead.        !!'));
      console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    }

    const npmArgs = getNpmArgs();
    if (npmArgs) {
      for (let arg = npmArgs.shift(); arg; arg = npmArgs.shift()) {
        if (/^pu(b(l(i(sh?)?)?)?)?$/.test(arg) && npmArgs.indexOf('--with-zf-tools') < 0) {
          reportError();
          done(1);
          return;
        }
      }
    }

    done();
  })
);

function babelify(js, modules) {
  const babelConfig = getBabelCommonConfig(modules);
  delete babelConfig.cacheDirectory;

  if (modules === false) {
    babelConfig.plugins.push(replaceLib);
  }
  let stream = js
    .pipe(sourcemaps.init())
    .pipe(babel(babelConfig))
    .pipe(
      through2.obj(function z(file, encoding, next) {
        this.push(file.clone());
        if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
          const content = file.contents.toString(encoding);
          if (content.indexOf('react-native') !== -1) {
            // actually in antd-mobile@2.0, this case will never run,
            // since we both split style/index.mative.js style/index.js
            // but let us keep this check at here
            // in case some of our developer made a file name mistake ==
            next();
            return;
          }

          file.contents = Buffer.from(cssInjection(content));
          file.path = file.path.replace(/index\.js/, 'css.js');
          this.push(file);
          next();
        } else {
          next();
        }
      })
    )
    .pipe(sourcemaps.write('.'));

  if (modules === false) {
    stream = stream.pipe(
      stripCode({
        start_comment: '@remove-on-es-build-begin',
        end_comment: '@remove-on-es-build-end',
      })
    );
  }
  return stream.pipe(gulp.dest(modules === false ? esDir : libDir));
}

function pub(done) {
  const notOk = !packageJson.version.match(/^\d+\.\d+\.\d+$/);
  console.log('pub01---notOk', notOk);
  let tagString;
  console.log('pub02---argv', argv);
  if (argv['npm-tag']) {
    tagString = argv['npm-tag'];
  }
  if (!tagString && notOk) {
    tagString = 'next';
  }
  publish(tagString, done);
}

function publish(tagString, done) {
  console.log('publish----tagString', tagString, 'puhlish---done', done);
  let args = ['publish', '--with-zf-tools', '--access=public'];
  if (tagString) {
    args = args.concat(['--tag', tagString]);
  }
  const publishNpm = process.env.PUBLISH_NPM_CLI || 'npm';
  runCmd(publishNpm, args, code => {
    console.log('Publish return code:', code);
    if (!argv['skip-tag'] && !code) {
      tag();
    }
    done(code);
  });
}

gulp.task(
  'pub',
  gulp.series('check-git', done => {
    pub(done);
  })
);
