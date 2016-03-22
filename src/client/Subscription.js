import MutableDoc from './MutableDoc'
import ClientQuery from './ClientQuery'
import UrlQuery from './UrlQuery'
import { parsePath } from '../util'
import { EventEmitter } from 'events'

class Subscription extends EventEmitter {
  constructor (rawSubscribes, collectionSet, querySet) {
    super()
    this.collectionSet = collectionSet
    this.querySet = querySet

    this.subscribes = this.parseRawSubscribes(rawSubscribes)

    this.onChange = this.onChange.bind(this)
  }

  parseRawSubscribes (rawSubscribes) {
    let subscribes = []

    if (Array.isArray(rawSubscribes) &&
      rawSubscribes.length === 1 &&
      Array.isArray(rawSubscribes[0])) {
      rawSubscribes = rawSubscribes[0]
    }

    for (let subscribe of rawSubscribes) {
      if (subscribe instanceof MutableDoc || subscribe instanceof ClientQuery) {
        subscribes.push(subscribe)
        continue
      }

      if (Array.isArray(subscribe) && typeof subscribe[0] === 'string' &&
          (subscribe[0].indexOf('http') === 0 || subscribe[0].indexOf('/') === 0)) {
        let [url, defaultValue] = subscribe
        let urlQuery = new UrlQuery(url, defaultValue, this.collectionSet.model)
        subscribes.push(urlQuery)
      } else {
        let [collectionName, docIdOrExpression] = parsePath(subscribe)

        if (typeof docIdOrExpression === 'string') {
          let doc = this.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression)
          subscribes.push(doc)
        } else {
          let query = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression)
          subscribes.push(query)
        }
      }
    }

    return subscribes
  }

  async fetch () {
    return Promise.all(this.subscribes.map((subscribe) => subscribe.fetch()))
  }

  async subscribe () {
    return Promise.all(
      this.subscribes.map((subscribe) => {
        subscribe.on('change', this.onChange)
        return subscribe.subscribe()
      })
    )
  }

  async unsubscribe () {
    return Promise.all(
      this.subscribes.map((subscribe) => {
        subscribe.removeListener('change', this.onChange)
        return subscribe.unsubscribe()
      })
    )
  }

  onChange () {
    this.emit('change')
  }

  async changeSubscribes (nextRawSubscribes) {
    this.unsubscribe()
    this.subscribes = this.parseRawSubscribes(nextRawSubscribes)
    return this.subscribe()
  }

  get () {
    return this.subscribes.map((subscribe) => subscribe.get())
  }
}

export default Subscription
