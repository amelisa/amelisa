// process.env.DEBUG = '*';
require('babelify/polyfill');
console.log('offline');

let { model } = require('../../lib');

model.once('ready', () => {
  window.callPhantom('ready');
});
