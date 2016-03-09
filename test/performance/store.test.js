import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../../src/server'
import ServerChannel from '../../src/server/ServerChannel'
import { collectionName, docId } from '../util'

let storage
let store
let channel
let model

describe('permormance store', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    store.onChannel(channel2)
    channel.open()
    model = store.createModel()
  })

  it.skip('should broadcast fast', async () => {
    let ops = []
    let op
    for (let i = 0; i < 10000; i++) {
      op = model.createOp({
        type: 'stringInsert',
        collectionName,
        docId,
        value: 'a'
      })
      ops.push(op)
    }

    await storage.saveDoc(collectionName, docId, {}, undefined, '1', ops)

    op = {
      id: 'id',
      type: 'sub',
      collectionName,
      docId,
      version: '1'
    }

    let start = Date.now()
    channel.send(op)

    let message = await eventToPromise(channel, 'message')
    let time = Date.now() - start
    console.log('broadcast', time)
    if (time > 200) throw new Error('broadcast takes too long ' + time)

    assert.equal(message.type, op.type)
    assert.equal(message.ackId, op.id)
  })
})
