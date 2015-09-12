import assert from 'assert';
import Doc from '../lib/Doc';

let source = 'source';
let source2 = 'source2';
let collectionName = 'users';
let docId = '1';

describe('Doc', () => {
  it('should get fields from empty doc', () => {
    let doc = new Doc(docId);

    assert.equal(doc.get(), undefined);
    assert.equal(doc.get('_id'), docId);
    assert.equal(doc.get('no_field'), undefined);
  });

  it('should distillOps on same field', () => {
    let ops = [];
    let lastDate = Date.now();

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    for (let i = 0; i < 10; i++) {
      lastDate = Date.now();
      op = {
        id: 'id' + i,
        source: source,
        type: 'set',
        date: lastDate + i + 1,
        collectionName: collectionName,
        docId: docId,
        field: 'name',
        value: 'Ivan'
      }
      ops.push(op);
    }

    let doc = new Doc(docId, ops);
    doc.distillOps();

    assert.equal(doc.ops.length, 2);
    assert.equal(doc.ops[1].date, lastDate + 10);
  });

  it('should refreshState on different field', () => {
    let ops = [];

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source,
      type: 'set',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'age',
      value: 10
    }
    ops.push(op);

    let doc = new Doc(docId, ops);
    //doc.refreshState();

    assert.equal(doc.get('_id'), docId);
    assert.equal(doc.get('name'), 'Vasya');
    assert.equal(doc.get('age'), 10);
    assert.equal(Object.keys(doc.get()).length, 3);
  });

  it('should refreshState on same field', () => {
    let ops = [];

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source,
      type: 'set',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'name',
      value: 'Ivan'
    }
    ops.push(op);

    let doc = new Doc(docId, ops);
    //doc.refreshState();

    assert.equal(doc.get('_id'), docId);
    assert.equal(doc.get('name'), 'Ivan');
    assert.equal(Object.keys(doc.get()).length, 2);
  });

  it('should refreshState when del', () => {
    let ops = [];

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source,
      type: 'del',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId
    }
    ops.push(op);

    let doc = new Doc(docId, ops);
    //doc.refreshState();

    assert.equal(doc.get('_id'), undefined);
    assert.equal(doc.get('name'), undefined);
    assert.equal(doc.get(), undefined);
  });

  it('should getVersionFromOps from different sources', () => {
    let ops = [];
    let date1 = Date.now();
    let date2 = Date.now() + 1;

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source2,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: 'name',
      value: 'Ivan'
    }
    ops.push(op);

    let doc = new Doc(docId);
    let version = doc.getVersionFromOps(ops);

    assert.equal(version, `${source} ${date1}|${source2} ${date2}`);
  });

  it('should getVersionFromOps from same sources', () => {
    let ops = [];
    let date1 = Date.now();
    let date2 = Date.now() + 1;

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: 'name',
      value: 'Ivan'
    }
    ops.push(op);

    let doc = new Doc(docId);
    let version = doc.getVersionFromOps(ops);

    assert.equal(version, `${source} ${date2}`);
  });

  it('should versionMap from different sources', () => {
    let ops = [];
    let date1 = Date.now();
    let date2 = Date.now() + 1;

    let doc = new Doc(docId);
    let map = doc.versionMap(`${source} ${date1}|${source2} ${date2}`);

    assert.equal(Object.keys(map).length, 2);
    assert.equal(map[source], date1);
    assert.equal(map[source2], date2);
  });

  it('should versionMap from one sources', () => {
    let ops = [];
    let date1 = Date.now();

    let doc = new Doc(docId);
    let map = doc.versionMap(`${source} ${date1}`);

    assert.equal(Object.keys(map).length, 1);
    assert.equal(map[source], date1);
  });

  it('should getOpsToSend', () => {
    let ops = [];
    let date1 = Date.now();
    let date2 = Date.now() + 1;

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        name: 'Vasya'
      }
    }
    ops.push(op);

    op = {
      source: source,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: 'name',
      value: 'Ivan'
    }
    ops.push(op);

    let doc = new Doc(docId, ops);

    let opsToSend = doc.getOpsToSend(`${source} ${date2}`);
    assert.equal(opsToSend.length, 0);

    opsToSend = doc.getOpsToSend(`${source} ${date1}`);
    assert.equal(opsToSend.length, 1);

    opsToSend = doc.getOpsToSend(`${source} ${date1 - 1}`);
    assert.equal(opsToSend.length, 2);

    opsToSend = doc.getOpsToSend(`${source2} ${date1}`);
    assert.equal(opsToSend.length, 2);

    opsToSend = doc.getOpsToSend();
    assert.equal(opsToSend.length, 2);
  });
});
