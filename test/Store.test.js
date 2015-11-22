import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import ServerChannel from '../src/ServerChannel'
import { collectionName, docId } from './util'

let storage
let store
let channel

describe('Store', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    return storage
      .init()
      .then(() => {
        store = new Store(storage)
        channel = new ServerChannel()
        let channel2 = new ServerChannel()
        channel.pipe(channel2).pipe(channel)
        store.onChannel(channel2)
      })
  })

  it('should sub to empty doc', () => {
    let op = {
      type: 'sub',
      collectionName: collectionName,
      docId: docId,
      version: '1'
    }

    return new Promise((resolve, reject) => {
      channel.on('message', (message) => {
        if (message.type !== 'sub') return
        assert.equal(message.type, op.type)
        resolve()
      })

      channel.send(op)
    })
  })

  it('should sub to doc', () => {
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
    return storage
      .saveDoc(collectionName, docId, state, prevVersion, version, ops)
      .then(() => {
        return new Promise((resolve, reject) => {
          channel.on('message', (message) => {
            if (message.type !== 'sub') return
            assert.equal(message.type, op.type)
            resolve()
          })

          channel.send(op)
        })
      })
  })
})