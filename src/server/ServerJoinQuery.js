import ServerQuery from './ServerQuery'

class ServerJoinQuery extends ServerQuery {
  constructor (collectionName, expression, store, querySet, joinFields) {
    super(collectionName, expression, store, querySet)

    this.notLoad = true

    setTimeout(() => this.emit('loaded'))

    this.joinFieldValues = {}
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
    if (this.notLoad) return
    super.load()
  }

  onJoinFieldsChange = () => {
    let loadedFields = []

    for (let field in this.joinFieldValues) {
      let joinFieldValue = this.joinFieldValues[field]
      let { doc, fields } = joinFieldValue

      let value = doc.get(fields)
      if (value === undefined) return
      if (loadedFields.indexOf(field) === -1) loadedFields.push(field)

      if (loadedFields.length < Object.keys(this.joinFieldValues).length) return

      this.expression[field] = value

      if (this.notLoad) this.notLoad = false
      this.load()
    }
  };

  async loadJoinFields () {
    let promises = []

    for (let field in this.joinFieldValues) {
      let joinFieldValue = this.joinFieldValues[field]
      let { collectionName, docId } = joinFieldValue

      let promise = this.store.docSet
        .getOrCreateDoc(collectionName, docId)
        .then((doc) => {
          joinFieldValue.doc = doc
          doc.on('saved', this.onJoinFieldsChange)

          this.onJoinFieldsChange()
        })
      promises.push(promise)
    }

    await Promise.all(promises)
  }
}

export default ServerJoinQuery
