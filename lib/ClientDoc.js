let debug = require('debug')('ClientDoc');
import Doc from './Doc';
import util from './util';

class ClientDoc extends Doc {
  constructor(docId, ops, serverVersion, collection, model, storage) {
    super(docId, ops);
    this.serverVersion = serverVersion;
    this.collection = collection;
    this.model = model;
    this.storage = storage;
  }

  set(field, value, callback) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field,
      value: value
    });

    this.onOp(op, callback);
  }

  del(field, callback) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field
    });

    this.onOp(op, callback);
  }

  refresh() {
    this.refreshState();
    this.emit('change');
  }

  fetch(callback) {
    this.model.sendOp({
      type: 'fetch',
      collectionName: this.collection.name,
      docId: this.docId
    }, callback);
  }

  subscribe(listener) {
    this.addListener('change', listener);

    // We allready subscribed to this doc, no need to send message
    if (this.listeners('change').length > 1) {
      if (this.serverVersion) this.emit('change');
      return;
    }

    if (this.model.online) {
      this.model.sendOp({
        type: 'sub',
        collectionName: this.collection.name,
        docId: this.docId,
        version: this.version()
      });
    } else {
      process.nextTick(this.refresh.bind(this));
      //this.refresh();
    }
  }

  unsubscribe(listener) {
    this.removeListener('change', listener);

    if (this.listeners('change').length > 0) return;

    // this.collection.unattach(this.docId);

    if (!this.model.online) return;

    this.model.sendOp({
      type: 'unsub',
      collectionName: this.collection.name,
      docId: this.docId
    });
  }

  subscribed(serverVersion) {
    debug('subscribed', serverVersion);
    this.emit('change');
    this.serverVersion = serverVersion;
    this.save();

    let opsToSend = this.getOpsToSend(serverVersion);
    for (let op of opsToSend) {
      this.model.send(op);
    }
  }

  onOp(op, callback) {
    debug('onOp', op);
    this.applyOp(op);
    this.emit('change');
    this.collection.emit('change', op);
    this.save();
    this.model.send(op, callback);
  }

  receiveOp(op) {
    debug('receiveOp', op.type);
    this.applyOp(op);
    this.emit('change');
    //this.collection.emit('change', op);
    this.save();
  }

  rejectOp(opId) {
    let op = this.ops.find((op) => op.id === opId);
    debug('rejectOp', opId, op, this.ops.length, this.get())
    if (op) {
      util.arrayRemove(this.ops, op);
      this.refreshState();
      this.emit('change');
      this.collection.emit('change', op);
      this.save();
    }
  }

  sendAllOps() {
    for (let op of this.ops) {
      this.model.send(op);
    }
  }

  sync() {
    for (let op of this.getOpsToSend(this.serverVersion)) {
      this.model.send(op);
    }

    let resubscribe = this.listeners('change').length > 0;

    this.model.sendOp({
      type: 'sync',
      collectionName: this.collection.name,
      docId: this.docId,
      version: this.version(),
      value: resubscribe
    });
  }

  synced(serverVersion) {
    this.emit('change');
    this.serverVersion = serverVersion;
    this.save();
  }

  save() {
    if (!this.storage || !this.ops.length) return;
    // debug('save', this.state, this.ops)
    this.storage
      .saveDoc(this.collection.name, this.docId, this.serverVersion, this.version(), this.state, this.ops)
      .catch((err) => {
        console.error('ClientDoc.save', err);
      });
  }
}

export default ClientDoc;
