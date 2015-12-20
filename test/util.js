let source = 'source'
let collectionName = 'users'
let dbCollectionName = 'auths'
let localCollectionName = '_users'
let docId = '1'
let expression = {}
let countExpression = {$count: true}
let joinExpression = {_id: '$categories.1.userId'}
let field = 'name'
let value = 'Ivan'

function sleep (ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default {
  source,
  collectionName,
  dbCollectionName,
  localCollectionName,
  docId,
  expression,
  countExpression,
  joinExpression,
  field,
  value,
  sleep
}
