## vSpeech
This project is a Speech-to-Text service based on Mozilla's DeepSpeech Engine.

## Requirements
- node.js 10.x and higher

## Installation
Change directory where the project files are located.
### Local environment
```
npm install
```
### Docker
```
docker build -t vspeech .
```
## Usage
Run the following command to start the service.
### Local environment
```
node index.js
```
### Docker
To start the *vspeech* service run:
```
docker run --name vspeech -p 8885:8885 --rm vspeech
```
To start the *vspeech* service and change its default configuration run:
```
docker run \
--name vspeech \
-e DEBUG=false \
-e REQ_URL= \
-e REQ_METHOD=POST \
-e DECODE_FORMAT=vtt \
-e DECODE_INTERVAL=5000 \
-e BEAM_WIDTH=500 \
-e LM_ALPHA=0.75 \
-e LM_BETA=1.85 \
-e AUDIO_SAMPLE_RATE=16000 \
-e WS_PORT=8885 \
-e EXT_HOST= \
-e EXT_PORT= \
-p 8885:8885 \
--rm \
vspeech
```
To remove the container run:
```
docker stop vspeech
```
## Configuration
The configuration of the service must be done in the *.env* file. The following parameters exist:

`DEBUG` - Enable/disable debugging (default: false)\
`REQ_URL` - Defines the URL to send the text result after the stream has finished (default: )\
`REQ_METHOD` - Defines the HTTP method to use for the request (default: POST)\
`DECODE_FORMAT` - Defines the decoding format (default: vtt)\
`DECODE_INTERVAL` - Interval in which intermediate results are calculated (default: 5000)\
`BEAM_WIDTH` - Defines speech service related paramter (default: 500)\
`LM_ALPHA` - Defines speech service related paramter (default: 0.75)\
`LM_BETA` - Defines speech service related paramter (default: 1.85)\
`AUDIO_SAMPLE_RATE` - Defines the audio sample rate (default: 16000)\
`WS_PORT` - Websocket server's port (default: 8885)\
`EXT_HOST` - Websocket clients's host URL (default:)\
`EXT_PORT` - Websocket clients's port (default:)