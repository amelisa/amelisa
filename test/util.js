let source = 'source';
let collectionName = 'users';
let dbCollectionName = 'auths';
let localCollectionName = '_users';
let docId = '1';
let expression = {};
let countExpression = {$count: true};
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
  field,
  value
}
