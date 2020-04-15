const express = require('express');
const router = express.Router();

const api = require('../lib/resources');

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', {
    title: 'Speech Recognition',
    year: (new Date()).getFullYear(),
    stats: api.getStats(),
    config: api.getFullConfig(),
    subtitles: (process.env.OUTPUT_METHOD === 'metadata'),
    speech: [
      {
        name: 'ds',
        selected: (process.env.SPEECH_API === 'ds')
      },
      {
        name: 'gsa',
        selected: (process.env.SPEECH_API === 'gsa')
      }
    ]
  });
});

module.exports = router;
