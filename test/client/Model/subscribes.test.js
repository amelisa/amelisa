import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { dbQueries } from 'amelisa-mongo'
import { collectionName, docId, expression } from '../../util'

let channel
let model

describe('Model subscribes', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model({channel, dbQueries})
  })

  it('should fetch doc when no array', async () => {
    await model.fetch(collectionName, docId)
  })

  it('should fetch doc when path', async () => {
    await model.fetch(`${collectionName}.${docId}`)
  })

  it('should fetch doc when array', async () => {
    await model.fetch([collectionName, docId])
  })

  it('should fetch doc when array of arrays', async () => {
    await model.fetch([[collectionName, docId]])
  })

  it('should fetch doc when doc', async () => {
    let doc = model.doc(collectionName, docId)
    await model.fetch(doc)
  })

  it('should fetch doc when array of docs', async () => {
    let doc = model.doc(collectionName, docId)
    await model.fetch([doc])
  })

  it('should subscribe doc when no array', async () => {
    await model.subscribe(collectionName, docId)
  })

  it('should subscribe doc when path', async () => {
    await model.subscribe(`${collectionName}.${docId}`)
  })

  it('should subscribe doc when array', async () => {
    await model.subscribe([collectionName, docId])
  })

  it('should subscribe doc when array of arrays', async () => {
    await model.subscribe([[collectionName, docId]])
  })

  it('should subscribe doc when doc', async () => {
    let doc = model.doc(collectionName, docId)
    await model.subscribe(doc)
  })

  it('should subscribe doc when array of docs', async () => {
    let doc = model.doc(collectionName, docId)
    await model.subscribe([doc])
  })

  it('should fetchAndGet doc', async () => {
    await model.fetchAndGet(collectionName, docId)
  })

  it('should fetchAndGet query', async () => {
    await model.fetchAndGet(collectionName, expression)
  })
})
