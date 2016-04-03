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
        let [url, defaultValue, options] = subscribe
        let urlQuery = new UrlQuery(url, defaultValue, this.collectionSet.model)
        urlQuery.subscribeOptions = options
        subscribes.push(urlQuery)
      } else if (typeof subscribe === 'object' && !Array.isArray(subscribe)) {
        this.options = subscribe
      } else {
        let [collectionName, docIdOrExpression, options] = parsePath(subscribe)

        if (typeof docIdOrExpression === 'string') {
          let doc = this.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression)
          doc.subscribeOptions = options
          subscribes.push(doc)
        } else {
          let query = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression)
          query.subscribeOptions = options
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

        let subscribeOptions = Object.assign({}, this.options, subscribe.subscribeOptions)
        return subscribe.subscribe(subscribeOptions)
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
