import { EventEmitter } from 'events'

const fetchOptions = {
  credentials: 'include'
}

const defaultSubscribeOptions = {
  fetch: true
}

class UrlQuery extends EventEmitter {
  constructor (url, defaultValue, model) {
    super()
    this.url = url
    this.data = defaultValue
    this.model = model
    this.fetching = false
  }

  get () {
    return this.data
  }

  async load () {
    if (!this.model.online) return
    this.fetching = true

    let res = await fetch(this.url, fetchOptions)
    if (res.status !== 200) {
      this.fetching = false
      return
    }

    try {
      this.data = await res.json()
    } catch (err) {
      this.fetching = false
      return
    }
    this.fetching = false
  }

  async fetch () {
    if (this.fetching) return this.fetchingPromise

    return this.load()
  }

  async subscribe (options) {
    options = {...defaultSubscribeOptions, ...options}
    if (this.fetching) return options.fetch ? this.fetchingPromise : undefined

    this.fetchingPromise = this.load()
    return options.fetch ? this.fetchingPromise : undefined
  }

  async unsubscribe () {}

  isUrlQuery (url, defaultValue) {
    return url &&
      typeof url === 'string' &&
      (url.indexOf('http') === 0 || url.indexOf('/') === 0)
  }
}

export default UrlQuery
