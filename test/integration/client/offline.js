import { getModel, IndexedDbStorage } from '../../../src/web'

console.log('offline')
let model = getModel({Storage: IndexedDbStorage})

model.once('ready', () => {
  window.callPhantom('ready')
})
