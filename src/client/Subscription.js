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

    this.parseRawSubscribes(rawSubscribes)
  }

  parseRawSubscribes (rawSubscribes) {
    let subscribes = []
    let subscribeOptionses = []

    if (Array.isArray(rawSubscribes) &&
      rawSubscribes.length === 1 &&
      Array.isArray(rawSubscribes[0])) {
      rawSubscribes = rawSubscribes[0]
    }

    for (let rawSubscribe of rawSubscribes) {
      let subscribe
      let subscribeOptions
      if (rawSubscribe instanceof MutableDoc || rawSubscribe instanceof ClientQuery) {
        subscribe = rawSubscribe
      } else if (Array.isArray(rawSubscribe) && typeof rawSubscribe[0] === 'string' &&
          (rawSubscribe[0].indexOf('http') === 0 || rawSubscribe[0].indexOf('/') === 0)) {
        let [url, defaultValue, options] = rawSubscribe
        subscribe = new UrlQuery(url, defaultValue, this.collectionSet.model)
        subscribeOptions = options
      } else if (typeof rawSubscribe === 'object' && !Array.isArray(rawSubscribe)) {
        this.options = rawSubscribe
        continue
      } else {
        let [collectionName, docIdOrExpression, options, options2] = parsePath(rawSubscribe)

        if (typeof docIdOrExpression === 'string') {
          subscribe = this.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression)
          subscribeOptions = options2 || options
        } else {
          subscribe = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression)
          subscribeOptions = options2 || options
        }
      }
      subscribes.push(subscribe)
      subscribeOptionses.push(subscribeOptions)
    }

    this.subscribes = subscribes
    this.subscribeOptionses = subscribeOptionses
  }

  async fetch () {
    return Promise.all(this.subscribes.map((subscribe) => subscribe.fetch()))
  }

  async subscribe () {
    let promises = []

    for (let i = 0; i < this.subscribes.length; i++) {
      let subscribe = this.subscribes[i]
      subscribe.on('change', this.onChange)

      let subscribeOptions = this.subscribeOptionses[i]
      subscribeOptions = Object.assign({}, this.options, subscribeOptions)

      let promise = subscribe.subscribe(subscribeOptions)
      promises.push(promise)
    }

    return Promise.all(promises)
  }

  async unsubscribe () {
    return Promise.all(
      this.subscribes.map((subscribe) => {
        subscribe.removeListener('change', this.onChange)
        return subscribe.unsubscribe()
      })
    )
  }

  onChange = () => {
    this.emit('change')
  };

  async changeSubscribes (nextRawSubscribes) {
    this.unsubscribe()
    this.parseRawSubscribes(nextRawSubscribes)
    return this.subscribe()
  }

  get () {
    return this.subscribes.map((subscribe) => subscribe.get())
  }
}

export default Subscription
