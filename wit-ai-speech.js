'use strict';

const request = require('request-promise');
// promise version doesn't work when piping binary
const requestCB = require('request');
const spawn = require('child_process').spawn;
const fs = require('fs');
const uuid = require('node-uuid');
//const url = require('url');
const path = require('path');

let ffmpegBin;
let dir;
let t;
const stopWatch = (s, title) => {
  const o = s || t;
  t = Date.now();
  console.log(`time [${title}]`, t - o, 'ms');
};

const downloadFile = event => new Promise((resolve, reject) => {
  stopWatch(Date.now(), 'Download Start');
  const url = event.url;
  const filename = `${dir}${uuid.v1()}`;
  const writeStream = fs.createWriteStream(filename);

  writeStream.on('error', (error) => {
    reject(error);
  });

  writeStream.on('finish', () => {
    stopWatch(null, 'Download End');
    resolve({ event, filename });
  });

  request
    .get(url)
    .pipe(writeStream);
});

const encodeToMP3 = data => new Promise((resolve, reject) => {
  stopWatch(Date.now(), 'Encode Start');
  const event = data.event;
  const input = data.filename;
  const output = `${dir}${uuid.v1()}.mp3`;
  const ffmpeg = spawn(ffmpegBin, ['-i', input, '-codec:a', 'libmp3lame', '-b:a', '320k', output]);
  //const ffmpeg = spawn(ffmpegBin, ['-i', input, output]);
  ffmpeg.stdout.on('data', (data) => {
    // console.log(`stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    // console.log(`stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    stopWatch(null, 'Encode End');
    if (code === 0) {
      return resolve({ event, filename: output });
    } else {
      return reject(`ffmpeg error ${code}`);
    }
  });
});

const postToWitAi = data => new Promise((resolve, reject) => {
  stopWatch(Date.now(), 'Wit.ai POST Start');
  const filename = data.filename;

  const options = {
    url: 'https://api.wit.ai/speech?v=20160526',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.event.wit}`,
      'Content-Type': 'audio/mpeg'
    },
    json: true
  };

  fs.createReadStream(filename)
    .pipe(requestCB(options, (err, response) => {
      stopWatch(null, 'Wit.ai POST End');
      if (err) {
        return reject(err);
      }
      return resolve(response.body);
    }));
});

const speechHandler = event => new Promise((resolve, reject) => {
  ffmpegBin = process.env.LOCAL ? 'ffmpeg' : `${process.env.LAMBDA_TASK_ROOT}/ffmpeg`;
  dir = process.env.LOCAL ? 'audio/' : '/tmp/';
  return downloadFile(event)
    .then(encodeToMP3)
    .then(postToWitAi)
    .then(resolve)
    .catch(reject);
});

module.exports = speechHandler;