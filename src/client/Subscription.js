// let debug = require('debug')('Subscription')
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

    let first = rawSubscribes[0]
    if (!first) return []
    if (Array.isArray(first[0])) rawSubscribes = first
    if (typeof first === 'string' && first.indexOf('.') === -1) rawSubscribes = [rawSubscribes]

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

  fetch () {
    return Promise.all(this.subscribes.map((subscribe) => subscribe.fetch()))
  }

  subscribe () {
    return Promise.all(
      this.subscribes.map((subscribe) => {
        subscribe.on('change', this.onChange)
        return subscribe.subscribe()
      })
    )
  }

  unsubscribe () {
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

  changeSubscribes (nextRawSubscribes) {
    this.unsubscribe()
    this.subscribes = this.parseRawSubscribes(nextRawSubscribes)
    return this.subscribe()
  }

  get () {
    return this.subscribes.map((subscribe) => subscribe.get())
  }
}

export default Subscription
