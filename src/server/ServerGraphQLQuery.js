import eventToPromise from 'event-to-promise'
import ServerQuery from './ServerQuery'
import { arrayRemove } from '../util'
let execute
let Source
let parse
try {
  execute = require('graphql').execute
  Source = require('graphql').Source
  parse = require('graphql').parse
} catch (err) {}

class ServerGraphQLQuery extends ServerQuery {
  constructor (graphqlQuery, queryOptions = {}, store, querySet) {
    super(null, null, store, querySet)

    if (!execute) throw new Error("To use GraphQL, please, install 'graphql' package")

    this.graphqlQuery = graphqlQuery
    this.queryOptions = queryOptions
    this.isDocs = false
    this.subscribes = []

    let { createSchema } = this.store
    this.schema = createSchema(this.resolve)

    this.load()
  }

  async load () {
    if (!this.schema) return

    for (let subscribe of this.subscribes) {
      for (let channel of this.channels) {
        subscribe.unsubscribe(channel)
      }
    }

    let { rootValue, contextValue, variableValues, operationName } = this.queryOptions

    let source = new Source(this.graphqlQuery)
    // TODO: handle errors
    let documentAST
    try {
      documentAST = parse(source)
    } catch (err) {
      throw err
    }
    try {
      let { data } = await execute(this.schema, documentAST, rootValue,
        contextValue, variableValues, operationName)
      this.data = data
    } catch (err) {
      throw err
    }

    setTimeout(() => this.emit('loaded'))
  }

  resolve = async (collectionName, docIdOrExpression) => {
    let isQuery = this.store.dbQueries.isQuery(docIdOrExpression)
    let subscribe

    if (isQuery) {
      subscribe = await this.querySet.getOrCreateQuery(collectionName, docIdOrExpression)
    } else {
      subscribe = await this.store.docSet.getOrCreateDoc(collectionName, docIdOrExpression)
    }

    this.subscribes.push(subscribe)
    subscribe.on('change', this.onChange)

    if (subscribe.loaded) return subscribe.get()
    await eventToPromise(subscribe, 'loaded')
    return subscribe.get()
  };

  onChange = () => {
    this.load()
  };

  isGraphQLQuery (graphqlQuery) {
    return typeof graphqlQuery === 'string' &&
      graphqlQuery.length > 1 &&
      graphqlQuery[0] === '{' &&
      graphqlQuery[graphqlQuery.length - 1] === '}'
  }

  async sendNotDocsQuerySnapshotToChannel (channel, ackId) {
    let op = {
      type: 'q',
      collectionName: this.graphqlQuery,
      expression: this.queryOptions,
      value: this.data,
      ackId
    }

    this.sendOp(op, channel)
  }

  async fetch (channel, docIds, ackId) {
    await this.sendNotDocsQuerySnapshotToChannel(channel, ackId)

    this.maybeUnattach()
  }

  async subscribe (channel, docIds, ackId) {
    this.channels.push(channel)
    for (let subscribe of this.subscribes) {
      subscribe.subscribe(channel)
    }

    await this.sendNotDocsQuerySnapshotToChannel(channel, ackId)
  }

  unsubscribe (channel) {
    arrayRemove(this.channels, channel)

    this.maybeUnattach()
  }
}

export default ServerGraphQLQuery
