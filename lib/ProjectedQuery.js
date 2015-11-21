// let debug = require('debug')('ProjectedQuery')
import ServerQuery from './ServerQuery'

class ProjectedQuery extends ServerQuery {
  constructor (collectionName, projection, expression, store, storage, querySet) {
    super(projection.dbCollectionName, expression, store, storage, querySet)
    this.projectionCollectionName = collectionName
    this.projection = projection
  }

  sendOp (op, channel) {
    // debug('sendOp', op)

    if (op.collectionName) op.collectionName = this.projectionCollectionName

    if (op.type === 'q' && this.isDocs) {
      let projectedDocs = []
      for (let doc of op.value) {
        projectedDocs.push(this.projection.projectDoc(doc))
      }
      op.value = projectedDocs
    } else if (op.type === 'qdiff') {
      for (let diff of op.value) {
        if (diff.type === 'insert') {
          let projectedDocs = []
          for (let doc of diff.values) {
            projectedDocs.push(this.projection.projectDoc(doc))
          }
          diff.values = projectedDocs
        }
      }
    }

    super.sendOp(op, channel)
  }

  maybeUnattach () {
    // TODO: add timeout
    if (this.channels.length === 0) {
      this.querySet.unattach(this.projectionCollectionName, this.originalExpression)
    }
  }
}

export default ProjectedQuery
