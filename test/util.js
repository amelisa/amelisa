let source = 'source'
let source2 = 'source2'
let collectionName = 'users'
let dbCollectionName = 'auths'
let localCollectionName = '_users'
let docId = '1'
let expression = {}
let countExpression = {$count: true}
let joinExpression = {_id: '$categories.1.userId'}
let field = 'name'
let field2 = 'firstName'
let value = 'Ivan'
let value2 = 'Vasya'

function sleep (ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default {
  source,
  source2,
  collectionName,
  dbCollectionName,
  localCollectionName,
  docId,
  expression,
  countExpression,
  joinExpression,
  field,
  field2,
  value,
  value2,
  sleep
}
