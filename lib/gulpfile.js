const { getProjectPath, injectRequire, getConfig } = require('./utils/projectHelper');

injectRequire();

const merge2 = require('merge2');
const { execSync } = require('child_process');
const through2 = require('through2');
const webpack = require('webpack');
