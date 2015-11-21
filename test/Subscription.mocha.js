import assert from 'assert'
import { MemoryStorage, Store } from '../lib'
import { collectionName, docId, expression, field, value } from './util'

let storage
let store
let model

describe('Subscription', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    return storage
      .init()
      .then(() => {
        store = new Store(storage)
        model = store.createModel()
      })
  })

  it('should subscribe empty doc', () => {
    let subscribes = [[collectionName, docId]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get()
        assert.equal(data.length, 1)
        assert.equal(data[0], undefined)
        assert.equal(model.get(collectionName, docId), undefined)
      })
  })

  it('should subscribe doc', () => {
    let subscribes = [[collectionName, docId]]
    let doc = {
      _id: docId,
      [field]: value
    }

    return model
      .add(collectionName, doc)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get()
        assert.equal(data.length, 1)
        let doc = data[0]
        assert(doc)
        assert.equal(doc[field], value)

        assert.equal(model.get(collectionName, docId, field), value)
      })
  })

  it('should subscribe add doc and ops', () => {
    let subscribes = [[collectionName, docId]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.once('change', () => {
            subscription.once('change', () => {
              subscription.once('change', () => {
                subscription.once('change', () => {
                  resolve()
                })
                model.del([collectionName, docId])
              })
              model.del([collectionName, docId, field])
            })
            model.set([collectionName, docId, field], value)
          })
          model.add(collectionName, doc)
        })
      })
  })

  it('should subscribe empty query', () => {
    let subscribes = [[collectionName, expression]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get()
        assert.equal(data.length, 1)
        let query = data[0]
        assert(query)
        assert.equal(query.length, 0)

        let docs = model.query(collectionName, expression).get()
        assert.equal(docs.length, 0)
      })
  })

  it('should subscribe query', () => {
    let subscribes = [[collectionName, expression]]
    let doc = {
      _id: docId,
      [field]: value
    }

    return model
      .add(collectionName, doc)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get()
        assert.equal(data.length, 1)
        let query = data[0]
        assert(query)
        assert.equal(query.length, 1)
        assert.equal(query[0][field], value)

        let docs = model.query(collectionName, expression).get()
        assert.equal(docs.length, 1)
        assert.equal(docs[0][field], value)
      })
  })

  it('should subscribe query and ops', () => {
    let subscribes = [[collectionName, expression]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.once('change', () => {
            resolve()
          })

          model.add(collectionName, doc)
        })
      })
  })

  it('should subscribe doc and query', () => {
    let subscribes = [[collectionName, docId], [collectionName, expression]]
    let docData = {
      _id: docId,
      [field]: value
    }

    return model
      .add(collectionName, docData)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get()
        assert.equal(data.length, 2)
        let doc = data[0]
        let query = data[1]
        assert(doc)
        assert(query)
        assert.equal(doc[field], value)
        assert.equal(query.length, 1)
        assert.equal(query[0][field], value)

        assert.equal(model.get(collectionName, docId, field), value)

        let docs = model.query(collectionName, expression).get()
        assert.equal(docs.length, 1)
        assert.equal(docs[0][field], value)
      })
  })

  it('should subscribe doc and query and ops', () => {
    let subscribes = [[collectionName, docId], [collectionName, expression]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          // TODO: could we emit change once?
          subscription.once('change', () => {
            resolve()
          })

          model.add(collectionName, doc)
        })
      })
  })

  it('should fetch doc when no array', () => {
    return model.fetch(collectionName, docId)
  })

  it('should fetch doc when path', () => {
    return model.fetch(`${collectionName}.${docId}`)
  })

  it('should fetch doc when array', () => {
    return model.fetch([collectionName, docId])
  })

  it('should fetch doc when array of arrays', () => {
    return model.fetch([[collectionName, docId]])
  })

  it('should subscribe doc when no array', () => {
    return model.subscribe(collectionName, docId)
  })

  it('should subscribe doc when path', () => {
    return model.subscribe(`${collectionName}.${docId}`)
  })

  it('should subscribe doc when array', () => {
    return model.subscribe([collectionName, docId])
  })

  it('should subscribe doc when array of arrays', () => {
    return model.subscribe([[collectionName, docId]])
  })
})
