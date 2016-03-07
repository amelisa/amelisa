let debug = require('debug')('MutableDoc')
import ArrayDiff from 'array-diff'
import Doc from './Doc'

let arrayDiff = ArrayDiff({compress: true})

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
    index--
    let chars = this.stringFieldChars[field]
    let positionId

    if (chars && chars[index]) {
      positionId = chars[index].charId
    }

    let promises = []
    let ops = []

    for (let value of value.split('')) {
      let charId = this.model.id()

      let op = this.model.createOp({
        type: 'stringInsert',
        collectionName: this.collection.name,
        docId: this.docId,
        charId,
        value
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      if (diff) {
        ops.push(op)
      } else {
        let promise = this.onOp(op)
        promises.push(promise)
      }
      positionId = charId
    }

    if (diff) return ops

    return Promise.all(promises)
  }

  stringRemove (field, index, howMany, diff) {
    let chars = this.stringFieldChars[field]
    let promises = []
    let ops = []

    for (let i = index; i < index + howMany; i++) {
      let positionId
      if (chars && chars[i]) {
        positionId = chars[i].charId
      }
      if (!positionId) continue

      let op = this.model.createOp({
        type: 'stringRemove',
        collectionName: this.collection.name,
        docId: this.docId,
        value: howMany
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      if (diff) {
        ops.push(op)
      } else {
        let promise = this.onOp(op)
        promises.push(promise)
      }
    }

    if (diff) return ops

    return Promise.all(promises)
  }

  stringDiff (field, text) {
    let state = this.state
    let fieldState = ''
    if (!field && typeof state === 'string') fieldState = state
    else if (field) {
      let parts = field.split('.')
      if (!state) state = {}
      let current = state
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          if (typeof current[part] === 'string') fieldState = current[part]
        } else {
          if (typeof current[part] === 'object') {
            current = current[part]
          } else {
            current[part] = {}
            current = current[part]
          }
        }
      })
    }

    let diffs = arrayDiff(fieldState.split(''), text.split(''))

    let index = 0
    let ops = []
    for (let diff of diffs) {
      let [ operation, values ] = diff

      switch (operation) {
        case '=':
          index = index + values.length
          break
        case '-':
          let removeOps = this.stringRemove(field, index, values.length, true)
          ops = ops.concat(removeOps)
          index = index + values.length
          break
        case '+':
          let insertOps = this.stringInsert(field, index, values.join(''), true)
          ops = ops.concat(insertOps)
          index = index + values.length
          break
      }
    }

    this.applyOps(ops)
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
