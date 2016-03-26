import Doc from '../../src/client/Doc'
import Model from '../../src/client/Model'
import ServerChannel from '../../src/server/ServerChannel'
import { source, collectionName, docId } from '../util'

let channel
let model

describe('performance doc', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel, source)
  })

  it('should refreshState fast', () => {
    let ops = []
    for (let i = 0; i < 1000; i++) {
      let op = model.createOp({
        type: 'stringInsert',
        collectionName,
        docId,
        value: 'a'
      })
      ops.push(op)
    }

    let doc = new Doc(docId, [])
    doc.ops = ops

    let start = Date.now()
    doc.refreshState()
    let time = Date.now() - start
    console.log('refreshState', time)
    if (time > 20) throw new Error('refreshState takes too long ' + time)
  })
})
