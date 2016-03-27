import { getModel } from '../../../src/react'

console.log('offline')
let model = getModel()

model.once('ready', () => {
  window.callPhantom('ready')
})
