let source = 'source';
let collectionName = 'users';
let dbCollectionName = 'auths';
let localCollectionName = '_users';
let docId = '1';
let expression = {};
let countExpression = {$count: true};
let joinExpression = {_id: '$categories.1.userId'};
let field = 'name';
let value = 'Ivan';

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
  value
}
