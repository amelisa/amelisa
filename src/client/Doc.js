// let debug = require('debug')('Doc')
import { EventEmitter } from 'events'
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
      // dublicate ops
      if (opIds[op.id]) continue
      opIds[op.id] = true

      if (op.type === 'add') {
        distilledOps.push(op)
        continue
      }

      let field = op.field

      if (!field) {
        if (docRewrited) continue

        distilledOps.push(op)
        docRewrited = true
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
      fields[field] = true
    }

    distilledOps.sort(sortByDate)

    this.ops = distilledOps
  }

  refreshState () {
    let ops = this.ops

    ops.sort(sortByDate)

    let state
    let parts
    let current

    for (let op of ops) {
      let { type, field, value } = op

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

          parts = field.split('.')
          if (!state) state = {}
          current = state
          parts.forEach((part, index) => {
            if (index === parts.length - 1) {
              current[part] = value
            } else {
              if (typeof current[part] === 'object') {
                current = current[part]
              } else {
                current[part] = {}
                current = current[part]
              }
            }
          })
          break
        case 'del':
          if (!field) {
            state = {}
            state._del = true
            break
          }

          parts = field.split('.')
          if (!state) state = {}
          current = state
          parts.forEach((part, index) => {
            if (index === parts.length - 1) {
              delete current[part]
            } else {
              if (current[part] === undefined) {
                return
              } else {
                current = current[part]
              }
            }
          })
      }
    }

    this.state = state
  }

  applyOp (newOp) {
    // debug('applyOp', op.type)
    let existingOp = this.ops.find((op) => op.id === newOp.id)
    if (existingOp) return

    this.ops.push(newOp)
    this.distillOps()
    this.refreshState()
  }

  applyOps (ops) {
    this.ops = this.ops.concat(ops)
    this.distillOps()
    this.refreshState()
  }

  shouldEmit (newOp) {
    for (let op of this.ops) {
      if (op.id === newOp.id) {
        return false
      }

      // TODO: add more or better refactor
    }
    return true
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

    // TODO: sort version?
    // versions.sort().reverse()
    return versions.join('|')
  }

  versionMap (version) {
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
    let map = this.versionMap(version)

    for (let op of this.ops) {
      let versionDate = map[op.source]
      if (!versionDate || versionDate < op.date) {
        opsToSend.push(deepClone(op))
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

  return 0
}

export default Doc
