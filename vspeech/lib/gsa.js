'use strict';
//TODO: reset streams streamIdx..., state stop/stopped, setStream ohne isSession, was soll passieren bei setConfig und wann?, OHNE isSession bei setConfig
const {SpeechClient} = require('@google-cloud/speech');
const {PassThrough} = require('stream');
const session = require('./session');
const devnull = require('dev-null');
const ws = require('./websocket');
const state = require('./state');
const stats = require('./stats');

let config = {
  streams: [],
  streamIdx: -1,
  restartTime: 55000,
  restartTimer: null,
  passStream: new PassThrough(),
  languages: [
    {
      name: 'English',
      code: 'en-US',
      selected: true
    },
    {
      name: 'Deutsch',
      code: 'de-DE',
      selected: false
    }],
  streamingConfig: {
    config: {
      enableWordTimeOffsets: true,
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US'
    },
    interimResults: true,
    singleUtterance: false
  }
};

exports = module.exports = {
  config: {
    name: 'gsa',
    get: getConfig,
    set: setConfig
  },
  stats: {
    get: stats.get,
    set: stats.set
  },
  stream: {
    get: getStream
  },
  start: start,
  stop: stop
};

state.set( session.init() );

session.start()
  .on('start', onSession)
  .on('stop', offSession);

function start() {
  ws.log('debug', '[s2t] start');
  setStream(true);
  clearTimeout(config.restartTimer);
  config.restartTimer = setTimeout(onRestart, config.restartTime);
  state.set('start');
}

function stop() {
  ws.log('debug', '[s2t] stop');
  setStream(false);
  clearTimeout(config.restartTimer);
  state.set('stopped');
}

function onSession() {
  ws.log('debug', '[s2t] session started');
  setStream(true);
  clearTimeout(config.restartTimer);
  config.restartTimer = setTimeout(onRestart, config.restartTime);
  state.set('start');
}

function offSession() {
  ws.log('debug', '[s2t] session timeout');
  setStream(false);
  clearTimeout(config.restartTimer);
  state.set('timeout');
}

function onRestart() {
  ws.log('debug', '[s2t] stream restart');
  setStream(true);
  clearTimeout(config.restartTimer);
  config.restartTimer = setTimeout(onRestart, config.restartTime);
}

function getStream() {
  config.passStream = new PassThrough();
  if (state.group() === 'start')
    start();
  else if (state.group() === 'stop')
    stop();
  else if (state.group() === 'timeout')
    offSession();
  return config.passStream;
}

function setStream(isSession) {
  ws.log('debug', '[s2t] stream set', (isSession) ? 'true' : '/dev/null');
  const tmpIdx = config.streamIdx;
  const stream = createStream(isSession);
  config.passStream.pipe(stream);
  if (tmpIdx >= 0) {
    config.passStream.unpipe(config.streams[(tmpIdx)]);
    config.streams[tmpIdx].end();
  }
  return config.passStream;
}

function createStream(isSession) {
  ws.log('debug', '[s2t] stream create', (isSession) ? 'true' : '/dev/null');
  const stream = (isSession) ? new SpeechClient().streamingRecognize(config.streamingConfig)
    : devnull();
  config.streams.push(stream);
  config.streamIdx += 1;
  // streams[streamIdx]
  // 	.on('error', (err) => {
  // 		ws.log('error', '[gsa] transcription error:', err);
  // 	})
  // 	.on('end', () => {
  // 		ws.log('debug', '[gsa] transcription end');
  // 	})
  // 	.on('close', () => {
  // 		ws.log('debug', '[gsa] transcription close');
  // 	})
  // 	.on('data', (data) => {
  // 		ws.log('debug', '[gsa] transcription data');
  // 	});
  config.streams[config.streamIdx].once('data', () => {
    state.set('started')
  });
  config.streams[config.streamIdx].on('data', stats.set);
  return config.streams[config.streamIdx];
}

function getConfig(param) {
  if (!param)
    return config;
  else
    return param.split('.')
      .reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : null, config) || session.config.get(param);
}

function setConfig(params) {
  if (!params) return;
  if (params.language && params.language !== config.streamingConfig.config.languageCode) {
    config.streamingConfig.config.languageCode = params.language;
    config.languages.forEach(function (val) {
      val.selected = (val.code === params.language);
    });
    // setStream() oder config.passStream.unpipe() um ffmpeg zum Stoppen zu zwingen
  }
  session.config.set(params);
}