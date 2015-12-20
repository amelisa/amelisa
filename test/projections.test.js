import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { collectionName, dbCollectionName, docId, expression, countExpression, joinExpression, field, value, sleep } from './util'
import ServerChannel from '../src/ServerChannel'

let storage
let store
let model
let model2
let options = {
  projections: {
    [collectionName]: {
      collectionName: dbCollectionName,
      fields: {
        _id: true,
        [field]: true
      }
    }
  }
}

describe('projections', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage, null, null, options)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should subscribe to projected doc', async () => {
    let subscribes = [[collectionName, docId]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let doc = data[0]
    assert(!doc)

    let docData = {
      _id: docId,
      [field]: value,
      age: 14
    }

    return new Promise((resolve, reject) => {
      model2.add(dbCollectionName, docData)

      subscription.on('change', () => {
        assert(model.get(collectionName, docId, field))
        assert(!model.get(collectionName, docId, 'age'))

        resolve()
      })
    })
  })

  it('should subscribe to projected query', async () => {
    let subscribes = [[collectionName, expression]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let query = data[0]
    assert(!query.length)

    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    return new Promise((resolve, reject) => {
      model2.add(dbCollectionName, doc)

      subscription.on('change', () => {
        let docs = model.query(collectionName, expression).get()
        assert.equal(docs.length, 1)
        assert.equal(docs[0][field], value)
        assert.equal(docs[0].age, undefined)

        resolve()
      })
    })
  })

  it('should subscribe to projected join query', async () => {
    let subscribes = [[collectionName, joinExpression]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let query = data[0]
    assert(!query.length)

    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    let category = {
      _id: '1',
      userId: docId
    }

    return new Promise((resolve, reject) => {
      model2.add(dbCollectionName, doc)
      model2.add('categories', category)

      subscription.on('change', () => {
        let docs = model.query(collectionName, joinExpression).get()
        assert.equal(docs.length, 1)
        assert.equal(docs[0][field], value)
        assert.equal(docs[0].age, undefined)

        resolve()
      })
    })
  })

  it('should add projected doc to projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
  })

  it('should not add not projected doc to projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    await model
      .add(collectionName, doc)
      .catch((err) => {
        assert(err)
      })
  })

  it('should mutate on projected field in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, field], 'Vasya')
  })

  it('should not mutate on not projected field in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, 'age'], 15)
      .catch((err) => {
        assert(err)
      })
  })

  it('should send and receive ops on online when subscribed to projected doc', async () => {
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

  it('should send and receive ops on online when subscribed to projected query', async () => {
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

  it('should send and receive ops on online when subscribed to projected count query', async () => {
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
})
