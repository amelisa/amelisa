import ServerDoc from './ServerDoc'

class ProjectedDoc extends ServerDoc {
  constructor (collectionName, projection, docId, ops, store, docSet) {
    super(projection.dbCollectionName, docId, ops, store, docSet)
    this.projectionCollectionName = collectionName
    this.projection = projection
  }

  onOp (op, channel) {
    op = {...op}

    let error = this.projection.validateOp(op)
    if (error) {
      op = {
        ackId: op.id,
        collectionName: this.projectionCollectionName,
        docId: this.docId,
        error
      }
      return this.sendOp(op, channel)
    }

    if (op.collectionName) op.collectionName = this.collectionName

    super.onOp(op, channel)
  }

  receiveOp (op) {
    op = this.projection.projectOp(op)
    if (op) super.receiveOp(op)
  }

  sendOp (op, channel) {
    if (op.collectionName) op.collectionName = this.projectionCollectionName

    if (op.type === 'add' || op.type === 'set' || op.type === 'del') {
      op = this.projection.projectOp(op)
      if (!op) return
    } else if (op.type === 'fetch' || op.type === 'sub') {
      op.ops = op.ops
        .map((docOp) => this.projection.projectOp(docOp))
        .filter((docOp) => docOp)
    }

    super.sendOp(op, channel)
  }

  destroy () {
    this.docSet.unattach(this.projectionCollectionName, this.docId)
  }
}

export default ProjectedDoc
