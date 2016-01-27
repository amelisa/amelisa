// let debug = require('debug')('ProjectedQuery')
import ServerQuery from './ServerQuery'

class ProjectedQuery extends ServerQuery {
  constructor (collectionName, projection, expression, store, querySet) {
    super(projection.dbCollectionName, expression, store, querySet)
    this.projectionCollectionName = collectionName
    this.projection = projection
  }

  sendOp (op, channel) {
    // debug('sendOp', op)

    if (op.collectionName) op.collectionName = this.projectionCollectionName

    if ((op.type === 'q' || op.type === 'qdiff') && this.isDocs) {
      let projectedDocs = []
      for (let docId in op.docs) {
        projectedDocs.push(this.projection.projectDoc(op.docs[docId]))
      }
      op.docs = projectedDocs
    }

    super.sendOp(op, channel)
  }

  destroy () {
    this.querySet.unattach(this.projectionCollectionName, this.originalExpression)
  }
}

export default ProjectedQuery
