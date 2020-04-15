require('dotenv').config();

const Ds = Deepspeech();
const fs = require('fs');
const Http = require('http');
const WebSocket = require('ws');
const request = require('request');
const logUpdate = require('log-update');
const Websocket = require('websocket-stream');

function Deepspeech() {
  try {
    process.env.DECODE_GPU = true;
    return require('deepspeech-gpu')
  }
  catch (e) {
    process.env.DECODE_GPU = false;
    return require('deepspeech')
  }
}

///////////// env /////////////

const DEBUG = JSON.parse(process.env.DEBUG);

const REQ_URL = process.env.REQ_URL;
const REQ_METHOD = process.env.REQ_METHOD.toUpperCase();

const DECODE_FORMAT = process.env.DECODE_FORMAT;
const DECODE_INTERVAL = JSON.parse(process.env.DECODE_INTERVAL);

const BEAM_WIDTH = parseInt(process.env.BEAM_WIDTH);
const LM_ALPHA = parseFloat(process.env.LM_ALPHA);
const LM_BETA = parseFloat(process.env.LM_BETA);

const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE);

const WS_PORT = parseInt(process.env.WS_PORT);

const EXT_HOST = process.env.EXT_HOST;
const EXT_PORT = parseInt(process.env.EXT_PORT);

/////////// Debug ////////////

const log = DEBUG ? console.log : () => {
};

///////////// ds /////////////

const args = {
  model: './models/output_graph.pbmm',
  alphabet: './models/alphabet.txt',
  lm: './models/lm.binary',
  trie: './models/trie',
};

log('Loading model from file %s', args['model']);
const model_load_start = process.hrtime();
let model = new Ds.Model(args['model'], BEAM_WIDTH);
const model_load_end = process.hrtime(model_load_start);
log('Loaded model in %ds.', totalTime(model_load_end));

if (args['lm'] && args['trie']) {
  log('Loading language model from files %s %s', args['lm'], args['trie']);
  const lm_load_start = process.hrtime();
  model.enableDecoderWithLM(args['lm'], args['trie'], LM_ALPHA, LM_BETA);
  const lm_load_end = process.hrtime(lm_load_start);
  log('Loaded language model in %ds.', totalTime(lm_load_end));
}

let ts = null;
let dts = null;
let audioLength = 0;
let timeoutTimer = null;
let timeoutTime = 10000;
let sctx = model.createStream();

function totalTime(hrtimeValue) {
  return (hrtimeValue[0] + hrtimeValue[1] / 1000000000).toPrecision(4);
}

function msToTime(duration) {
  let milliseconds = parseInt((duration % 1000) / 100);
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;
  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function metadataToString(metadata) {
  let str = "";
  let mdat = {};
  let time = null;
  let character = "";
  let wordObject = null;
  let metadataLength = metadata.num_items;
  for (let i = 0; i < metadataLength; ++i) {
    time = metadata.items[i].timestep * 20;
    character = metadata.items[i].character;
    str += character;
    if (!wordObject) {
      wordObject = {};
      wordObject['word'] = character;
      wordObject['start'] = time;
      wordObject['end'] = time;
    }
    else if (character === " ") {
      mdat[wordObject['end']] = JSON.parse(JSON.stringify(wordObject));
      wordObject = null;
    }
    else if ((i + 1) === metadataLength) {
      wordObject['word'] += character;
      wordObject['end'] = time;
      mdat[wordObject['end']] = JSON.parse(JSON.stringify(wordObject));
      wordObject = null;
    }
    else {
      wordObject['word'] += character;
      wordObject['end'] = time;
    }
  }
  Ds.FreeMetadata(metadata);
  return {transcription: str, metadata: mdat};
}

function jsonToVTT(json) {
  let j = 0;
  let threshold = 300; //in milliseconds
  let metadata = json['metadata'];
  let arrayMetadata = [];
  let arrayMetadataLength = 0;
  let vttArray = [];
  let vttObject = null;
  for (let key in metadata) {
    if (metadata.hasOwnProperty(key)) {
      arrayMetadata.push(metadata[key]);
      arrayMetadataLength += 1;
    }
  }
  for (let i = 0; i < arrayMetadataLength; i++) {
    j = Math.min(i + 1, arrayMetadataLength - 1);
    if (!vttObject) {
      vttObject = {};
      vttObject['sentence'] = arrayMetadata[i]['word'];
      vttObject['start'] = arrayMetadata[i]['start'];
    }
    else if (arrayMetadata[j]['start'] - arrayMetadata[i]['end'] > threshold || (i + 1) === arrayMetadataLength) {
      vttObject['sentence'] += ' ' + arrayMetadata[i]['word'];
      vttObject['end'] = arrayMetadata[i]['end'] + threshold;
      vttArray.push(JSON.parse(JSON.stringify(vttObject)));
      vttObject = null;
    }
    else {
      vttObject['sentence'] += ' ' + arrayMetadata[i]['word'];
      vttObject['end'] = arrayMetadata[i]['end'] + threshold;
    }
  }
  return vttArray.map((e, i) => i + ' \n' + msToTime(e.start) + ' --> ' + msToTime(e.end) + '\n' + e.sentence + '\n\n').join('');
}

function handleStreamOutput(data, isEndOfStream) {
  if (!data) return;
  const json = isEndOfStream ? metadataToString(data) : {transcription: data};
  const transcription = json.transcription;
  if (ws) ws.send(transcription);
  logUpdate(transcription);
  if (isEndOfStream) {
    const func = REQ_METHOD === 'POST' ? request.post : request.put;
    const payload = DECODE_FORMAT === 'vtt' ? jsonToVTT(json) : JSON.stringify(json);
    fs.writeFileSync('subtitles.' + DECODE_FORMAT, payload);
    fs.createReadStream('subtitles.' + DECODE_FORMAT).pipe(func(REQ_URL, () => {
      process.exit(1);
    }));
  }
}

function intermediateDecode() {
  handleStreamOutput(model.intermediateDecode(sctx), false);
}

function finishDecode() {
  const finishStream = model.finishStreamWithMetadata;
  handleStreamOutput(finishStream(sctx), true);
}

function feedAudioContent(chunk) {
  dts = Date.now();
  audioLength += (chunk.length / 2) * (1 / AUDIO_SAMPLE_RATE);
  model.feedAudioContent(sctx, chunk.slice(0, chunk.length / 2));
  if (dts - ts >= DECODE_INTERVAL) {
    intermediateDecode();
    ts = dts;
  }
  clearTimeout(timeoutTimer);
  timeoutTimer = setTimeout(finishDecode, timeoutTime);
}

///////////// WS Client /////////////

let ws = null;

if (EXT_HOST && EXT_PORT) {
  ws = new WebSocket('ws://' + EXT_HOST + ':' + EXT_PORT);
}

///////////// WS Server /////////////

const server = Http.createServer();

Websocket.createServer({
  perMessageDeflate: false,
  server: server,
  binary: true
}, wssHandle);

function wssHandle(stream) {
  stream.on('data', feedAudioContent);
}

server.listen(WS_PORT);