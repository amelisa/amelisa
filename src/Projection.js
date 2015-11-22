import util from './util'

class Projection {
  constructor (collectionName, dbCollectionName, fields = {}) {
    this.collectionName = collectionName
    this.dbCollectionName = dbCollectionName
    this.inclusive = this.validate(fields)
    this.fields = fields
  }

  getHash () {
    let fieldList = Object.keys(this.fields)

    fieldList.sort()
    return fieldList.map((field) => `${field}:${this.fields[field]}`).join(',')
  }

  validate (fields) {
    if (!fields) throw new Error('Fields are required')
    if (typeof fields !== 'object') throw new Error('Fields should be an object')
    let fieldList = Object.keys(fields)
    if (fieldList.length === 0) throw new Error('Fields object can not be empty')

    let inclusive

    for (let field in fields) {
      let value = fields[field]
      if (inclusive !== undefined) {
        if (inclusive !== value) throw new Error('All fields should be true or all fields should be false')
      } else {
        inclusive = value
      }
    }

    if (inclusive && !fields['_id']) throw new Error('Inclusive projection should has field _id')
    if (!inclusive && fields['_id'] !== undefined) throw new Error('Exclusive projection should not has field _id')

    return inclusive
  }

  projectDoc (doc) {
    let projectedDoc = {
      _id: doc._id
    }

    if (this.inclusive) {
      for (let field in this.fields) {
        projectedDoc[field] = doc[field]
      }
      for (let field in util.dbFields) {
        if (doc[field]) projectedDoc[field] = doc[field]
      }
    } else {
      for (let field in doc) {
        if (this.fields[field] !== false || util.dbFields[field]) {
          projectedDoc[field] = doc[field]
        }
      }
    }

    let projectedOps = []
    for (let op of doc._ops) {
      let projectedOp = this.projectOp(op)
      if (projectedOp) projectedOps.push(projectedOp)
    }
    projectedDoc._ops = projectedOps

    return projectedDoc
  }

  projectOp (op) {
    let projectedOp = util.clone(op)

    if (projectedOp.collectionName) projectedOp.collectionName = this.collectionName

    if (op.type === 'add') {
      for (let field in op.value) {
        if (this.inclusive) {
          if (!this.fields[field] && !util.dbFields[field]) delete projectedOp.value[field]
        } else {
          if (this.fields[field] === false && !util.dbFields[field]) delete projectedOp.value[field]
        }
      }
    }

    if (op.type === 'set') {
      if (this.inclusive) {
        if (!this.fields[op.field]) return
      } else {
        if (this.fields[op.field] === false) return
      }
    }

    if (op.type === 'del' && op.field) {
      if (this.inclusive) {
        if (!this.fields[op.field]) return
      } else {
        if (this.fields[op.field] === false) return
      }
    }

    return projectedOp
  }

  validateOp (op) {
    let collectionName = this.collectionName
    function error (field) {
      return 'Op on field "' + field + '" is restricted in projection "' + collectionName + '"'
    }

    if (op.type === 'add') {
      for (let field in op.value) {
        if (this.inclusive) {
          if (!this.fields[field]) return error(field)
        } else {
          if (this.fields[field] === false) return error(field)
        }
      }
    }

    if (op.type === 'set') {
      if (this.inclusive) {
        if (!this.fields[op.field]) return error(op.field)
      } else {
        if (this.fields[op.field] === false) return error(op.field)
      }
    }

    if (op.type === 'del' && op.field) {
      if (this.inclusive) {
        if (!this.fields[op.field]) return error(op.field)
      } else {
        if (this.fields[op.field] === false) return error(op.field)
      }
    }
  }
}

export default Projection
