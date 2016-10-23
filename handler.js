'use strict';

process.env.PATH += `:${process.env.LAMBDA_TASK_ROOT}`;

require('dotenv').config();

if (!process.env.LAMBDA_TASK_ROOT) {
  process.env.LAMBDA_TASK_ROOT = './';
}

const speechHandler = require('./wit-ai-speech');

module.exports.speech =
  (event, context, callback) =>
    speechHandler(event)
      .then((response) => {
        callback(null, response);
      })
      .catch(error => callback({ error: JSON.stringify(error) }));
