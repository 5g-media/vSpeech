'use strict';

const io = require('socket.io')();

const env = process.env.NODE_ENV.toLowerCase() || 'debug';
const evt = 'stt conversion';
const cmd = {
  data: 1,
  error: 2,
  debug: 3,
  status: 4,
  config: 5
};

exports = module.exports = {
  initialize: initialize,
  emit: emit,
  log: log
};

function initialize(server) {
  io.attach(server);
  io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });
}

function emit() {
  io.emit(evt, {cmd: cmd[arguments[0]], msg: arguments[1]});
}

function log() {
  if (env === 'debug') {
    console.log(Array.prototype.slice.call(arguments, 1).join(' '));
    io.emit(evt, {cmd: cmd[arguments[0]], msg: arguments[1]});
  }
}
