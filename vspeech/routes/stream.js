const express = require('express');
const router = express.Router();

const request = require('request');

router.get('/', function(req, res, next) {
  request("http://localhost:8000/live/stream.flv").on('error', () => {}).pipe(res);
});

module.exports = router;
