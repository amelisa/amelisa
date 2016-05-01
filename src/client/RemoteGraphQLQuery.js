import { graphql } from 'graphql'
import ClientQuery from './ClientQuery'

let defaultSubscribeOptions = {
  fetch: true
}

class RemoteGraphQLQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.subscribed = 0
    this.subscribing = false
    this.subscribes = []
    this.isDocs = false
    let { createSchema } = model
    this.schema = createSchema(this.resolve)
  }

  async refresh () {
    let prevData = this.data

    for (let subscribe of this.subscribes) {
      subscribe.removeListener('change', this.onChange)
      subscribe.unsubscribe()
    }

    let { data } = await graphql(this.schema, this.expression)
    this.data = data

    if (this.dataHasChanged(prevData, this.data)) {
      this.emit('change')
    }
  }

  resolve = (collectionName, docIdOrExpression) => {
    let isQuery = this.model.dbQueries.isQuery(docIdOrExpression)
    let subscribe

    if (isQuery) {
      subscribe = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression)
    } else {
      subscribe = this.model.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression)
    }

    this.subscribes.push(subscribe)
    subscribe.on('change', this.onChange)
    subscribe.subscribe()
    subscribe.subscribing = false

    return subscribe.get()
  };

  onChange = () => {
    if (this.model.online) return
    this.refresh()
  };

  async fetch () {
    if (this.subscribing) return this.subscribingPromise
    this.subscribing = true

    await this.refresh()
    this.lastServerData = this.data

    let op = {
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }

    this.subscribingPromise = this.model.sendOp(op)
    return this.subscribingPromise
  }

  async subscribe (options) {
    options = Object.assign({}, defaultSubscribeOptions, options)
    this.subscribed++
    if (this.subscribing) return options.fetch ? this.subscribingPromise : undefined
    this.subscribing = true
    if (this.subscribed !== 1) return

    await this.refresh()
    this.lastServerData = this.data

    let op = {
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    }

    this.subscribingPromise = this.model.sendOp(op)
    return options.fetch ? this.subscribingPromise : undefined
  }

  async unsubscribe () {
    this.subscribed--
    if (this.subscribed !== 0) return

    super.unsubscribe()

    return this.model.sendOp({
      type: 'qunsub',
      collectionName: this.collectionName,
      expression: this.expression
    })
  }

  onSnapshot (data) {
    this.lastServerData = data
    this.data = data

    this.subscribing = false
    this.emit('change')
  }
}

export default RemoteGraphQLQuery
