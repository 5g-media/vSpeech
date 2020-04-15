'use strict';

const child = require('child_process');
const ws = require('./websocket');

let ffmpeg = null;
let stream = null;
let config = {
  url: process.env.INPUT_URL,
  opts: {
    stdio:
      [
        'inherit',
        'pipe',
        'pipe'
      ]
  },
  args: (process.env.OUTPUT_METHOD === 'metadata') ?
    [
      // '-hide_banner',
      '-loglevel', 'quiet',
      '-i', process.env.INPUT_URL,
      '-c', 'copy',
      // tee pseudo-muxer throws following message in flv.js
      // Malformed Nalus near timestamp
      // Thus cannot be used at the moment
      // '-f', 'tee',
      // '[f=flv]rtmp://localhost/live/stream|[f=' + process.env.OUTPUT_FORMAT + ':onfail=ignore]' + process.env.OUTPUT_URL,
      '-f', process.env.OUTPUT_FORMAT,
      process.env.OUTPUT_URL,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ac', '1',
      '-ar', '16000',
      '-f', 'wav',
      'pipe:'
    ] :
    [
      // '-hide_banner',
      '-loglevel', 'quiet',
      '-i', process.env.INPUT_URL,
      // '-r', '25',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-maxrate', '3000k',
      '-bufsize', '1500k',
      '-pix_fmt', 'yuv420p',
      '-g', '25',
      // '-intra-refresh', '1',
      '-vf', 'drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf: fontsize=24*' + process.env.INPUT_RESOLUTION.split('x').shift() + '/1920: box=1: boxborderw=10: boxcolor=black@0.9: textfile=0.txt:reload=1: fontcolor=white@1.0: x=150*' + process.env.INPUT_RESOLUTION.split('x').shift() + '/1920: y=h-(200*' + process.env.INPUT_RESOLUTION.split('x').shift() + '/1920)',
      // tee pseudo-muxer throws following message in flv.js
      // Malformed Nalus near timestamp
      // Thus cannot be used at the moment
      // '-f', 'tee',
      // '[f=flv]rtmp://localhost/live/stream|[f=' + process.env.OUTPUT_FORMAT + ':onfail=ignore]' + process.env.OUTPUT_URL,
      '-c:a', 'libfdk_aac',
      '-ar', '44100',
      // '-c:a', 'copy',
      '-f', process.env.OUTPUT_FORMAT,
      process.env.OUTPUT_URL,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ac', '1',
      '-ar', '16000',
      '-f', 'wav',
      'pipe:'
    ]
};

exports = module.exports = {
  config: {
    get: getConfig,
    set: setConfig
  },
  start: start,
  stop: stop,
  pipe: pipe
};

function updateSource(source) {
  config.url = source;
  if (config.args.indexOf('-stream_loop') >= 0)
    config.args.splice(config.args.indexOf('-stream_loop'), 2);
  if (config.args.indexOf('-re') >= 0)
    config.args.splice(config.args.indexOf('-re'), 1);
  if (source.search(/(.mp4|.webm|.ogg)$/g) >= 0)
    config.args.splice(config.args.indexOf('-i'), 2, '-stream_loop', '-1', '-re', '-i', source);
  else
    config.args.splice(config.args.indexOf('-i'), 2,  '-i', source);
  return source;
}

function pipe() {
  ws.log('debug', '[ffmpeg] pipe');
  let tmpStream = require('./speech').Speech.stream.get();
  ffmpeg.stdout.pipe(tmpStream)
    .on('close', () => {
      ws.log('debug', '[ffmpeg][stdout] close');
    })
    .on('end', () => {
      ws.log('debug', '[ffmpeg][stdout] end');
    })
    .on('error', (err) => {
      ws.log('error', '[ffmpeg][stdout] error:', err);
    });
  if (stream) ffmpeg.stdout.unpipe(stream);
  stream = tmpStream;
}

function start() {
  ws.log('debug', '[ffmpeg] start');
  ffmpeg = child.spawn('ffmpeg', config.args, config.opts)
    .on('error', (err) => {
      ws.log('error', '[ffmpeg] failed to spawn', err);
    })
    .on('close', () => {
      ws.log('debug', '[ffmpeg] close');
      setTimeout(start, 1000);
    });
  ffmpeg.stderr
    .on('data', (data) => {
      ws.log('debug', '[ffmpeg][stderr] log', data);
    })
    .on('end', (data) => {
      ws.log('debug', '[ffmpeg][stderr] end', data);
    });
  pipe();
}

function stop() {
  if (!ffmpeg) return;
  ws.log('debug', '[ffmpeg] stop');
  ffmpeg.kill();
}

function getConfig(param) {
  if (!param)
    return config;
  else
    return param.split('.').reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : null, config);
}

function setConfig(params) {
  if (!params) return;
  if (params.url && params.url !== config.url) {
    updateSource(params.url);
    stop();
  }
}

updateSource(process.env.INPUT_URL);