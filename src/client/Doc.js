// let debug = require('debug')('Doc')
import { EventEmitter } from 'events'
import Char from './Char'
import { deepClone } from '../util'

class Doc extends EventEmitter {
  constructor (docId, ops = []) {
    super()
    this.docId = docId
    this.ops = ops
    this.stringFieldChars = {}
    this.refreshState()
  }

  get (field) {
    if (this.state && this.state._del) return

    if (field) {
      if (field === '_id') return this.docId
      let parts = field.split('.')
      let value = this.state

      for (let part of parts) {
        if (!value) return
        value = value[part]
      }

      return value
    } else {
      if (typeof this.state !== 'object' || Array.isArray(this.state)) {
        return this.state
      }

      let doc = {
        _id: this.docId
      }

      for (let field in this.state) {
        doc[field] = this.state[field]
      }

      return doc
    }
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
    this.stringDocChars = null
    this.stringFieldChars = {}

    for (let op of ops) {
      let { type, field, value, charId, positionId } = op
      let index
      let char
      let chars

      if (type === 'stringInsert' || type === 'stringRemove') {
        if (field) {
          chars = this.stringFieldChars[field]
          if (!chars) chars = this.stringFieldChars[field] = []
        } else {
          chars = this.stringDocChars
          if (!chars) chars = this.stringDocChars = []
        }

        index = chars.findIndex((char) => char.charId === positionId)
        if (index === -1 && positionId) continue
      }

      if (state && state._del) state = undefined

      switch (type) {
        case 'add':
          state = deepClone(value)
          break

        case 'set':
          if (!field) {
            state = deepClone(value)
            break
          }

          if (!state || typeof state !== 'object') state = {}
          this.applyFnToStateField(state, field, (part, current) => current[part] = value)
          break

        case 'del':
          if (!field) {
            state = {}
            state._del = true
            break
          }

          if (!state || typeof state !== 'object') state = {}
          this.applyFnToStateField(state, field, (part, current) => delete current[part])
          break

        case 'increment':
          if (value === undefined) value = 1

          if (!field) {
            if (typeof state !== 'number') state = 0
            state = state + value
            break
          }

          if (!state || typeof state !== 'object') state = {}
          this.applyFnToStateField(state, field, (part, current) => {
            if (typeof current[part] !== 'number') current[part] = 0
            current[part] = current[part] + value
          })
          break

        case 'stringInsert':
          char = new Char(charId, value)
          chars.splice(index + 1, 0, char)
          break

        case 'stringRemove':
          char = chars[index]
          char.removed = true
          break
      }
    }

    for (let field in this.stringFieldChars) {
      let chars = this.getFieldChars(field)
      let value = chars.map((char) => char.value).join('')

      if (!state || typeof state !== 'object') state = {}
      this.applyFnToStateField(state, field, (part, current) => current[part] = value)
    }

    if (this.stringDocChars) {
      let chars = this.getFieldChars()
      state = chars.map((char) => char.value).join('')
    }

    this.state = state
  }

  getFieldChars (field) {
    let chars
    if (field) {
      chars = this.stringFieldChars[field]
    } else {
      chars = this.stringDocChars
    }
    if (chars) chars = chars.filter((char) => !char.removed)
    return chars
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
