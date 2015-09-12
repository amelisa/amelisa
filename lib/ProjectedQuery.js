let debug = require('debug')('ProjectedQuery');
import ServerQuery from './ServerQuery';
import util from './util';

class ProjectedQuery extends ServerQuery {
  constructor(collectionName, projection, expression, store, storage, querySet) {
    super(projection.dbCollectionName, expression, store, storage, querySet);
    this.projectionCollectionName = collectionName;
    this.projection = projection;
  }

  sendOp(op, channel) {
    // debug('sendOp', op);

    if (op.collectionName) op.collectionName = this.projectionCollectionName;

    if (op.type === 'q' && this.isDocs) {
      let projectedDocs = [];
      for (let doc of op.value) {
        projectedDocs.push(this.projection.projectDoc(doc));
      }
      op.value = projectedDocs;
    }

    super.sendOp(op, channel);
  }
}

export default ProjectedQuery;
