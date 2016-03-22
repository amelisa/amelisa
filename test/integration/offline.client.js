require('babelify/polyfill')
console.log('offline')

let { model } = require('../../src')

model.once('ready', () => {
  window.callPhantom('ready')
})
