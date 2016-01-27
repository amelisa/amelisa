// let debug = require('debug')('ClientQuerySet')
import LocalQuery from './LocalQuery'
import RemoteQuery from './RemoteQuery'
import util from './util'

class ClientQuerySet {
  constructor (model) {
    this.model = model
    this.data = {}
  }

  getOrCreateQuery (collectionName, expression) {
    expression = Object.assign({}, expression)
    let hash = queryHash(collectionName, expression)
    let query = this.data[hash]

    if (!query) {
      let collection = this.model.collectionSet.getOrCreateCollection(collectionName)
      if (util.isLocalCollection(collectionName)) {
        query = new LocalQuery(collectionName, expression, this.model, collection, this)
      } else {
        query = new RemoteQuery(collectionName, expression, this.model, collection, this)
      }
      this.data[hash] = query
    }

    return query
  }

  unattach (collectionName, expression) {
    let hash = queryHash(collectionName, expression)
    let query = this.data[hash]
    query.collection.removeListener('change', query.listener)
    delete this.data[hash]
  }

  getSyncData () {
    let data = {}

    for (let hash in this.data) {
      let query = this.data[hash]
      if (util.isLocalCollection(query.collectionName)) continue
      data[hash] = query.getSyncData()
    }

    return data
  }

  sync () {
    for (let hash in this.data) {
      let query = this.data[hash]
      if (!query.local) query.sync()
    }
  }
}

function queryHash (collectionName, expression) {
  let args = [collectionName, expression]
  return JSON.stringify(args).replace(/\./g, '|')
}

export default ClientQuerySet
