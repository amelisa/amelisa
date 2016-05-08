import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import createSchema from '../graphql/createSchema'
import { getStorage, docId, value } from '../util'

let storage
let store
let model
let model2

let graphqlQuery = `
query GetUser($id: String!) {
  user(id: $id) {
    name,
    stories {
      id,
      text
    }
  }
}
`
let variableValues = {
  id: 1
}

describe('subscribes graphql query', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage, createSchema, saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel()
    model2 = store.createModel()
    model.createSchema = createSchema
  })

  it('should fetch graphql query and get results', async () => {
    await model.add('stories', {id: docId, text: 'Story 1', userId: docId})
    await model.add('users', {id: docId, name: value})
    let query = model.query(graphqlQuery, {variableValues})
    await query.fetch()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})
  })

  it('should fetch graphql query two times and get results', async () => {
    await model.add('stories', {id: docId, text: 'Story 1', userId: docId})
    await model.add('users', {id: docId, name: value})
    let query = model.query(graphqlQuery, {variableValues})
    await query.fetch()
    await query.fetch()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})
  })

  it('should subscribe graphql query and get results', async () => {
    await model.add('stories', {id: docId, text: 'Story 1', userId: docId})
    await model.add('users', {id: docId, name: value})
    let query = model.query(graphqlQuery, {variableValues})
    await query.subscribe()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})

    setTimeout(() => model2.set(['stories', docId, 'text'], 'Story 2'))
    await eventToPromise(query, 'change')

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 2'}]}})
  })

  it('should subscribe graphql query and get results while offline', async () => {
    model.close()
    await model.add('stories', {id: docId, text: 'Story 1', userId: docId})
    await model.add('users', {id: docId, name: value})
    let query = model.query(graphqlQuery, {variableValues})
    await query.subscribe()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})

    setTimeout(() => model.set(['stories', docId, 'text'], 'Story 2'))
    await eventToPromise(query, 'change')

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 2'}]}})
  })
})
