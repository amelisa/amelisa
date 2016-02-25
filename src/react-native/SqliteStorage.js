import SQLite from 'react-native-sqlite-storage'
import MongoQueries from '../MongoQueries'

SQLite.enablePromise(true)

class SqliteStorage extends MongoQueries {
  constructor (collectionNames = []) {
    super()

    this.collectionNames = collectionNames
  }

  getCollectionNames = async () => {
    return this.collectionNames
  };

  getQueryRows (args) {
    let results = args[0]
    let rows = []
    for (let i = 0; i < results.rows.length; i++) {
      let row = results.rows.item(i)
      rows.push(row)
    }
    return rows
  }

  async getExistingCollectionNames () {
    let args = await this.db.executeSql(`SELECT name FROM sqlite_master WHERE type='table';`)
    let rows = this.getQueryRows(args)

    let collectionNames = rows
      .map((row) => row.name)
      .filter((row) => row !== 'android_metadata')

    return collectionNames
  }

  async createCollection (collectionName) {
    return this.db.executeSql(`CREATE TABLE ${collectionName} (_id TEXT PRIMARY KEY, data TEXT);`)
  }

  async removeCollection (collectionName) {
    return this.db.executeSql(`DROP TABLE ${collectionName}`)
  }

  async init () {
    let db = await SQLite.openDatabase('test.db', '1.0', 'Test Database', 200000)
    this.db = db

    let existingCollectionNames = await this.getExistingCollectionNames()
    this.existingCollectionNames = existingCollectionNames

    // for (let collectionName of this.collectionNames) {
    //   if (existingCollectionNames.indexOf(collectionName) > -1) continue
    //   await this.createCollection(collectionName)
    // }
    //
    // for (let collectionName of existingCollectionNames) {
    //   if (this.collectionNames.indexOf(collectionName) > -1) continue
    //   await this.removeCollection(collectionName)
    // }
  }

  async clear () {
    let existingCollectionNames = await this.getExistingCollectionNames()

    for (let collectionName of existingCollectionNames) {
      await this.removeCollection(collectionName)
    }
  }

  async getDocById (collectionName, docId) {
    let args = await this.db.executeSql(`SELECT * FROM ${collectionName} WHERE _id = '${docId}'`)
    let rows = this.getQueryRows(args)
    let row = rows[0]
    if (!row || !row.data) return

    let doc = JSON.parse(row.data)
    return doc
  }

  async getAllDocs (collectionName) {
    return this.getDocsByQuery(collectionName, MongoQueries.allSelector)
  }

  async getDocsByQuery (collectionName, expression) {
    let args = await this.db.executeSql(`SELECT * FROM ${collectionName}`)
    let rows = this.getQueryRows(args)

    let allDocs = []
    for (let row of rows) {
      if (!row.data) continue
      let doc = JSON.parse(row.data)
      allDocs.push(doc)
    }

    let docs = this.getQueryResultFromArray(allDocs, expression)

    return docs
  }

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    let doc = {
      _id: docId,
      _v: version,
      _sv: prevVersion,
      _ops: ops
    }

    for (let key in state) {
      doc[key] = state[key]
    }

    let data = JSON.stringify(doc)

    if (this.existingCollectionNames.indexOf(collectionName) === -1) {
      await this.createCollection(collectionName)
      this.existingCollectionNames.push(collectionName)
    }
    await this.db.executeSql(`INSERT OR REPLACE INTO ${collectionName} (_id, data) VALUES ('${docId}', '${data}')`)
  }
}

export default SqliteStorage
