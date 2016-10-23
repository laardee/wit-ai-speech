'use strict';

require('dotenv').config();
process.env.LOCAL = true;

const mod = require('./handler');
const wrapper = require('lambda-wrapper');

const event = {
  url: process.env.URL,
  wit: process.env.WIT_AI_TOKEN
};

const wrapped = wrapper.wrap(mod, { handler: 'speech' });
wrapped.run(event)
  .then(console.log)
  .catch(error => console.error('ERROR', error));
