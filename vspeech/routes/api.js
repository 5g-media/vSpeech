const express = require('express');
const router = express.Router();

const api = require('../lib/resources');

router.get('/', (req, res) => {
  res.json(api.getAll());
});
router.get('/transcription', (req, res) => {
  res.json(api.getTranscription());
});
router.post('/transcription/start', (req, res) => {
  res.json(api.startTranscription());
});
router.post('/transcription/stop', (req, res) => {
  res.json(api.stopTranscription());
});
router.get('/transcription/state', (req, res) => {
  res.json(api.stateTranscription());
});
router.get('/words', (req, res) => {
  res.json(api.getWords());
});
router.get('/statistics', (req, res) => {
  res.json(api.getStats());
});
router.get('/configuration', (req, res) => {
  res.json(api.getConfig());
});
router.get('/configuration/all', (req, res) => {
  res.json(api.getFullConfig());
});
router.post('/configuration', (req, res) => {
  res.json(api.setConfig(req.body));
});
router.post('/process/exit', (req, res) => {
  res.json({exit: true});
  process.exit(1);
});

module.exports = router;