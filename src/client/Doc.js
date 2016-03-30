import { EventEmitter } from 'events'
import { ArrayType, BooleanType, NumberType, StringType } from '../types'
import { deepClone } from '../util'

class Doc extends EventEmitter {
  constructor (docId, ops = []) {
    super()

    this.docId = docId
    this.ops = ops
    this.refreshState()
  }

  get (field) {
    if (this.state && this.state._del) return

    if (field === '_id') return this.docId

    let value = this.getInternal(field)

    value = this.getValue(value)

    if (!field && typeof value === 'object' && !Array.isArray(value)) {
      value._id = this.docId
    }

    return value
  }

  getValue (value) {
    if (value instanceof ArrayType) return this.getValue(value.get())
    if (value instanceof BooleanType) return value.get()
    if (value instanceof NumberType) return value.get()
    if (value instanceof StringType) return value.get()

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((item) => this.getValue(item))
      }

      let object = {}
      for (let key in value) {
        object[key] = this.getValue(value[key])
      }
      return object
    }

    return value
  }

  getForSave () {
    if (this.state && this.state._del) {
      return {
        _id: this.docId,
        _del: true
      }
    }

    return this.get()
  }

  getInternal (field) {
    if (!field) return this.state

    let parts = field.split('.')
    let value = this.state

    for (let part of parts) {
      if (!value) return
      if (value instanceof ArrayType) {
        value = value.getByIndex(part)
      } else {
        value = value[part]
      }
    }

    return value
  }

  getInternalAsArrayType (field) {
    let array = this.getInternal(field)

    if (!(array instanceof ArrayType)) {
      array = new ArrayType()
      this.setValueToField(field, array)
    }

    return array
  }

  getInternalAsStringType (field) {
    let string = this.getInternal(field)

    if (!(string instanceof StringType)) {
      string = new StringType()
      this.setValueToField(field, string)
    }

    return string
  }

  distillableOpType (type) {
    return type === 'add' || type === 'set' || type === 'del' ||
      type === 'arraySet' || type === 'stringSet'
  }

  distillOps () {
    let ops = this.ops.slice()

    ops.sort(sortByDate).reverse()

    let docRewrited = false
    let fields = {}
    let opIds = {}
    let distilledOps = []

    for (let op of ops) {
      // undefined op
      if (!op) continue

      let { id, type, field } = op

      // dublicate ops
      if (opIds[id]) continue
      opIds[id] = true

      if (!field) {
        if (docRewrited) continue

        distilledOps.push(op)
        if (this.distillableOpType(type)) docRewrited = true
        continue
      }

      let parts = field.split('.')

      let current
      let skip = false
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) {
          current = parts[i]
        } else {
          current += '.' + parts[i]
        }
        if (fields[current]) {
          skip = true
          break
        }
      }

      if (skip) continue

      distilledOps.push(op)
      if (this.distillableOpType(type)) fields[field] = true
    }

    distilledOps.sort(sortByDate)

    this.ops = distilledOps
  }

  refreshState () {
    let ops = this.ops

    ops.sort(sortByDate)

    this.state = undefined

    for (let op of ops) {
      this.applyOpToState(op)
    }
  }

  applyOpToState (op) {
    let state = this.state

    let { type, field, value, charId, itemId, positionId } = op

    let fieldState = state

    if (field) {
      let parts = field.split('.')

      for (let part of parts) {
        if (fieldState) {
          if (fieldState instanceof ArrayType) {
            fieldState = fieldState.getByPositionId(part)
          } else {
            fieldState = fieldState[part]
          }
        }
      }
    }

    if (state && state._del) state = undefined

    switch (type) {
      case 'add':
        fieldState = deepClone(value)
        break

      case 'set':
        fieldState = deepClone(value)

        break

      case 'del':
        if (!field) {
          fieldState = {
            _del: true
          }
        }
        break

      case 'push':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.push(itemId, value)
        break

      case 'unshift':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.unshift(itemId, value)
        break

      case 'pop':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.pop()
        break

      case 'shift':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.shift()
        break

      case 'insert':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.insert(positionId, itemId, value)
        break

      case 'remove':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.remove(positionId)
        break

      case 'move':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.move(positionId, itemId)
        break

      case 'arraySet':
        if (!(fieldState instanceof ArrayType)) fieldState = new ArrayType()

        fieldState.setArraySetValue(value)
        break

      case 'invert':
        if (!(fieldState instanceof BooleanType)) fieldState = new BooleanType(fieldState)

        fieldState.invert(value)
        break

      case 'increment':
        if (!(fieldState instanceof NumberType)) fieldState = new NumberType(fieldState)

        fieldState.increment(value)
        break

      case 'stringInsert':
        if (!(fieldState instanceof StringType)) fieldState = new StringType()

        fieldState.insert(positionId, charId, value)
        break

      case 'stringRemove':
        if (!(fieldState instanceof StringType)) fieldState = new StringType()

        fieldState.remove(positionId)
        break

      case 'stringSet':
        if (!(fieldState instanceof StringType)) fieldState = new StringType()

        fieldState.setStringSetValue(value)
        break
    }

    if (field) {
      if (!state || typeof state !== 'object') state = {}
      if (type === 'del') {
        this.applyFnToStateField(state, field, (part, current) => {
          if (current instanceof ArrayType) {
            current.del(part)
          } else {
            delete current[part]
          }
        })
      } else {
        this.applyFnToStateField(state, field, (part, current) => {
          if (current instanceof ArrayType) {
            current.set(part, fieldState)
          } else {
            current[part] = fieldState
          }
        })
      }
    } else {
      state = fieldState
    }

    this.state = state
    this.stateDate = op.date
  }

  setValueToField (field, value) {
    if (field) {
      if (!this.state || typeof this.state !== 'object') this.state = {}
      this.applyFnToStateField(this.state, field, (part, current) => current[part] = value)
    } else {
      this.state = value
    }
  }

  applyFnToStateField (state, field, fn) {
    let parts = field.split('.')
    let current = state
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        fn(part, current)
      } else {
        if (current instanceof ArrayType) {
          let value = current.getByPositionId(part)
          if (typeof value === 'object') {
            current = value
          } else {
            let value = {}
            current.set(part, value)
            current = value
          }
        } else {
          if (typeof current[part] === 'object') {
            current = current[part]
          } else {
            current[part] = {}
            current = current[part]
          }
        }
      }
    })
  }

  applyOp (op) {
    this.ops.push(op)
    if (!this.distillableOpType(op.type) && this.stateDate && op.date > this.stateDate) {
      this.applyOpToState(op)
    } else {
      this.distillOps()
      this.refreshState()
    }
  }

  applyOps (ops, opsType) {
    if (!ops.length) return
    ops.sort(sortByDate)
    this.ops = this.ops.concat(ops)
    let firstOp = ops[0]
    if (!this.distillableOpType(opsType) && this.stateDate && firstOp.date > this.stateDate) {
      for (let op of ops) {
        this.applyOpToState(op)
      }
    } else {
      this.distillOps()
      this.refreshState()
    }
  }

  version () {
    return this.getVersionFromOps(this.ops)
  }

  getVersionFromOps (ops) {
    let map = {}

    for (let op of ops) {
      let source = op.source
      let date = op.date

      if (!map[source] || date > map[source]) {
        map[source] = date
      }
    }

    // TODO: limit length of versions
    let versions = []
    for (let source in map) {
      let date = map[source]
      versions.push(source + ' ' + date)
    }

    return versions.join('|')
  }

  getVersionMap (version) {
    let map = {}

    if (!version) return map

    let versions = version.split('|')

    for (let version of versions) {
      let versionArray = version.split(' ')
      let source = versionArray[0]
      let date = +versionArray[1]
      map[source] = date
    }

    return map
  }

  getOpsToSend (version) {
    let opsToSend = []
    let versionMap = this.getVersionMap(version)

    for (let op of this.ops) {
      let versionDate = versionMap[op.source]
      if (!versionDate || versionDate < op.date) {
        opsToSend.push(op)
      }
    }

    return opsToSend
  }

  bundle () {
    return {
      ops: this.ops
    }
  }
}

function sortByDate (op1, op2) {
  if (op1.date > op2.date) return 1
  if (op1.date < op2.date) return -1

  // even if ops have same timestamp, we should sort them
  // in predictable way, let's use source for this
  if (op1.source > op2.source) return 1
  if (op1.source < op2.source) return -1

  // it should never get here in normal situations
  // TODO: fix tests, so it never gets here
  return 0
}

export default Doc
