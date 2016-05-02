import r from 'rethinkdb'
import parseRethinkDbUrl from 'parse-rethinkdb-url'
import MongoQueries from '../mongo/MongoQueries'

// This is implementation of rethinkdb storage, that supports
// limited subset of mongo queries

const operatorsMap = {
  $eq: 'eq',
  $ne: 'ne',
  $gt: 'gt',
  $gte: 'ge',
  $lt: 'lt',
  $lte: 'le'
}

class RethinkStorage extends MongoQueries {
  constructor (url) {
    super()
    this.url = url
    this.aggregateQueriesSupport = false
  }

  async init () {
    let options = parseRethinkDbUrl(this.url)
    this.connection = await r.connect(options)

    let dbNames = await r.dbList().run(this.connection)
    let dbName = options.db || 'test'
    if (dbNames.indexOf(dbName) === -1) {
      await r.dbCreate(dbName).run(this.connection)
    }

    this.db = r.db(dbName)
    this.dbName = dbName

    this.tables = await this.db.tableList().run(this.connection)
  }

  async clear () {
    await r.dbDrop(this.dbName).run(this.connection)
    await r.dbCreate(this.dbName).run(this.connection)
    this.tables = []
  }

  async createTableIfNotExist (collectionName) {
    if (this.tables.indexOf(collectionName) > -1) return

    await this.db
      .tableCreate(collectionName)
      .run(this.connection)

    this.tables.push(collectionName)
  }

  async getDocById (collectionName, docId) {
    return r
      .table(collectionName)
      .get(docId)
      .run(this.connection)
  }

  getFilterFromExpression (field, expression, filter, options, parts) {
    if (!filter) {
      parts = field.split('.')
      filter = r.row

      for (let part of parts) {
        filter = filter(part)
      }
    }

    if (typeof expression !== 'object') {
      filter = filter.eq(expression)
    } else {
      let operator = Object.keys(expression)[0]
      if (!operator) return

      let value = expression[operator]

      if (operator === '$not') {
        expression = expression.$not
        filter = this.getFilterFromExpression(field, expression, filter, options, parts)
        if (filter) filter = filter.not()
        return filter
      }

      if (operatorsMap[operator]) {
        filter = filter[operatorsMap[operator]](value)
        if (operator === '$ne') options.default = true
      } else if (operator === '$in') {
        filter = function (doc) {
          for (let part of parts) {
            doc = doc(part)
          }
          return r.expr(value).contains(doc)
        }
      } else if (operator === '$nin') {
        filter = function (doc) {
          for (let part of parts) {
            doc = doc(part)
          }
          return r.expr(value).contains(doc).not()
        }
      } else if (operator === '$exists') {
        if (parts.length === 1) {
          filter = r.row.hasFields(parts[0])
        } else {
          let exists = {}
          let prev = exists
          let index = 0
          for (let part of parts) {
            if (index === parts.length - 1) {
              prev[part] = true
            } else {
              prev = prev[part] = {}
            }
          }
          filter = r.row.hasFields(exists)
        }
        if (value === false) filter = filter.not()
      } else if (operator === '$regex') {
        filter = function (doc) {
          for (let part of parts) {
            doc = doc(part)
          }
          return doc.match(value)
        }
      } else {
        throw new Error(`RethinkStorage.getDocsByQuery unknown operator ${operator}`)
      }
    }

    return filter
  }

  async getDocsByQuery (collectionName, expression) {
    expression = this.normalizeExpression(expression)

    let table = r.table(collectionName)

    for (let field in expression.$query) {
      let queryExpression = expression.$query[field]
      let options = {
        default: false
      }

      let filter = this.getFilterFromExpression(field, queryExpression, null, options)

      if (filter) table = table.filter(filter, options)
    }

    if (expression.$count) {
      return table.count().run(this.connection)
    }

    if (expression.$orderby) {
      let orderBys = []
      for (let key in expression.$orderby) {
        let value = expression.$orderby[key]
        let parts = key.split('.')
        let firstPart = parts.shift()
        let orderBy = r.row(firstPart)
        for (let part of parts) {
          orderBy = orderBy(part)
        }
        if (value > 0) {
          orderBy = r.asc(orderBy)
        } else {
          orderBy = r.desc(orderBy)
        }
        orderBys.push(orderBy)
      }
      table = table.orderBy.apply(table, orderBys)
    }

    if (expression.$distinct) {
      let fieldParts = expression.$field.split('.')
      table = table
        .map(function (doc) {
          for (let fieldPart of fieldParts) {
            doc = doc(fieldPart)
          }
          return doc
        })
        .distinct()
    }

    if (expression.$aggregate) {
      throw new Error('Aggregate queries are not implemented')
    }

    if (expression.$mapReduce) {
      throw new Error('Map reduce queries are not implemented')
    }

    if (expression.$skip) {
      table = table.skip(expression.$skip)
    }

    if (expression.$limit) {
      table = table.limit(expression.$limit)
    }

    let cursor = await table.run(this.connection)

    return cursor.toArray()
  }

  async getOpsByQuery (collectionName) {
    let opsCollectionName = this.getOpsCollection(collectionName)

    let cursor = await r
      .table(opsCollectionName)
      .run(this.connection)

    return cursor.toArray()
  }

  async saveOp (op) {
    let opsCollectionName = this.getOpsCollection(op.collectionName)
    await this.createTableIfNotExist(opsCollectionName)

    let options = {
      conflict: 'replace'
    }

    return r
      .table(opsCollectionName)
      .insert(op, options)
      .run(this.connection)
  }

  getOpsCollection (collectionName) {
    return `${collectionName}_ops`
  }

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    await this.createTableIfNotExist(collectionName)

    let doc = {
      ...state,
      id: docId,
      _v: version,
      _ops: ops
    }

    if (!prevVersion) {
      return r
        .table(collectionName)
        .insert(doc)
        .run(this.connection)
        .then((result) => {
          if (result.inserted === 1) return

          throw new Error('stale data')
        })
    }

    return r
      .table(collectionName)
      .getAll(docId)
      .filter(r.row('_v').eq(prevVersion))
      .replace(doc)
      .run(this.connection)
      .then((result) => {
        if (result.replaced === 1) return

        throw new Error('stale data')
      })
  }

  getDbQueries () {
    return new MongoQueries()
  }
}

export default RethinkStorage
