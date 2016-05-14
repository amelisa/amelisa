import RemoteQuery from './RemoteQuery'

class RemoteJoinQuery extends RemoteQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)

    this.joinFieldValues = {}

    let joinFields = this.model.dbQueries.getJoinFields(expression)

    for (let field in joinFields) {
      let value = joinFields[field]
      value = value.slice(1)
      let parts = value.split('.')
      let [collectionName, docId, ...fields] = parts

      let doc = this.model.collectionSet.getOrCreateDoc(collectionName, docId)

      // TODO: remove handlers
      doc.on('change', () => {
        this.refresh()
      })

      this.joinFieldValues[field] = {
        collectionName,
        docId,
        fields: fields.join('.'),
        doc
      }
    }

    this.refresh()
  }

  refresh () {
    if (!this.joinFieldValues) return

    let joinExpression = {...this.expression}

    for (let field in this.joinFieldValues) {
      let { doc, fields } = this.joinFieldValues[field]

      let value = doc.get(fields)
      if (value === undefined) value = null

      joinExpression[field] = value
    }

    super.refresh(joinExpression)
  }
}

export default RemoteJoinQuery
