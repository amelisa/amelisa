import ServerQuery from './ServerQuery'

class ServerJoinQuery extends ServerQuery {
  constructor (collectionName, expression, store, querySet) {
    super(collectionName, expression, store, querySet)

    this.canLoad = false

    this.joinFieldValues = {}

    let joinFields = this.store.dbQueries.getJoinFields(expression)

    for (let field in joinFields) {
      let value = joinFields[field]
      value = value.slice(1)
      let parts = value.split('.')
      let [collectionName, docId, ...fields] = parts

      this.joinFieldValues[field] = {
        collectionName,
        docId,
        fields: fields.join('.')
      }
    }

    this.loadJoinFields()
  }

  load () {
    if (!this.canLoad) return

    super.load()
  }

  onJoinFieldsChange = () => {
    if (this.loading) return

    for (let field in this.joinFieldValues) {
      let { doc, fields } = this.joinFieldValues[field]

      let value = doc.get(fields)
      if (value === undefined) value = null

      this.expression[field] = value
    }

    this.load()
  };

  async loadJoinFields () {
    this.loading = true
    let promises = []

    for (let field in this.joinFieldValues) {
      let joinFieldValue = this.joinFieldValues[field]
      let { collectionName, docId } = joinFieldValue

      let promise = this.store.docSet
        .getOrCreateDoc(collectionName, docId)
        .then((doc) => {
          joinFieldValue.doc = doc
          doc.on('saved', this.onJoinFieldsChange)
        })
      promises.push(promise)
    }

    await Promise.all(promises)
    this.loading = false
    this.canLoad = true

    this.onJoinFieldsChange()
  }
}

export default ServerJoinQuery
