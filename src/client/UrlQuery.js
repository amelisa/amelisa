import { EventEmitter } from 'events'

const options = {
  credentials: 'include'
}

class UrlQuery extends EventEmitter {
  constructor (url, defaultValue, model) {
    super()
    this.url = url
    this.data = defaultValue
    this.model = model
  }

  get () {
    return this.data
  }

  async load () {
    if (!this.model.online) return

    let res = await fetch(this.url, options)
    if (res.status !== 200) {
      throw new Error(`UrlQuery.load: status ${res.status} returned from ${this.url}`)
    }

    this.data = await res.json()
  }

  async fetch () {
    return this.load()
  }

  async subscribe () {
    return this.load()
  }

  async unsubscribe () {}
}

export default UrlQuery
