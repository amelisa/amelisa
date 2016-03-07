import assert from 'assert'
import ModelEventEmitter from '../../src/client/ModelEventEmitter'
import { source, source2, collectionName, docId, field, field2, value, value2 } from '../util'

let emitter

describe('ModelEventEmitter', () => {
  beforeEach(() => {
    emitter = new ModelEventEmitter()
  })

  it('should call listener when on', (done) => {
    emitter.on('event', done)

    emitter.emit('event')
  })

  it('should call listener when addListener', (done) => {
    emitter.addListener('event', done)

    emitter.emit('event')
  })

  it('should call listener when emit collectionName', (done) => {
    emitter.on('change', 'users.1.names.first', done)

    emitter.emit('change', 'users')
  })

  it('should call listener when emit docId', (done) => {
    emitter.on('change', 'users.1.names.first', done)

    emitter.emit('change', 'users.1')
  })

  it('should call listener when emit field', (done) => {
    emitter.on('change', 'users.1.names.first', done)

    emitter.emit('change', 'users.1.names.first')
  })
})
