import ServerQuery from './ServerQuery'

class ProjectedQuery extends ServerQuery {
  constructor (collectionName, projection, expression, store, querySet) {
    super(projection.dbCollectionName, expression, store, querySet)
    this.projectionCollectionName = collectionName
    this.projection = projection
  }

  sendOp (op, channel) {
    if (op.collectionName) op.collectionName = this.projectionCollectionName

    if ((op.type === 'q' || op.type === 'qdiff') && this.isDocs) {
      let projectedDocs = {}
      for (let docId in op.docOps) {
        let ops = op.docOps[docId]
        let projectedOps = ops
          .map((docOp) => this.projection.projectOp(docOp))
          .filter((docOp) => docOp)
        projectedDocs[docId] = projectedOps
      }
      op.docOps = projectedDocs
    }

    super.sendOp(op, channel)
  }

  destroy () {
    this.querySet.unattach(this.projectionCollectionName, this.originalExpression)
  }
}

export default ProjectedQuery
