import eventToPromise from 'event-to-promise'
import ProjectedQuery from './ProjectedQuery'
import ProjectedJoinQuery from './ProjectedJoinQuery'
import ServerJoinQuery from './ServerJoinQuery'
import ServerGraphQLQuery from './ServerGraphQLQuery'
import ServerQuery from './ServerQuery'

class ServerQuerySet {
  constructor (store) {
    this.store = store
    this.data = {}
  }

  async getOrCreateQuery (collectionName, expression) {
    let hash = this.getQueryHash(collectionName, expression)
    let query = this.data[hash]

    if (!query) {
      query = this.createQuery(collectionName, expression)
      this.data[hash] = query
    }

    if (query.loaded) return query

    await eventToPromise(query, 'loaded')

    return query
  }

  createQuery (collectionName, expression) {
    // TODO: validate graphql
    let isGraphQLQuery = typeof expression === 'string'

    if (isGraphQLQuery) {
      return new ServerGraphQLQuery(collectionName, expression, this.store, this)
    }

    let projection = this.store.projections[collectionName]
    let isJoinQuery = this.store.dbQueries.isJoinQuery(expression)
    let joinFields = isJoinQuery ? this.store.dbQueries.getJoinFields(expression) : null

    if (projection && !isJoinQuery) {
      return new ProjectedQuery(collectionName, projection, expression, this.store, this)
    }

    if (projection && isJoinQuery) {
      return new ProjectedJoinQuery(collectionName, projection, expression, this.store, this, joinFields)
    }

    if (isJoinQuery) {
      return new ServerJoinQuery(collectionName, expression, this.store, this, joinFields)
    }

    return new ServerQuery(collectionName, expression, this.store, this)
  }

  unattach (collectionName, expression) {
    let hash = this.getQueryHash(collectionName, expression)
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

  getQueryHash (collectionName, expression) {
    let args = [collectionName, expression]
    return JSON.stringify(args).replace(/\./g, '|')
  }
}

export default ServerQuerySet
