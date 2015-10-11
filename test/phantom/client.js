process.env.DEBUG = '*';
require('babelify/polyfill');

let { model } = require('../../lib');

model.once('ready', () => {
  window.callPhantom('finish');
});
