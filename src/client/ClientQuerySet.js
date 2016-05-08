import LocalQuery from './LocalQuery'
import RemoteGraphQLQuery from './RemoteGraphQLQuery'
import RemoteQuery from './RemoteQuery'
import { isLocalCollection } from '../util'

class ClientQuerySet {
  constructor (model) {
    this.model = model
    this.data = {}
  }

  getOrCreateQuery (collectionName, expression) {
    let isGraphQLQuery = collectionName.indexOf('{') > -1
    // TODO: remove whitespaces from GraphQL query
    // if (isGraphQLQuery) collectionName = collectionName.replace(/ /g, '').replace(/\n/g, '')

    if (!isGraphQLQuery && !expression) expression = this.model.dbQueries.getAllSelector()

    let hash = this.getQueryHash(collectionName, expression)
    let query = this.data[hash]

    if (!query) {
      query = this.createQuery(collectionName, expression, isGraphQLQuery)

      this.data[hash] = query
    }

    return query
  }

  createQuery (collectionName, expression, isGraphQLQuery) {
    if (isGraphQLQuery) {
      return new RemoteGraphQLQuery(collectionName, expression, this.model, this)
    }

    let collection = this.model.collectionSet.getOrCreateCollection(collectionName)

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
}

export default ClientQuerySet
