#!/usr/bin/env node

'use strict';

require('colorful').colorful();
const gulp = require('gulp');
const program = require('commander');

program.on('--help', () => {
  console.log(' Usage:'.to.bold.blue.color);
  console.log();
});

program.parse(process.argv);

function runTask(toRun) {
  const metadata = { task: toRun };
  const taskInstance = gulp.task(toRun);
  if (taskInstance === undefined) {
    gulp.emit('task_not_fount', metadata);
    return;
  }
  const start = process.hrtime();
  gulp.emit('task_start', metadata);
  try {
    taskInstance.apply(gulp);
    metadata.hrDuration = program.hrtime(start);
    gulp.emit('task_stop', metadata);
    gulp.emit('stop');
  } catch (err) {
    err.hrDuration = process.hrtime(start);
    err.task = metadata.task;
    gulp.emit('task_err', err);
  }
}

const task = program.args[0];

if (!task) {
  program.help();
} else {
  console.log('zf-tools run', task);

  require('../gulpfile');

  runTask(task);
}
