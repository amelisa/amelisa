// let debug = require('debug')('ServerQuerySet')
import MongoQueries from './MongoQueries'
import ProjectedQuery from './ProjectedQuery'
import ProjectedJoinQuery from './ProjectedJoinQuery'
import ServerJoinQuery from './ServerJoinQuery'
import ServerQuery from './ServerQuery'

class ServerQuerySet {
  constructor (store, storage) {
    this.store = store
    this.storage = storage
    this.data = {}
  }

  getOrCreateQuery (collectionName, expression) {
    let hash = queryHash(collectionName, expression)
    let query = this.data[hash]
    // debug('getOrCreateQuery', collectionName, expression)

    if (!query) {
      let joinQuery = MongoQueries.prototype.isJoinQuery(expression)
      let projection = this.store.projections[collectionName]
      if (projection && !joinQuery) {
        query = new ProjectedQuery(collectionName, projection, expression,
          this.store, this.storage, this)
      } else if (projection && joinQuery) {
        let joinFields = MongoQueries.prototype.getJoinFields(expression)
        query = new ProjectedJoinQuery(collectionName, projection, expression,
          this.store, this.storage, this, joinFields)
      } else if (joinQuery) {
        let joinFields = MongoQueries.prototype.getJoinFields(expression)
        query = new ServerJoinQuery(collectionName, expression,
          this.store, this.storage, this, joinFields)
      } else {
        query = new ServerQuery(collectionName, expression,
          this.store, this.storage, this)
      }

      this.data[hash] = query
    }

    if (query.loaded) return Promise.resolve(query)

    return new Promise((resolve, reject) => {
      query.once('loaded', () => {
        resolve(query)
      })
    })
  }

  unattach (collectionName, expression) {
    let hash = queryHash(collectionName, expression)
    delete this.data[hash]
  }

  channelClose (channel) {
    for (let hash in this.data) {
      let query = this.data[hash]

      query.unsubscribe(channel)
    }
  }

  onOp (op) {
    for (let hash in this.data) {
      let query = this.data[hash]
      if (query.collectionName === op.collectionName ||
        query.projectionCollectionName === op.collectionName) {
        // if query is loading now, we need to load it one more time with new data
        if (query.loading) {
          query.once('loaded', () => {
            query.load()
          })
        } else {
          query.load()
        }
      }
    }
  }
}

function queryHash (collectionName, expression) {
  var args = [collectionName, expression]
  return JSON.stringify(args).replace(/\./g, '|')
}

export default ServerQuerySet
