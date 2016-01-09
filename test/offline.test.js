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

    assert.equal(model.query(collectionName, expression).get().length, 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
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

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 1)
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

    assert.equal(model.query(collectionName, expression).get().length, 0)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
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

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 1)
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

  it('should sync on online when subscribed to query and add', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: '1',
      [field]: value
    }

    let doc2 = {
      _id: '2',
      [field]: value
    }

    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model.add(collectionName, doc)
    model2.add(collectionName, doc2)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 1)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 2)
    assert.equal(model2.query(collectionName, expression).get().length, 2)
  })

  it('should sync on online when subscribed to query and set', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }

    let doc2 = {
      _id: '2',
      [field]: value
    }

    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model2.set([collectionName, docId, field], 'Vasya')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 2)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 2)
    assert.equal(model2.query(collectionName, expression).get().length, 2)
    assert.equal(model2.get(collectionName, docId, field), 'Vasya')
  })

  it('should sync on online when subscribed to query and del', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }

    let doc2 = {
      _id: '2',
      [field]: value
    }

    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model.del([collectionName, '2'])
    model2.del([collectionName, docId])

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 1)

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)
    assert.equal(model2.query(collectionName, expression).get().length, 0)
  })

  it('should sync on online when subscribed to query there are some ops', async () => {
    let subscribes = [[collectionName, expression]]

    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    await sleep(10)

    let doc = {
      _id: docId,
      [field]: value
    }

    let doc2 = {
      _id: '2',
      [field]: value
    }

    let doc3 = {
      _id: '3',
      [field]: value
    }

    let doc4 = {
      _id: '4',
      [field]: value
    }

    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model2.add(collectionName, doc3)

    await sleep(10)

    model.channel.emit('close')
    model.channel.pipedChannel.emit('close')

    model2.channel.emit('close')
    model2.channel.pipedChannel.emit('close')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)

    model.add(collectionName, doc4)
    model2.del([collectionName, docId])
    model.set([collectionName, '2', field], 'Vasya')

    let channel3 = new ServerChannel()
    model2.channel.pipe(channel3).pipe(model2.channel)
    store.onChannel(channel3)
    model2.channel.emit('open')

    let channel2 = new ServerChannel()
    model.channel.pipe(channel2).pipe(model.channel)
    store.onChannel(channel2)
    model.channel.emit('open')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')
  })
})
