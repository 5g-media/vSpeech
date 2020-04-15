'use strict';

const ws = require('./websocket');

exports = module.exports = {
  get: get,
  set: set,
  group: group
};

let state = {
  prop: 5,
  types: {
    stop: 1,
    start: 2,
    started: 3,
    stopped: 4,
    timeout: 5
  }
};

function get(param) {
  if (!param)
    return state;
  else
    return param.split('.').reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : null, state);
}

function set(name) {
  state.prop = state.types[name];
  send();
  return state.prop;
}

function group() {
  if (state.prop === state.types.start || state.prop === state.types.started)
    return 'start';
  else if (state.prop === state.types.stop || state.prop === state.types.stopped)
    return 'stop';
  else
    return 'timeout';
}

function send() {
  ws.log('debug', '[state] changed', state.prop);
  ws.emit('status', state.prop);
}
