// let debug = require('debug')('ProjectedJoinQuery');
import ProjectedQuery from './ProjectedQuery';
import ServerJoinQuery from './ServerJoinQuery';

class ProjectedJoinQuery extends ServerJoinQuery {
  constructor(collectionName, projection, expression, store, storage, querySet, joinFields) {
    super(projection.dbCollectionName, expression, store, storage, querySet, joinFields);
    this.projectionCollectionName = collectionName;
    this.projection = projection;
  }

  sendOp(op, channel) {
    ProjectedQuery.prototype.sendOp.call(this, op, channel);
  }

  maybeUnattach() {
    ProjectedQuery.prototype.maybeUnattach.call(this);
  }
}

export default ProjectedJoinQuery;
