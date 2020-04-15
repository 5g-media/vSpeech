## vSpeech
This project is a Speech-to-Text service. It can be used with either Mozilla's DeepSpeech Engine or Google's Cloud Speech-to-Text API.

## Requirements
- node.js 8.x and higher
- ffmpeg

## Installation
Change directory where the project files are located.
### Development
```
npm install
```
### Production
```
docker build -t vspeech .
```
## Usage
Run the following command to start the service.
### Development
```
node ./bin/www
```
### Production
```
docker run --name vspeech -p 3000:3000 -d vspeech
```

## API
The following api endpoints are available:
```
GET /api                        Finds all data
```
```
GET /api/transcription          Finds transcription
```
```
POST /api/transcription/start   Starts transcription
```
```
POST /api/transcription/stop    Stops transcription
```
```
GET /api/transcription/state    Finds state of transcription
```
```
GET /api/words                  Finds words
```
```
GET /api/statistics             Finds statistics
```
```
GET /api/configuration          Finds configuration
```
```
POST /api/configuration         Updates configuration
```
#### Parameters
| Name          | Type          | Description  |
| ------------- |:-------------:| -----|
| `url`         | `string`      | URL of the RTP/RTMP/RTSP video live stream |
| `language`    | `string`      | language of the video live stream (default: *en-US*) |
| `validity`    | `number`      | duration in ms how long the credentials will be valid (default: *60000*) |
| `credentials` | `object`      | google application credentials |

#### Example
```json
{
  "url": "rtmp://localhost/live/teststream",
  "language": "en-US",
  "validity": 60000
}
```

## Additional Parameters
`-e PORT` - port on which the web service is running  
`-e SPEECH_API` - S2T engine to use (`ds`, `gsa`)
`-e INPUT_URL` - URL of the RTP/RTMP/RTSP video live stream
`-e INPUT_RESOLUTION` - Resolution of the input stream
`-e OUTPUT_URL` - URL of the output stream
`-e OUTPUT_FORMAT` - output format (`mpegts`, `flv`, ...)
`-e OUTPUT_METHOD` - text rendered in the `video` or as `metadata`
`-e LANGUAGE` - language of the video live stream
`-e DURATION` - duration how long the credentials will be valid
