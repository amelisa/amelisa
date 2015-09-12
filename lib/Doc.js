let debug = require('debug')('Doc');
import { EventEmitter } from 'events';
import util from './util';

class Doc extends EventEmitter {
  constructor(docId, ops = []) {
    super();
    this.docId = docId;
    this.ops = ops;
    this.refreshState();
  }

  get(field) {
    if (this.state && this.state._del) return;

    if (field) {
      if (field === '_id') return this.docId;
      return this.state && this.state[field];
    } else {
      if (!this.state) return;
      let doc = {
        _id: this.docId
      };
      for (let field in this.state) {
        doc[field] = this.state[field];
      }
      return doc;
    }
  }

  distillOps() {
    let ops = this.ops.slice();

    ops.sort(sortByDate).reverse();

    let fields = {};
    let ids = {};
    let distilledOps = [];

    for (let op of ops) {

      // dublicate ops
      if (ops[op.id]) continue;
      ops[op.id] = true;

      if (op.type === 'add' || (op.type === 'del' && !op.field)) {
        distilledOps.push(op);
        continue;
      }

      let field = op.field;

      if (!fields[field]) {
        distilledOps.push(op);
        fields[field] = true;
      }
    }

    distilledOps.sort(sortByDate);

    this.ops = distilledOps;
  }

  refreshState() {
    let ops = this.ops;

    ops.sort(sortByDate);

    let state = undefined;

    for (let op of ops) {
      switch (op.type) {
        case 'add':
          state = util.clone(op.value);
          break;
        case 'set':
          state[op.field] = op.value;
          break;
        case 'del':
          if (op.field) {
            delete state[op.field];
          } else {
            state._del = true;
          }
      }
    }

    this.state = state;
  }

  applyOp(op) {
    debug('applyOp', op.type);
    this.ops.push(op);
    this.distillOps();
    this.refreshState();
  }

  applyOps(ops) {
    this.ops = this.ops.concat(ops);
    this.distillOps();
    this.refreshState();
  }

  version() {
    return this.getVersionFromOps(this.ops);
  }

  getVersionFromOps(ops) {
    let map = {};

    for (let op of ops) {
      let source = op.source;
      let date = op.date;

      if (!map[source] || date > map[source]) {
        map[source] = date;
      }
    }

    // TODO: limit length of versions
    let versions = [];
    for (let source in map) {
      let date = map[source];
      versions.push(source + ' ' + date);
    }

    //versions.sort().reverse();
    return versions.join('|');
  }

  versionMap(version) {
    let map = {};
    if (version) {
      let versions = version.split('|');

      for (let version of versions) {
        let versionArray = version.split(' ');
        let source = versionArray[0];
        let date = +versionArray[1];
        map[source] = date;
      }
    }
    return map;
  }

  getOpsToSend(version) {
    let opsToSend = [];
    let map = this.versionMap(version);

    for (let op of this.ops) {
      let versionTime = map[op.source];
      if (!versionTime || versionTime < op.date) {
        opsToSend.push(util.clone(op));
      }
    }
    return opsToSend;
  }
}

function sortByDate(op1, op2) {
  if (op1.date > op2.date) {
    return 1;
  }

  if (op1.date < op2.date) {
    return -1;
  }

  return 0;
}

export default Doc;
