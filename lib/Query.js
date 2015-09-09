import { EventEmitter } from 'events';
import MongoQueries from './MongoQueries';

class Query extends EventEmitter {
  constructor(collectionName, expression) {
    super();
    this.collectionName = collectionName;
    this.expression = expression;
    this.isDocs = this.isDocsQuery(expression);
  }

  isDocsQuery(expression) {
    return MongoQueries.prototype.isDocsQuery(expression);
  }
}

export default Query;
