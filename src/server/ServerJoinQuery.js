// let debug = require('debug')('ServerJoinQuery')
import ServerQuery from './ServerQuery'

class ServerJoinQuery extends ServerQuery {
  constructor (collectionName, expression, store, querySet, joinFields) {
    super(collectionName, expression, store, querySet)

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

    let loadedFields = []

    this
      .loadJoinFields()
      .then(() => {
        for (let field in this.joinFieldValues) {
          let joinFieldValue = this.joinFieldValues[field]
          let { doc, fields } = joinFieldValue

          let onFieldChange = () => {
            let value = doc.get(fields)

            if (value === undefined) return
            if (loadedFields.indexOf(field) === -1) loadedFields.push(field)

            if (loadedFields.length < Object.keys(this.joinFieldValues).length) return

            expression[field] = value
            this.load()
          }

          doc.on('saved', onFieldChange)

          if (doc.loaded) {
            onFieldChange()
          } else {
            doc.once('loaded', onFieldChange)
          }
        }
      })
  }

  async loadJoinFields () {
    let promises = []

    for (let field in this.joinFieldValues) {
      let joinFieldValue = this.joinFieldValues[field]
      let { collectionName, docId } = joinFieldValue

      let promise = this.store.docSet
        .getOrCreateDoc(collectionName, docId)
        .then((doc) => {
          joinFieldValue.doc = doc
        })
      promises.push(promise)
    }

    return Promise.all(promises)
  }
}

export default ServerJoinQuery
