import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage } from '../../src/mongo/server'
import { Store } from '../../src/server'
import ServerChannel from '../../src/server/ServerChannel'
import { collectionName, docId } from '../util'

let storage
let store
let channel

describe('Store', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store({storage})
    await store.init()
    channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    store.onChannel(channel2)
    channel.open()
  })

  it('should sub to empty doc', async () => {
    let op = {
      id: 'id',
      type: 'sub',
      collectionName,
      docId,
      version: '1'
    }

    channel.send(op)

    let message = await eventToPromise(channel, 'message')

    assert.equal(message.type, op.type)
    assert.equal(message.ackId, op.id)
  })

  it('should sub to doc', async () => {
    let op = {
      type: 'sub',
      collectionName,
      docId,
      version: '1'
    }

    let prevVersion = null
    let version = '2'
    let state = {
      name: 'name'
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    channel.send(op)

    let message = await eventToPromise(channel, 'message')

    assert.equal(message.type, op.type)
  })
})
