let debug = require('debug')('MutableDoc')
import Doc from './Doc'

class MutableDoc extends Doc {
  constructor (docId, ops, collection, model) {
    super(docId, ops)
    this.collection = collection
    this.model = model
  }

  async set (field, value) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      value
    })

    return this.onOp(op)
  }

  async del (field) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId
    })

    if (field) op.field = field

    return this.onOp(op)
  }

  async increment (field, value) {
    let op = this.model.createOp({
      type: 'increment',
      collectionName: this.collection.name,
      docId: this.docId,
      value
    })

    if (field) op.field = field

    return this.onOp(op)
  }

  stringInsert (field, index, value, diff) {
    let chars = this.getFieldChars(field)
    let positionId

    if (chars && chars[index - 1]) {
      positionId = chars[index - 1].charId
    }

    let ops = []
    let type = 'stringInsert'

    for (let value of value.split('')) {
      let charId = this.model.id()

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId,
        charId,
        value
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      ops.push(op)
      positionId = charId
    }

    if (diff) return ops

    this.applyOps(ops)

    this.emit(type, index, value.length)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let promises = []
    for (let op of ops) {
      let promise = this.model.send(op)
      promises.push(promise)
    }
    return Promise.all(promises)
  }

  stringRemove (field, index, howMany, diff) {
    let chars = this.getFieldChars(field)
    let ops = []
    let type = 'stringRemove'

    for (let i = index; i < index + howMany; i++) {
      let positionId
      if (chars && chars[i]) {
        positionId = chars[i].charId
      }
      if (!positionId) continue

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId,
        value: howMany
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      ops.push(op)
    }

    if (diff) return ops

    this.applyOps(ops)

    this.emit(type, index, howMany)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let promises = []
    for (let op of ops) {
      let promise = this.model.send(op)
      promises.push(promise)
    }
    return Promise.all(promises)
  }

  stringDiff (field, value) {
    let state = this.state
    let previous = ''
    if (!field && typeof state === 'string') previous = state
    else if (field) {
      if (!state || typeof state !== 'object') state = {}
      this.applyFnToStateField(state, field, (part, current) => {
        if (typeof current[part] === 'string') previous = current[part]
      })
    }

    if (previous === value) return
    let start = 0
    while (previous.charAt(start) === value.charAt(start)) {
      start++
    }
    let end = 0
    while (
      previous.charAt(previous.length - 1 - end) === value.charAt(value.length - 1 - end) &&
      end + start < previous.length &&
      end + start < value.length
    ) {
      end++
    }

    if (previous.length !== start + end) {
      let howMany = previous.length - start - end
      this.stringRemove(field, start, howMany)
    }
    if (value.length !== start + end) {
      let inserted = value.slice(start, value.length - end)
      this.stringInsert(field, start, inserted)
    }
  }

  refresh () {
    this.refreshState()
    this.emit('change')
  }

  async onOp (op) {
    debug('onOp', op)
    this.applyOp(op)
    this.emit('change')
    this.collection.emit('change', op)
    return this.save()
  }

  async save () {
    if (!this.model.storage || !this.ops.length) return
    debug('save', this.state, this.ops)
    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(() => this.saveToStorage(), this.model.options.clientSaveDebounceTimeout)
  }

  async saveToStorage () {
    return this.model.storage
      .saveDoc(this.collection.name, this.docId, this.ops, this.serverVersion)
      .catch((err) => {
        console.error('MutableDoc.save', this.collection.name, err)
        console.log(`Probably, you have not added collection ${this.collection.name}
          to store options. For IndexedDB app version should be increased also`)
      })
  }
}

export default MutableDoc
