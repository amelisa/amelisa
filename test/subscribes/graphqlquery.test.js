import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import { getStorage, collectionName, docId, value } from '../util'
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList
} from 'graphql'

let storage
let store
let model
let model2

function createSchema (resolve) {
  let Story = new GraphQLObjectType({
    name: 'Story',
    fields: () => ({
      id: {
        type: GraphQLString
      },
      text: {
        type: GraphQLString
      },
      author: {
        type: GraphQLString,
        resolve (parent) {
          let { userId } = parent
          if (!userId) return
          return resolve('users', userId)
        }
      }
    })
  })

  let User = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: {
        type: GraphQLString
      },
      name: {
        type: GraphQLString
      },
      stories: {
        type: new GraphQLList(Story),
        resolve (parent, args) {
          return resolve('stories', {userId: parent.id})
        }
      }
    })
  })

  let RootType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      user: {
        type: User,
        args: {
          id: { type: GraphQLString }
        },
        resolve: (parent, args) => {
          let { id } = args
          return resolve('users', id)
        }
      },
      story: {
        type: Story,
        args: {
          id: { type: GraphQLString }
        },
        resolve: (parent, args) => {
          let { id } = args
          return resolve('stories', id)
        }
      }
    })
  })

  let schema = new GraphQLSchema({
    query: RootType
  })

  return schema
}

let graphqlExpression = `
{
  user(id: "1") {
    name,
    stories {
      id,
      text
    }
  }
}
`

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
    let query = model.query(collectionName, graphqlExpression)
    await query.fetch()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})
  })

  it('should subscribe graphql query and get results', async () => {
    await model.add('stories', {id: docId, text: 'Story 1', userId: docId})
    await model.add('users', {id: docId, name: value})
    let query = model.query(collectionName, graphqlExpression)
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
    let query = model.query(collectionName, graphqlExpression)
    await query.subscribe()

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 1'}]}})

    setTimeout(() => model.set(['stories', docId, 'text'], 'Story 2'))
    await eventToPromise(query, 'change')

    assert.deepEqual(query.get(), {user: {name: value, stories: [{id: docId, text: 'Story 2'}]}})
  })
})
