import eventToPromise from 'event-to-promise'
import { graphql } from 'graphql'
import ServerQuery from './ServerQuery'
import { arrayRemove } from '../util'

class ServerGraphQLQuery extends ServerQuery {
  constructor (collectionName, expression, store, querySet) {
    super(collectionName, expression, store, querySet)

    this.notLoad = true
    this.isDocs = false
    this.subscribes = []

    let { createSchema } = this.store
    this.schema = createSchema(this.resolve)

    this.load()
  }

  async load () {
    for (let subscribe of this.subscribes) {
      for (let channel of this.channels) {
        subscribe.unsubscribe(channel)
      }
    }

    let { data } = await graphql(this.schema, this.expression)
    this.data = data

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

  isGraphQLQuery (expression) {
    return typeof expression === 'string' &&
      expression.length > 1 &&
      expression[0] === '{' &&
      expression[expression.length - 1] === '}'
  }

  async sendQuery (channel, ackId) {
    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      value: this.data,
      ackId
    }

    this.sendOp(op, channel)
  }

  async fetch (channel, docIds, ackId) {
    await this.sendQuery(channel, ackId)

    this.maybeUnattach()
  }

  async subscribe (channel, docIds, ackId) {
    this.channels.push(channel)
    for (let subscribe of this.subscribes) {
      subscribe.subscribe(channel)
    }

    await this.sendQuery(channel, ackId)
  }

  unsubscribe (channel) {
    arrayRemove(this.channels, channel)

    this.maybeUnattach()
  }
}

export default ServerGraphQLQuery
