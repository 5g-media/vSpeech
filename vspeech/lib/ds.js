#!/usr/bin/env node

const fs = require('fs');
const VAD = require('node-vad');
const Ds = require('deepspeech');
const ws = require('./websocket');
const state = require('./state');
const {PassThrough} = require('stream');

const BEAM_WIDTH = 500;
const LM_ALPHA  = 0.75;
const LM_BETA = 1.85;
const args = {
  model: './models/output_graph.pbmm',
  alphabet: './models/alphabet.txt',
  lm: './models/lm.binary',
  trie: './models/trie',
};

const AUDIO_SAMPLE_RATE = 16000;
const VAD_STREAM = VAD.createStream;
const VAD_OPTIONS = {
//    mode: VAD.Mode.NORMAL,
//    mode: VAD.Mode.LOW_BITRATE,
//    mode: VAD.Mode.AGGRESSIVE,
  mode: VAD.Mode.VERY_AGGRESSIVE,
  audioFrequency: AUDIO_SAMPLE_RATE,
  debounceTime: 5
};

console.error('Loading model from file %s', args['model']);
const model_load_start = process.hrtime();
let model = new Ds.Model(args['model'], BEAM_WIDTH);
const model_load_end = process.hrtime(model_load_start);
console.error('Loaded model in %ds.', totalTime(model_load_end));

if (args['lm'] && args['trie']) {
  console.error('Loading language model from files %s %s', args['lm'], args['trie']);
  const lm_load_start = process.hrtime();
  model.enableDecoderWithLM(args['lm'], args['trie'], LM_ALPHA, LM_BETA);
  const lm_load_end = process.hrtime(lm_load_start);
  console.error('Loaded language model in %ds.', totalTime(lm_load_end));
}

let time = 5000;
let timer = null;
let audioLength = 0;
let passStream = null;
let sctx = model.createStream();

exports = module.exports = {
  config: {
    name: 'ds',
    get: getConfig,
    set: setConfig
  },
  stats: {
    get: getStats,
    set: setStats
  },
  stream: {
    get: getStream
  },
  start: start,
  stop: stop
};

function totalTime(hrtimeValue) {
  return (hrtimeValue[0] + hrtimeValue[1] / 1000000000).toPrecision(4);
}

function start() {
  ws.log('debug', '[s2t] start');
  passStream.pipe(VAD_STREAM(VAD_OPTIONS)).on('data', processVad);
  state.set('start');
}

function stop() {
  ws.log('debug', '[s2t] stop');
  passStream.unpipe();
  state.set('stopped');
}

function getConfig() {
  return null;
}

function setConfig() {
  return null;
}

function getStats() {
  return null;
}

function setStats() {
  return null;
}

function getStream() {
  passStream = new PassThrough();
  // if (state.group() === 'start')
  //   start();
  // else if (state.group() === 'stop')
  //   stop();
  start();
  return passStream;
}

function handleStreamOutput(transcript) {
  let transcriptArr = transcript.split(' ');
  if (transcript) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      write('\0');
    }, time);
    if (process.env.OUTPUT_METHOD === 'metadata')
      ws.emit('data', {words: [], wordCount: transcript.length, confidence: 0, transcript: transcript});
    else
      write(transcriptArr.slice(-20).join(' '));
    console.log('Transcription: ', transcript);
  }
}

function finishStream() {
  const model_load_start = process.hrtime();
  console.error('Running inference.');
  handleStreamOutput(model.finishStream(sctx));
  const model_load_end = process.hrtime(model_load_start);
  console.error('Inference took %ds for %ds audio file.', totalTime(model_load_end), audioLength.toPrecision(4));
  audioLength = 0;
}

function intermediateDecode() {
  handleStreamOutput(model.intermediateDecode(sctx));
}

function feedAudioContent(chunk) {
  audioLength += (chunk.length / 2) * ( 1 / AUDIO_SAMPLE_RATE);
  model.feedAudioContent(sctx, chunk.slice(0, chunk.length / 2));
}

function processVad(data) {
  if (data.speech.start||data.speech.state) { feedAudioContent(data.audioData) }
  else if (data.speech.end) { feedAudioContent(data.audioData); intermediateDecode() }
}

function write(text) {
  fs.writeFile('1.txt', text, function (err) {
    if (err) return console.log(err);
    else fs.rename('1.txt', '0.txt', function (err) {
      if (err) return console.log(err);
    });
  });
}

// Run script (VAD enabled)
// node infere2.js --audio rtmp://XYZ:1935/live/teststream --model $HOME/models/output_graph.pbmm --alphabet $HOME/models/alphabet.txt
// node infere2.js --audio rtmp://XYZ:1935/live/teststream --lm $HOME/models/lm.binary --trie $HOME/models/trie --model $HOME/models/output_graph.pbmm --alphabet $HOME/models/alphabet.txt
