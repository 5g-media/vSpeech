'use strict';

const fs = require('fs');
const path = require('path');

process.env.GOOGLE_APPLICATION_CREDENTIALS = __dirname + path.sep + process.env.CREDENTIALS_FILENAME;

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

exports = module.exports = {
  read: read,
  write: write,
  remove: remove,
  readSync: readSync,
};

function read(fn) {
  fs.stat(credentialsPath, (err) => {
    fn(err);
  });
}

function readSync() {
  try {
    return require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  catch (e) {
    return false;
  }
}

function write(data, fn) {
  fs.writeFile(credentialsPath, JSON.stringify(data), function (err) {
    fn(err);
  });
}

function remove(fn) {
  fs.unlink(credentialsPath, function (err) {
    if (typeof fn === 'function') fn(err);
  })
}
