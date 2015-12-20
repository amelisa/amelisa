import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { collectionName, docId, expression, countExpression, field, value, sleep } from './util'
import ServerChannel from '../src/ServerChannel'

let storage
let store
let model
let model2

describe('offline', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should send ops on online when subscribed to doc', async () => {
    let subscribes = [[collectionName, docId]]

    await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.channel.emit('close')
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.get(collectionName, docId), undefined)
    model2.channel.emit('open')

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should send ops on online when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.channel.emit('close')
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.get(collectionName, docId), undefined)

    model2.channel.emit('open')

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should receive ops on online when subscribed to doc', async () => {
    let subscribes = [[collectionName, docId]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')
    model2.add(collectionName, doc)

    await sleep(10)

    assert(!model.get(collectionName, docId))

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should receive ops on online when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.getQuery(collectionName, expression).length, 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, expression).length, 1)
  })

  it('should receive ops on online when subscribed to count query', async () => {
    let subscribes = [[collectionName, countExpression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.getQuery(collectionName, countExpression), 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, countExpression), 1)
  })

  it('should send and receive ops on online when subscribed to doc', async () => {
    let subscribes = [[collectionName, docId]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model2.add(collectionName, doc)

    await sleep(10)

    assert(!model.get(collectionName, docId))

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should send and receive ops on online when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.getQuery(collectionName, expression).length, 0)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, expression).length, 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, expression).length, 1)
  })

  it('should send and receive ops on online when subscribed to count query', async () => {
    let subscribes = [[collectionName, countExpression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.getQuery(collectionName, countExpression), 0)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, countExpression), 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.getQuery(collectionName, countExpression), 1)
  })

  it('should apply ops offline when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')
    model.add(collectionName, doc)

    await sleep(10)

    let query = model.query(collectionName, expression)
    assert(model.get(collectionName, docId))
    assert.equal(query.get().length, 1)
  })

  it('should apply ops offline when subscribed to count query', async () => {
    let subscribes = [[collectionName, countExpression]]

    await model.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }
    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')
    model.add(collectionName, doc)

    await sleep(10)

    let query = model.query(collectionName, countExpression)
    assert(model.get(collectionName, docId))
    assert.equal(query.get(), 1)
  })
})
