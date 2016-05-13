import ClientQuery from './ClientQuery'
let execute
let Source
let parse
try {
  execute = require('graphql').execute
  Source = require('graphql').Source
  parse = require('graphql').parse
} catch (err) {}

const defaultSubscribeOptions = {
  fetch: true
}

class RemoteGraphQLQuery extends ClientQuery {
  constructor (graphqlQuery, queryOptions = {}, model, querySet) {
    super(null, null, model, null, querySet)

    if (!execute) throw new Error("To use GraphQL, please, install 'graphql' package")

    this.graphqlQuery = graphqlQuery
    this.queryOptions = queryOptions
    this.subscribed = 0
    this.fetching = false
    this.subscribes = []
    this.isDocs = false

    let { createSchema } = model
    this.schema = createSchema(this.resolve)

    this.refresh()
  }

  async refresh () {
    if (!this.schema) return

    let prevData = this.data

    for (let subscribe of this.subscribes) {
      subscribe.removeListener('change', this.onChange)
      subscribe.unsubscribe()
    }

    let { rootValue, contextValue, variableValues, operationName } = this.queryOptions

    let source = new Source(this.graphqlQuery)
    let documentAST = parse(source)

    let { data } = await execute(this.schema, documentAST, rootValue,
      contextValue, variableValues, operationName)
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
    subscribe.subscribe()
    subscribe.on('change', this.onChange)
    subscribe.fetching = false

    return subscribe.get()
  };

  onChange = () => {
    if (this.model.online) return
    this.refresh()
  };

  async fetch () {
    if (this.fetching) return this.fetchingPromise
    this.fetching = true

    await this.refresh()
    this.lastServerData = this.data

    let op = {
      type: 'qfetch',
      collectionName: this.graphqlQuery,
      expression: this.queryOptions
    }

    this.fetchingPromise = this.model.sendOp(op)
    return this.fetchingPromise
  }

  async subscribe (options) {
    options = {...defaultSubscribeOptions, ...options}
    this.subscribed++
    if (this.fetching) return options.fetch ? this.fetchingPromise : undefined
    this.fetching = true
    if (this.subscribed !== 1) return

    await this.refresh()
    this.lastServerData = this.data

    let op = {
      type: 'qsub',
      collectionName: this.graphqlQuery,
      expression: this.queryOptions
    }

    this.fetchingPromise = this.model.sendOp(op)
    return options.fetch ? this.fetchingPromise : undefined
  }

  async unsubscribe () {
    this.subscribed--
    if (this.subscribed !== 0) return

    super.unsubscribe()

    return this.model.sendOp({
      type: 'qunsub',
      collectionName: this.graphqlQuery,
      expression: this.queryOptions
    })
  }

  onSnapshot (data) {
    this.lastServerData = data
    this.data = data

    this.fetching = false
    this.emit('change')
  }

  isGraphQLQuery (graphqlQuery) {
    return graphqlQuery &&
      typeof graphqlQuery === 'string' &&
      graphqlQuery.indexOf('{') > -1
  }

  removeWhitespaces (graphqlQuery) {
    return graphqlQuery.replace(/ /g, '').replace(/\n/g, '')
  }
}

export default RemoteGraphQLQuery
