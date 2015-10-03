import assert from 'assert';
import ClientQuery from '../lib/ClientQuery';
import Model from '../lib/Model';
import ServerChannel from '../lib/ServerChannel';
import { source, collectionName, localCollectionName, docId, field, value } from './util';

let channel;
let model;

describe('Model', () => {

  describe('mutations', () => {

    beforeEach(() => {
      channel = new ServerChannel();
      model = new Model(channel, source);
    });

    it('should get nothing from empty model', () => {
      let value = model.get(collectionName);

      assert.equal(value, undefined);
      value = model.get(collectionName, docId);
      assert.equal(value, undefined);
      value = model.get(collectionName, docId, field);
      assert.equal(value, undefined);
    });

    it('should add without docId', () => {
      let doc = {
        [field]: value
      }

      model.add(collectionName, doc);

      let collectionData = model.get(collectionName);
      assert.equal(Object.keys(collectionData).length, 1);
      let newId = Object.keys(collectionData)[0];
      let newDoc = model.get(collectionName, newId);
      assert.equal(newDoc._id, newId);
      assert.equal(newDoc.name, doc.name);
    });

    it('should add with docId', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      model.add(collectionName, doc);

      let collectionData = model.get(collectionName);
      assert.equal(Object.keys(collectionData).length, 1);
      let newId = Object.keys(collectionData)[0];
      assert.equal(newId, docId);
      let name = model.get(collectionName, newId, field);
      assert.equal(name, value);
      let newDoc = model.get(collectionName, newId);
      assert.equal(newDoc._id, newId);
      assert.equal(newDoc.name, doc.name);
    });

    it('should del field', () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);

      model.del([collectionName, docId, field]);

      let name = model.get(collectionName, docId, field);
      assert.equal(name, undefined);
      let newDoc = model.get(collectionName, docId);
      assert.equal(newDoc._id, docId);
      assert.equal(newDoc.name, undefined);
    });

    it('should del doc', () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);

      model.del([collectionName, docId]);

      let newDoc = model.get(collectionName, docId);
      assert.equal(newDoc, undefined);
      let name = model.get(collectionName, docId, field);
      assert.equal(name, undefined);
    });

    it('should set when array', () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);
      let newValue = 'Vasya';

      model.set([collectionName, docId, field], newValue);

      let name = model.get(collectionName, docId, field);
      assert.equal(name, newValue);
    });

    it('should set when path', () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);
      let newValue = 'Vasya';

      model.set(`${collectionName}.${docId}.${field}`, newValue);

      let name = model.get(collectionName, docId, field);
      assert.equal(name, newValue);
    });

    it('should set doc', () => {
      let doc = {
        [field]: value
      }

      model.set([collectionName, docId], doc);

      let newDoc = model.get(collectionName, docId);
      assert.equal(newDoc._id, docId);
      assert.equal(newDoc[field], value);
      let name = model.get(collectionName, docId, field);
      assert.equal(name, value);
    });

    it('should set on empty doc', () => {
      model.set([collectionName, docId, field], value);

      let name = model.get(collectionName, docId, field);
      assert.equal(name, value);
    });

    it('should return query', () => {
      let expression = {
        [field]: value
      }

      let query = model.query(collectionName, expression);

      assert(query);
      assert(query instanceof ClientQuery);
      assert.equal(query.collectionName, collectionName);
      assert.equal(query.expression, expression);
    });

    it('should create op', () => {
      let opData = {
        type: 'test'
      }

      let op = model.createOp(opData);

      assert(op);
      assert(op.id);
      assert(op.date);
      assert.equal(op.source, model.source);
      assert.equal(op.type, opData.type);
      assert.equal(Object.keys(op).length, 4);
    });

    it('should return date', () => {
      let date = model.date();

      assert(date);
      assert(typeof date === 'number');
    });

    it('should return id', () => {
      let id = model.id();

      assert(id);
      assert(typeof id === 'string');
    });
  });

  describe('ops', () => {

    beforeEach(() => {
      channel = new ServerChannel();
      model = new Model(channel, 'test');
      model.online = true;
    });

    it('should send op on add', (done) => {
      let doc = {
        _id: docId,
        [field]: value
      }

      channel.send = (op) => {
        assert(op);
        assert.equal(op.type, 'add');
        done();
      }

      model.add(collectionName, doc);
    });

    it('should send op on set', (done) => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);

      channel.send = (op) => {
        assert(op);
        assert.equal(op.type, 'set');
        done();
      }

      model.set([collectionName, docId, field], value);
    });

    it('should send op on del doc', (done) => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);

      channel.send = (op) => {
        assert(op);
        assert.equal(op.type, 'del');
        done();
      }

      model.del([collectionName, docId]);
    });

    it('should send op on del field', (done) => {
      let doc = {
        _id: docId,
        [field]: value
      }
      model.add(collectionName, doc);

      channel.send = (op) => {
        assert(op);
        assert.equal(op.type, 'del');
        done();
      }

      model.del([collectionName, docId, field]);
    });
  });
});
