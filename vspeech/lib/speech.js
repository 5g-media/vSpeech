'use strict';

const path = require('path');

exports = module.exports = {
  get Speech() {
    return require(__dirname + path.sep + (process.env.SPEECH_API.toLowerCase() || 'ds'));
  }
};