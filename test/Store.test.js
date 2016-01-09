import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src'
import ServerChannel from '../src/ServerChannel'
import { collectionName, docId } from './util'

let storage
let store
let channel

describe('Store', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    store.onChannel(channel2)
  })

  it('should sub to empty doc', async () => {
    let op = {
      type: 'sub',
      collectionName: collectionName,
      docId: docId,
      version: '1'
    }

    channel.send(op)

    let message = await eventToPromise(channel, 'message')

    assert.equal(message.type, op.type)
  })

  it('should sub to doc', async () => {
    let op = {
      type: 'sub',
      collectionName: collectionName,
      docId: docId,
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
