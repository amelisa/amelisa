let debug = require('debug')('MutableDoc')
import arraydiff from 'arraydiff'
import Doc from './Doc'
import { ArrayType, StringType } from '../types'

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

  async push (field, value) {
    this.arraySetIfValueIsArray(field)

    let op = this.model.createOp({
      type: 'push',
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      value
    })

    return this.onOp(op)
  }

  async unshift (field, value) {
    this.arraySetIfValueIsArray(field)

    let op = this.model.createOp({
      type: 'unshift',
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      value
    })

    return this.onOp(op)
  }

  async pop (field) {
    this.arraySetIfValueIsArray(field)

    let op = this.model.createOp({
      type: 'pop',
      collectionName: this.collection.name,
      docId: this.docId,
      field
    })

    return this.onOp(op)
  }

  async shift (field) {
    this.arraySetIfValueIsArray(field)

    let op = this.model.createOp({
      type: 'shift',
      collectionName: this.collection.name,
      docId: this.docId,
      field
    })

    return this.onOp(op)
  }

  async insert (field, index, values) {
    this.arraySetIfValueIsArray(field)

    if (!Array.isArray(values)) values = [values]
    let array = this.getInternalAsArrayType(field)
    let positionId = array.getInsertPositionIdByIndex(index)

    let ops = []
    let type = 'insert'

    for (let value of values) {
      let itemId = this.model.id()

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId,
        itemId,
        value
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      ops.push(op)
      positionId = itemId
    }

    this.applyOps(ops)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let op = this.model.createOp({
      type: 'ops',
      opsType: type,
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      ops
    })

    return this.model.send(op)
  }

  async remove (field, index, howMany = 1) {
    this.arraySetIfValueIsArray(field)

    let array = this.getInternalAsArrayType(field)
    let ops = []
    let type = 'remove'

    for (let i = index; i < index + howMany; i++) {
      let positionId = array.getRemovePositionIdByIndex(i)
      if (!positionId) continue

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      ops.push(op)
    }

    this.applyOps(ops)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let op = this.model.createOp({
      type: 'ops',
      opsType: type,
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      ops
    })

    return this.model.send(op)
  }

  async move (field, from, to, howMany = 1) {
    this.arraySetIfValueIsArray(field)

    let array = this.getInternalAsArrayType(field)

    let ops = []
    let type = 'move'

    for (let i = 0; i < howMany; i++) {
      let fromIndex = from + i
      let toIndex = to + i
      let positionId = array.getRemovePositionIdByIndex(fromIndex)
      if (!positionId) continue
      let itemId = array.getInsertPositionIdByIndex(toIndex)

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId,
        positionId
      })

      if (itemId) op.itemId = itemId
      if (field) op.field = field

      ops.push(op)
    }

    this.applyOps(ops)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let op = this.model.createOp({
      type: 'ops',
      opsType: type,
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      ops
    })

    return this.model.send(op)
  }

  async arraySet (field, value) {
    let array = new ArrayType()
    array.setValue(value, this.model.id)

    let op = this.model.createOp({
      type: 'arraySet',
      collectionName: this.collection.name,
      docId: this.docId,
      value: array.getArraySetValue()
    })

    if (field) op.field = field

    return this.onOp(op)
  }

  arrayDiff (field, value) {
    let previous = this.get(field)
    if (!Array.isArray(previous)) previous = []

    let diffs = arraydiff(previous, value)

    for (let diff of diffs) {
      switch (diff.type) {
        case 'insert':
          this.insert(field, diff.index, diff.values)
          break
        case 'remove':
          this.remove(field, diff.index, diff.howMany)
          break
        case 'move':
          this.move(field, diff.from, diff.to, diff.howMany)
          break
      }
    }
  }

  async invert (field) {
    let op = this.model.createOp({
      type: 'invert',
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

  async stringInsert (field, index, value) {
    let howMany = value.length
    let string = this.getInternal(field)
    if (!(string instanceof StringType)) {
      if (typeof string === 'string') {
        this.stringSet(field, string)
        string = this.getInternal(field)
      } else {
        this.stringSet(field, '')
        string = this.getInternal(field)
      }
    }

    let positionId = string.getInsertPositionIdByIndex(index)

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

    this.applyOps(ops)

    this.emit(type, index, howMany)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let op = this.model.createOp({
      type: 'ops',
      opsType: type,
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      ops,
      index,
      howMany
    })

    return this.model.send(op)
  }

  async stringRemove (field, index, howMany = 1) {
    let string = this.getInternal(field)
    if (!(string instanceof StringType)) {
      if (typeof string === 'string') {
        this.stringSet(field, string)
        string = this.getInternal(field)
      } else {
        this.stringSet(field, '')
        string = this.getInternal(field)
      }
    }

    let ops = []
    let type = 'stringRemove'

    for (let i = index; i < index + howMany; i++) {
      let positionId = string.getRemovePositionIdByIndex(i)
      if (!positionId) continue

      let op = this.model.createOp({
        type,
        collectionName: this.collection.name,
        docId: this.docId
      })

      if (field) op.field = field
      if (positionId) op.positionId = positionId

      ops.push(op)
    }

    this.applyOps(ops)

    this.emit(type, index, howMany)

    this.emit('change')
    this.collection.emit('change')
    this.save()

    let op = this.model.createOp({
      type: 'ops',
      opsType: type,
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      ops,
      index,
      howMany
    })

    return this.model.send(op)
  }

  async stringSet (field, value) {
    let string = new StringType()
    string.setValue(value, this.model.id)

    let op = this.model.createOp({
      type: 'stringSet',
      collectionName: this.collection.name,
      docId: this.docId,
      value: string.getStringSetValue()
    })

    if (field) op.field = field

    return this.onOp(op)
  }

  stringDiff (field, value) {
    let previous = this.get(field)
    if (typeof previous !== 'string') previous = ''

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

  richDiff (field, value) {
    let previous = this.get(field)
    if (!Array.isArray(previous)) previous = []

    // TODO: implement
  }

  arraySetIfValueIsArray (field) {
    let previous = this.getInternal(field)
    if (!(previous instanceof ArrayType)) {
      if (Array.isArray(previous)) {
        this.arraySet(field, previous)
      }
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
