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
    let op = {
      source: this.model.source,
      type: 'set',
      date: this.model.date(),
      collectionName: this.collection.name,
      docId: this.docId,
      field: field,
      value: value
    };

    this.onOp(op, callback);
  }

  del(field, callback) {
    let op = {
      source: this.model.source,
      type: 'del',
      date: this.model.date(),
      collectionName: this.collection.name,
      docId: this.docId
    };

    if (field) op.field = field;

    this.onOp(op, callback);
  }

  refresh() {
    this.refreshState();
    this.emit('change');
  }

  fetch(callback) {
    let op = {
      type: 'fetch',
      collectionName: this.collection.name,
      docId: this.docId
    }
    this.send(op, callback);
  }

  subscribe(listener) {
    this.addListener('change', listener);

    // We allready subscribed to this doc, no need to send message
    if (this.listeners('change').length > 1) {
      if (this.serverVersion) this.emit('change');
      return;
    }

    if (this.model.online) {
      this.model.send({
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

    this.model.send({
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
      this.send(op);
    }
  }

  onOp(op, callback) {
    debug('onOp', op.type);
    this.applyOp(op);
    this.emit('change');
    this.collection.emit('change', op);
    this.save();
    this.send(op, callback);
  }

  receiveOp(op) {
    this.applyOp(op);
    this.emit('change');
    //this.collection.emit('change', op);
    this.save();
  }

  rejectOp(opId) {
    let op = this.ops.find((op) => op.id === opId);
    debug('rejectOp', op, this.ops.length, this.get())
    if (op) {
      util.arrayRemove(this.ops, op);
      this.refreshState();
      debug(this.ops.length, this.get())
      this.emit('change');
      this.collection.emit('change', op);
      this.save();
    }
  }

  sendAllOps() {
    for (let op of this.ops) {
      this.send(op);
    }
  }

  sync() {
    for (let op of this.getOpsToSend(this.serverVersion)) {
      this.send(op);
    }

    let resubscribe = this.listeners('change').length > 0;

    this.model.send({
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

  send(op, callback) {
    this.model.send(op, callback);
  }

  save() {
    if (!this.storage || !this.ops.length) return;
    this.storage
      .saveDoc(this.collection.name, this.docId, this.serverVersion, this.version(), this.state, this.ops)
      .catch((err) => {
        console.error('ClientDoc.save', err);
      });
  }
}

export default ClientDoc;
