'use strict';

const credentials = require('./credentials');
const {EventEmitter} = require('events');
const ws = require('./websocket');

const eventEmitter = new EventEmitter();

let config = {
  sessionTimer: null,
  sessionTime: process.env.VALIDITY || 60000,
  times: [
    {
      name: '1m',
      duration: 60000,
      selected: true
    },
    {
      name: '5m',
      duration: 300000,
      selected: false
    },
    {
      name: '10m',
      duration: 600000,
      selected: false
    },
    {
      name: '30m',
      duration: 1800000,
      selected: false
    },
    {
      name: '1h',
      duration: 3600000,
      selected: false
    }
  ]
};

exports = module.exports = {
  config: {
    get: getConfig,
    set: setConfig
  },
  start: start,
  stop: stop,
  init: init
};

function init() {
  if ( !credentials.readSync() ) {
    return 'stop';
  }
  else {
    return 'start';
  }
}

function start() {
  ws.log('debug', '[session] start');
  credentials.read((err) => {
    if (err) {
      eventEmitter.emit('stop');
    }
    else {
      clearTimeout(config.sessionTimer);
      config.sessionTimer = setTimeout(stop, config.sessionTime);
      eventEmitter.emit('start');
    }
  });
  return eventEmitter;
}

function stop() {
  ws.log('debug', '[session] stop');
  clearTimeout(config.sessionTimer);
  credentials.remove();
  eventEmitter.emit('stop');
}

function getConfig(param) {
  if (!param)
    return config;
  else
    return param.split('.').reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : null, config);
}

function setConfig(params) {
  if (!params) return;
  if (params.validity && params.validity !== config.sessionTime) {
    config.sessionTime = params.validity;
    config.times.forEach(function (val) {
      val.selected = (val.duration === parseInt(params.validity));
    });
  }
  if (params.credentials) {
    credentials.write(params.credentials, function (err) {
      if (err) return;
      clearTimeout(config.sessionTimer);
      config.sessionTimer = setTimeout(stop, config.sessionTime);
      eventEmitter.emit('start');
    });
  }
}