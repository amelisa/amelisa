import Mingo from 'mingo';
import util from './util';

Mingo.setup({
  key: '_id'
});

let metaOperators = {
  $comment: true,
  $explain: true,
  $hint: true,
  $maxScan: true,
  $max: true,
  $min: true,
  $orderby: true,
  $returnKey: true,
  $showDiskLoc: true,
  $snapshot: true,
  $count: true,
  $aggregate: true
}

// TODO: add more
let notDocsOperators = {
  $count: true,
  $aggregate: true
}

let cursorOperators = {
  $limit: 'limit',
  $skip: 'skip'
}

class MongoQueries {

  getQueryResultFromArray(allDocs, expression) {
    let query = this.normalizeQuery(expression);
    let mingoQuery = new Mingo.Query(query.$query);
    let cursor = mingoQuery.find(allDocs);

    if (query.$count) {
      return cursor.count();
    }

    if (query.$orderby) {
      cursor.sort(query.$orderby);
    }

    if (query.$findOptions) {
      for (let key in query.$findOptions) {
        let value = query.$findOptions[key];
        cursor = cursor[key](value);
      }
    }

    return cursor.all();
  }

  normalizeQuery(expression) {
    // Box queries inside of a $query and clone so that we know where to look
    // for selctors and can modify them without affecting the original object
    let query;
    if (expression.$query) {
      query = util.shallowClone(expression);
      query.$query = util.shallowClone(query.$query);
    } else {
      query = {$query: {}};
      for (let key in expression) {
        if (metaOperators[key]) {
          query[key] = expression[key];
        } else if (cursorOperators[key]) {
          let findOptions = query.$findOptions || (query.$findOptions = {});
          findOptions[cursorOperators[key]] = expression[key];
        } else {
          query.$query[key] = expression[key];
        }
      }
    }

    // Do not return deleted docs
    query.$query._del = {$ne: true};

    return query;
  }

  isDocsQuery(expression) {
    let query = this.normalizeQuery(expression);

    for (let key in query) {
      if (notDocsOperators[key]) return false;
    }
    return true;
  }
}

export default MongoQueries;
