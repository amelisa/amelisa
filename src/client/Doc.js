// let debug = require('debug')('Doc')
import { EventEmitter } from 'events'
import { Text } from '../types'
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

    if (!field && typeof value === 'object') {
      value._id = this.docId
    }

    return value
  }

  getValue (value) {
    if (value instanceof Text) return value.get()

    if (typeof value === 'object') {
      let object = {}
      for (let key in value) {
        object[key] = this.getValue(value[key])
      }
      return object
    }

    return value
  }

  getInternal (field) {
    if (!field) return this.state

    let parts = field.split('.')
    let value = this.state

    for (let part of parts) {
      if (!value) return
      value = value[part]
    }

    return value
  }

  getInternalAsText (field) {
    let text = this.getInternal(field)

    if (!(text instanceof Text)) {
      text = new Text()
      this.setValueToField(field, text)
    }

    return text
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

      if (type === 'add') {
        if (docRewrited) continue

        distilledOps.push(op)
        docRewrited = true
        continue
      }

      if (!field) {
        if (docRewrited) continue

        distilledOps.push(op)
        if (type === 'set' || type === 'del') docRewrited = true
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
      if (type === 'set' || type === 'del') fields[field] = true
    }

    distilledOps.sort(sortByDate)

    this.ops = distilledOps
  }

  refreshState () {
    let ops = this.ops

    ops.sort(sortByDate)

    let state

    for (let op of ops) {
      let { type, field, value, charId, positionId } = op

      let fieldState = state

      if (field) {
        let parts = field.split('.')

        for (let part of parts) {
          if (fieldState) fieldState = fieldState[part]
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

        case 'increment':
          if (typeof fieldState !== 'number') fieldState = 0
          if (value === undefined) value = 1
          fieldState = fieldState + value
          break

        case 'stringInsert':
          if (!(fieldState instanceof Text)) fieldState = new Text()

          fieldState.insertChar(positionId, charId, value)
          break

        case 'stringRemove':
          if (!(fieldState instanceof Text)) fieldState = new Text()

          fieldState.removeChar(positionId)
          break
      }

      if (field) {
        if (!state || typeof state !== 'object') state = {}
        if (type === 'del') {
          this.applyFnToStateField(state, field, (part, current) => delete current[part])
        } else {
          this.applyFnToStateField(state, field, (part, current) => current[part] = fieldState)
        }
      } else {
        state = fieldState
      }
    }

    this.state = state
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
        if (typeof current[part] === 'object') {
          current = current[part]
        } else {
          current[part] = {}
          current = current[part]
        }
      }
    })
  }

  applyOp (op) {
    this.ops.push(op)
    this.distillOps()
    this.refreshState()
  }

  applyOps (ops) {
    this.ops = this.ops.concat(ops)
    this.distillOps()
    this.refreshState()
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
