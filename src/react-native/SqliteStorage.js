import SQLite from 'react-native-sqlite-storage'

const dbName = 'amelisa'

SQLite.enablePromise(true)

class SqliteStorage {
  constructor (collectionNames = []) {
    this.collectionNames = collectionNames
  }

  async getCollectionNames () {
    return this.existingCollectionNames
  }

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
    return this.db.executeSql(`CREATE TABLE ${collectionName} (id TEXT PRIMARY KEY, data TEXT);`)
  }

  async removeCollection (collectionName) {
    return this.db.executeSql(`DROP TABLE ${collectionName}`)
  }

  async init () {
    let db = await SQLite.openDatabase(dbName, '1.0', 'Amelisa Database', 200000)
    this.db = db

    let existingCollectionNames = await this.getExistingCollectionNames()

    for (let collectionName of this.collectionNames) {
      if (existingCollectionNames.indexOf(collectionName) > -1) continue
      await this.createCollection(collectionName)
      existingCollectionNames.push(collectionName)
    }

    this.existingCollectionNames = existingCollectionNames

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

  async getAllDocs (collectionName) {
    let args = await this.db.executeSql(`SELECT * FROM ${collectionName}`)
    let rows = this.getQueryRows(args)

    let docs = []
    for (let row of rows) {
      if (!row.data) continue
      let doc = JSON.parse(row.data)
      docs.push(doc)
    }

    return docs
  }

  async saveDoc (collectionName, docId, ops, serverVersion) {
    let doc = {
      id: docId,
      _ops: ops,
      _sv: serverVersion
    }

    let data = JSON.stringify(doc)

    // escape single quote character in SQL by doubling it
    data = data.replace(/'/g, "''")

    await this.db.executeSql(`INSERT OR REPLACE INTO ${collectionName} (id, data) VALUES ('${docId}', '${data}')`)
  }
}

export default SqliteStorage
