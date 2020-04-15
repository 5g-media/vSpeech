'use strict';

const fs = require('fs');
const ws = require('./websocket');

let timer = null;
let time = 10000;
let stats = {
  words: [],
  wordCount: 0,
  confidence: 0,
  confidenceN: 0,
  confidenceSum: 0,
  transcription: ''
};

exports = module.exports = {
  get: get,
  set: set,
  reset: reset
};

function get(param) {
  console.log(param);
  if (!param)
    return stats;
  else
    return param.split('.').reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : null, stats);
}

function set(data) {
  const ts = data.results[0].alternatives[0];
  let msg = {};
  if (ts.words.length > 0) {
    stats.confidenceN += 1;
    stats.confidenceSum += ts.confidence;
    stats.confidence = parseInt(stats.confidenceSum / stats.confidenceN * 100);
    stats.words = stats.words.concat(ts.words);
    stats.transcription += ts.transcript;
    stats.wordCount += ts.words.length;
  }
  msg.words = ts.words;
  msg.wordCount = stats.wordCount;
  msg.confidence = stats.confidence;
  msg.transcript = ts.transcript;
  clearTimeout(timer);
  timer = setTimeout(() => {
    write('\0');
  }, time);
  write(msg.transcript.split(' ').slice(-10).join(' '));
  ws.emit('data', msg);
}

function write(text) {
  fs.writeFile('1.txt', text, function (err) {
    if (err) return console.log(err);
    else fs.rename('1.txt', '0.txt', function (err) {
      if (err) return console.log(err);
    });
  });
}

function reset() {
  stats.words = [];
  stats.wordCount = 0;
  stats.confidence = 0;
  stats.confidenceN = 0;
  stats.confidenceSum = 0;
  stats.transcription = '';
}