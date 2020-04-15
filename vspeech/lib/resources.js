'use strict';

const ffmpeg = require('../lib/ffmpeg');
const ws = require('../lib/websocket');
const state = require('../lib/state');

const api = {
  root: '/api',
  endpoints: [
    {
      method: 'GET',
      endpoint: '',
      description: 'Finds all data'
    },
    {
      method: 'GET',
      endpoint: '/transcription',
      description: 'Finds transcription'
    },
    {
      method: 'POST',
      endpoint: '/transcription/start',
      description: 'Starts transcription'
    },
    {
      method: 'POST',
      endpoint: '/transcription/stop',
      description: 'Stops transcription'
    },
    {
      method: 'GET',
      endpoint: '/transcription/state',
      description: 'Finds state of transcription'
    },
    {
      method: 'GET',
      endpoint: '/words',
      description: 'Finds words'
    },
    {
      method: 'GET',
      endpoint: '/statistics',
      description: 'Finds statistics'
    },
    {
      method: 'GET',
      endpoint: '/configuration',
      description: 'Finds configuration'
    },
    {
      method: 'GET',
      endpoint: '/configuration/all',
      description: 'Finds full configuration'
    },
    {
      method: 'POST',
      endpoint: '/configuration',
      description: 'Updates configuration'
    },
    {
      method: 'POST',
      endpoint: '/process/exit',
      description: 'Exits process'
    }
  ]
};

let Speech = require('../lib/speech').Speech;

exports = module.exports = {
  getAll: getAll,
  getTranscription: getTranscription,
  startTranscription: startTranscription,
  stopTranscription: stopTranscription,
  stateTranscription: stateTranscription,
  getWords: getWords,
  getStats: getStats,
  getConfig: getConfig,
  getFullConfig: getFullConfig,
  setConfig: setConfig
};

function getAll() {
  return {
    transcription: Speech.stats.get('transcription'),
    words: Speech.stats.get('words'),
    statistics: getStats(),
    configuration: getConfig()
  }
}

function getTranscription() {
  return Speech.stats.get('transcription');
}

function startTranscription() {
  return Speech.start();
}

function stopTranscription() {
  return Speech.stop();
}

function stateTranscription() {
  return {state: state.get('prop')};
}

function getWords() {
  return Speech.stats.get('words');
}

function getStats() {
  return {
    confidence: Speech.stats.get('confidence'),
    wordCount: Speech.stats.get('wordCount')
  }
}

function getConfig() {
  return {
    url: ffmpeg.config.get('url'),
    language: Speech.config.get('streamingConfig.config.languageCode'),
    validity: Speech.config.get('sessionTime'),
    speech: Speech.config.name
  }
}

function getFullConfig() {
  return {
    url: ffmpeg.config.get('url'),
    language: Speech.config.get('languages'),
    validity: Speech.config.get('times'),
    speech: [
      {
        name: 'ds',
        selected: (process.env.SPEECH_API === 'ds')
      },
      {
        name: 'gsa',
        selected: (process.env.SPEECH_API === 'gsa')
      }
    ],
    api: api
  }
}

function setConfig(data) {
  if (!data) return;
  ffmpeg.config.set(data); // url
  Speech.config.set(data); // language, validity, credentials
  if ( data.speech && data.speech !== process.env.SPEECH_API ) { // speech engine
    delete require.cache[require.resolve(__dirname + require('path').sep + process.env.SPEECH_API.toLowerCase())];
    process.env.SPEECH_API = data['speech'];
    Speech = require('../lib/speech').Speech;
    ffmpeg.pipe();
  }
  ws.emit('config', getConfig());
  return getConfig()
}
