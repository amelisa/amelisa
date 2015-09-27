let debug = require('debug')('RemoteDoc');
import MutableDoc from './MutableDoc';
import util from './util';

class RemoteDoc extends MutableDoc {
  constructor(docId, ops, collection, model, storage, serverVersion) {
    super(docId, ops, collection, model);
    this.storage = storage;
    this.serverVersion = serverVersion;
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
    super.subscribe(listener);

    if (this.model.online) {
      this.model.sendOp({
        type: 'sub',
        collectionName: this.collection.name,
        docId: this.docId,
        version: this.version()
      });
    } else {
      process.nextTick(this.refresh.bind(this));
      // this.refresh();
    }
  }

  unsubscribe(listener) {
    super.unsubscribe(listener);

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
    super.onOp(op, callback);
    this.save();
    this.model.send(op, callback);
  }

  receiveOp(op) {
    debug('receiveOp', op.type);
    let shouldEmit = this.shouldEmit(op);
    this.applyOp(op);
    if (shouldEmit) this.emit('change');
    // this.collection.emit('change', op);
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
        console.error('RemoteDoc.save', err);
      });
  }
}

export default RemoteDoc;
