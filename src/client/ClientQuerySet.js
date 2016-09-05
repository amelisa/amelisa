import LocalQuery from './LocalQuery'
import RemoteGraphQLQuery from './RemoteGraphQLQuery'
import RemoteQuery from './RemoteQuery'
import RemoteJoinQuery from './RemoteJoinQuery'
import UrlQuery from './UrlQuery'
import { isLocalCollection } from '../util'

class ClientQuerySet {
  constructor (model) {
    this.model = model
    this.data = {}
  }

  getOrCreateQuery (collectionName, expression) {
    let isUrlQuery = UrlQuery.prototype.isUrlQuery(collectionName, expression)
    let isGraphQLQuery = !isUrlQuery &&
      RemoteGraphQLQuery.prototype.isGraphQLQuery(collectionName, expression)
    let isJoinQuery = !isUrlQuery &&
      !isGraphQLQuery &&
      this.model.dbQueries.isJoinQuery(expression)

    // if (isGraphQLQuery) collectionName = RemoteGraphQLQuery.prototype.removeWhitespaces(collectionName)
    if (!isGraphQLQuery && !expression) expression = this.model.dbQueries.getAllSelector()

    let hash = this.getQueryHash(collectionName, expression)
    let query = this.data[hash]

    if (!query) {
      query = this.createQuery(collectionName, expression, isUrlQuery, isGraphQLQuery, isJoinQuery)

      if (this.queryDatas && this.queryDatas[hash]) query.data = this.queryDatas[hash]

      this.data[hash] = query
    }

    return query
  }

  createQuery (collectionName, expression, isUrlQuery, isGraphQLQuery, isJoinQuery) {
    if (isUrlQuery) {
      return new UrlQuery(collectionName, expression, this.model)
    }

    if (isGraphQLQuery) {
      return new RemoteGraphQLQuery(collectionName, expression, this.model, this)
    }

    let collection = this.model.collectionSet.getOrCreateCollection(collectionName)

    // TODO: add local join query
    if (isJoinQuery) {
      return new RemoteJoinQuery(collectionName, expression, this.model, collection, this)
    }

    if (isLocalCollection(collectionName)) {
      return new LocalQuery(collectionName, expression, this.model, collection, this)
    }

    return new RemoteQuery(collectionName, expression, this.model, collection, this)
  }

  unattach (collectionName, expression) {
    let hash = this.getQueryHash(collectionName, expression)
    let query = this.data[hash]
    query.collection.removeListener('change', query.listener)
    delete this.data[hash]
  }

  getSyncData () {
    let data = {}

    for (let hash in this.data) {
      let query = this.data[hash]

      // url query
      if (!query.collectionName) continue

      if (isLocalCollection(query.collectionName)) continue
      if (!query.subscribed) continue
      data[hash] = query.getSyncData()
    }

    return data
  }

  getQueryHash (collectionName, expression) {
    let args = [collectionName, expression]
    return JSON.stringify(args).replace(/\./g, '|')
  }

  isQuery (collectionName, expression) {

  }

  bundle () {
    let data = {}

    for (let hash in this.data) {
      let query = this.data[hash]
      data[hash] = query.get()
    }

    return data
  }

  unbundle (data) {
    this.queryDatas = data
  }
}

export default ClientQuerySet
