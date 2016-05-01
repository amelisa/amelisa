import invariant from 'invariant'
import { deepClone, dbFields } from '../util'

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
    invariant(fields, 'Fields are required')
    invariant(typeof fields === 'object', 'Fields should be an object')
    invariant(Object.keys(fields).length, 'Fields object can not be empty')

    let inclusive

    for (let field in fields) {
      let value = fields[field]
      if (inclusive !== undefined) {
        invariant(inclusive === value, 'All fields should be true or all fields should be false')
      } else {
        inclusive = value
      }
    }

    if (inclusive) invariant(fields['id'], 'Inclusive projection should has field id')
    if (!inclusive) invariant(fields['id'] === undefined, 'Exclusive projection should not has field id')

    return inclusive
  }

  projectDoc (doc) {
    let projectedDoc = {
      id: doc.id
    }

    if (this.inclusive) {
      for (let field in this.fields) {
        projectedDoc[field] = doc[field]
      }
      for (let field in dbFields) {
        if (doc[field]) projectedDoc[field] = doc[field]
      }
    } else {
      for (let field in doc) {
        if (this.fields[field] !== false || dbFields[field]) {
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
    let projectedOp = deepClone(op)

    if (projectedOp.collectionName) projectedOp.collectionName = this.collectionName

    if (op.type === 'add') {
      for (let field in op.value) {
        if (this.inclusive) {
          if (!this.fields[field] && !dbFields[field]) delete projectedOp.value[field]
        } else {
          if (this.fields[field] === false && !dbFields[field]) delete projectedOp.value[field]
        }
      }
    }

    let parentField = op.field ? op.field.split('.')[0] : null

    if (op.type === 'set') {
      if (this.inclusive) {
        if (!this.fields[parentField]) return
      } else {
        if (this.fields[parentField] === false) return
      }
    }

    if (op.type === 'del' && parentField) {
      if (this.inclusive) {
        if (!this.fields[parentField]) return
      } else {
        if (this.fields[parentField] === false) return
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

    let parentField = op.field ? op.field.split('.')[0] : null

    if (op.type === 'set') {
      if (this.inclusive) {
        if (!this.fields[parentField]) return error(op.field)
      } else {
        if (this.fields[parentField] === false) return error(op.field)
      }
    }

    if (op.type === 'del' && parentField) {
      if (this.inclusive) {
        if (!this.fields[parentField]) return error(op.field)
      } else {
        if (this.fields[parentField] === false) return error(op.field)
      }
    }
  }
}

export default Projection
