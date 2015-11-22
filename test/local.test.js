import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { localCollectionName, docId, expression, field, value } from './util'

let storage
let store
let model
let model2

describe('local', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    return storage
      .init()
      .then(() => {
        store = new Store(storage)
        model = store.createModel()
        model.source = 'model1'
        model2 = store.createModel()
        model2.source = 'model2'
      })
  })

  it('should not send ops for local doc', () => {
    let subscribes = [[localCollectionName, docId]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.add(localCollectionName, doc)
        assert(model2.get(localCollectionName, docId))
        assert.equal(model2.get(localCollectionName, docId, field), value)

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            assert(!model.get(localCollectionName, docId))
            resolve()
          }, 10)
        })
      })
  })

  it('should not send ops for local query', () => {
    let subscribes = [[localCollectionName, expression]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.add(localCollectionName, doc)
        let docs = model2.getQuery(localCollectionName, expression)
        assert.equal(docs.length, 1)
        assert.equal(docs[0]._id, docId)

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            assert.equal(model.getQuery(localCollectionName, expression).length, 0)
            resolve()
          }, 10)
        })
      })
  })
})
