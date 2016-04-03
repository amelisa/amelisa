import ClientQuery from './ClientQuery'

class LocalQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
  }
}

export default LocalQuery
