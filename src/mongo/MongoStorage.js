import { MongoClient } from 'mongodb'
import MongoQueries from './MongoQueries'

class MongoStorage extends MongoQueries {
  constructor (url) {
    super()
    this.url = url
  }

  async init () {
    this.db = await MongoClient.connect(this.url)
  }

  async clear () {
    await this.db.dropDatabase()
  }

  async getDocById (collectionName, docId) {
    let query = {
      _id: docId
    }

    let collection = this.db.collection(collectionName)

    return collection
      .find(query)
      .limit(1)
      .next()
      .then(this.normalizeIdInDoc)
  }

  async getDocsByQuery (collectionName, expression) {
    expression = this.normalizeExpression(expression)
    let collection = this.db.collection(collectionName)

    if (expression.$count) {
      return collection
        .count(expression.$query || {})
    }

    if (expression.$distinct) {
      return collection
        .distinct(expression.$field, expression.$query || {})
    }

    if (expression.$aggregate) {
      return collection
        .aggregate(expression.$aggregate)
        .toArray()
    }

    if (expression.$mapReduce) {
      let mapReduceOptions = {
        query: expression.$query || {},
        out: {inline: 1},
        scope: expression.$scope || {}
      }
      return collection
        .mapReduce(expression.$map, expression.$reduce, mapReduceOptions)
    }

    let cursor = collection.find(expression.$query)

    if (expression.$orderby) cursor = cursor.sort(expression.$orderby)
    if (expression.$skip) cursor = cursor.skip(expression.$skip)
    if (expression.$limit) cursor = cursor.limit(expression.$limit)

    let docs = await cursor.toArray()
    if (this.isDocsQuery(expression)) docs = docs.map(this.normalizeIdInDoc)
    return docs
  }

  async getOpsByQuery (collectionName) {
    let opsCollectionName = this.getOpsCollection(collectionName)

    return this.db
      .collection(opsCollectionName)
      .find({})
      .toArray()
      .then((ops) => ops.map(this.normalizeIdInDoc))
  }

  async saveOp (op) {
    let opsCollectionName = this.getOpsCollection(op.collectionName)
    op = {...op}
    op._id = op.id
    delete op.id

    return this.db
      .collection(opsCollectionName)
      .insert(op)
  }

  getOpsCollection (collectionName) {
    return `${collectionName}_ops`
  }

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    let query = {
      _id: docId,
      _v: prevVersion
    }

    let update = {
      $set: {
        _ops: ops,
        _v: version
      }
    }

    for (let key in state) {
      update.$set[key] = state[key]
    }

    let options = {
      new: true
    }

    if (!prevVersion) {
      options.upsert = true
    }

    return this.db
      .collection(collectionName)
      .findAndModify(query, [], update, options)
      .then((result) => {
        let doc = result.value

        // if there was no doc with previous version,
        // it means that version changed and our data is stale
        // let's load it, merge with current doc and save one more time
        if (!doc) throw new Error('stale data')

        return doc
      })
      .catch((err) => {
        // if E11000 duplicate key error on _id field,
        // it means that we inserted two docs with same _id.
        // let's load saved doc from db, merge with current and save again
        if (err.code === 11000 && err.message.indexOf('index: _id_ dup key') !== -1) {
          throw new Error('stale data')
        }

        throw err
      })
  }

  getDbQueries () {
    return new MongoQueries()
  }
}

export default MongoStorage
