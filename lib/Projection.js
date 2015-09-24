import util from './util';

class Projection {
  constructor(collectionName, dbCollectionName, fields = {}) {
    this.collectionName = collectionName;
    this.dbCollectionName = dbCollectionName;
    this.validate(fields);
    this.fields = fields;
  }

  getHash() {
    let fieldList = Object.keys(this.fields);
    fieldList.sort();
    return fieldList.join(',');
  }

  validate(fields) {
    if (!fields) throw new Error('Fields are required');
    if (typeof fields !== 'object') throw new Error('Fields should be an object');
    if (!fields._id) throw new Error('Fields should has an _id field');
  }

  projectDoc(doc) {
    let projectedDoc = {};
    for (let field in this.fields) {
      projectedDoc[field] = doc[field];
    }
    for (let field in util.dbFields) {
      if (doc[field]) projectedDoc[field] = doc[field];
    }

    let projectedOps = [];
    for (let op of doc._ops) {
      let projectedOp = this.projectOp(op);
      if (projectedOp) projectedOps.push(projectedOp);
    }
    projectedDoc._ops = projectedOps;

    return projectedDoc;
  }

  projectOp(op) {
    let projectedOp = util.clone(op);

    if (op.type === 'add') {
      for (let field in op.value) {
        if (!this.fields[field] && !util.dbFields[field]) delete projectedOp.value[field];
      }
    }

    if (op.type === 'set') {
      if (!this.fields[op.field]) return;
    }

    if (op.type === 'del' && op.field) {
      if (!this.fields[op.field]) return;
    }

    return projectedOp;
  }

  validateOp(op) {
    let collectionName = this.collectionName;
    function error(field) {
      return 'Op on field "' + field + '" is restricted in projection "' + collectionName + '"';
    }

    if (op.type === 'add') {
      for (let field in op.value) {
        if (!this.fields[field]) return error(field);
      }
    }

    if (op.type === 'set') {
      if (!this.fields[op.field]) return error(op.field);
    }

    if (op.type === 'del' && op.field) {
      if (!this.fields[op.field]) return error(op.field);
    }
  }
}

export default Projection;
