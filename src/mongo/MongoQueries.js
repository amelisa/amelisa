import Mingo from 'mingo'

Mingo.setup({
  key: '_id'
})

let metaOperators = {
  $comment: true,
  $explain: true,
  $hint: true,
  $limit: true,
  $maxScan: true,
  $max: true,
  $min: true,
  $orderby: true,
  $returnKey: true,
  $showDiskLoc: true,
  $skip: true,
  $snapshot: true,
  $count: true,
  $aggregate: true
}

// TODO: add more
let notDocsOperators = {
  $count: true,
  $aggregate: true
}

class MongoQueries {

  static get allSelector () {
    return {}
  }

  getQueryResultFromArray (allDocs, expression) {
    let query = this.normalizeQuery(expression)

    if (query.$aggregate) {
      let agg = new Mingo.Aggregator(query.$aggregate)
      return agg.run(allDocs)
    }

    let mingoQuery = new Mingo.Query(query.$query)
    let cursor = mingoQuery.find(allDocs)

    if (query.$orderby) cursor.sort(query.$orderby)

    if (query.$skip) cursor.skip(query.$skip)

    if (query.$limit) cursor.limit(query.$limit)

    if (query.$findOptions) {
      for (let key in query.$findOptions) {
        let value = query.$findOptions[key]
        cursor = cursor[key](value)
      }
    }

    if (query.$count) return cursor.count()

    return cursor.all()
  }

  normalizeQuery (expression) {
    // Box queries inside of a $query and clone so that we know where to look
    // for selctors and can modify them without affecting the original object
    let query
    if (expression.$query) {
      query = Object.assign({}, expression)
      query.$query = Object.assign({}, query.$query)
    } else {
      query = {$query: {}}
      for (let key in expression) {
        if (metaOperators[key]) {
          query[key] = expression[key]
        } else {
          query.$query[key] = expression[key]
        }
      }
    }

    // Do not return deleted docs
    query.$query._del = {$ne: true}

    return query
  }

  isDocsQuery (expression) {
    let query = this.normalizeQuery(expression)

    for (let key in query) {
      if (notDocsOperators[key]) return false
    }

    return true
  }

  isJoinField (value) {
    if (value && typeof value === 'string' && value[0] === '$') {
      return true
    }

    return false
  }

  isJoinQuery (expression) {
    let query = this.normalizeQuery(expression)

    for (let key in query.$query) {
      let value = query.$query[key]
      if (this.isJoinField(value)) return true
    }

    return false
  }

  getJoinFields (expression) {
    let query = this.normalizeQuery(expression)
    let joinFields = {}

    for (let key in query.$query) {
      let value = query.$query[key]
      if (this.isJoinField(value)) {
        joinFields[key] = value
      }
    }

    return joinFields
  }
}

export default MongoQueries
