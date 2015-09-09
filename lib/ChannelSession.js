class ChannelSession {
  constructor() {
    this.collections = {};
    this.queries = {};
  }

  subscribeDoc(collectionName, docId, version) {
    let collection = this.collections[collectionName] || (this.collections[collectionName] = {});
    // TODO: allready subscribed error
    collection[docId] = version;
  }

  unsubscribeDoc(collectionName, docId) {
    let collection = this.collections[collectionName] || (this.collections[collectionName] = {});
    // TODO: allready unsubscribed error
    delete collection[docId];
  }

  subscribeQuery(collectionName, expression) {
    var hash = queryHash(collectionName, expression);
    // TODO: allready subscribed error
    this.queries[hash] = true;
  }

  unsubscribeQuery(collectionName, expression) {
    var hash = queryHash(collectionName, expression);
    // TODO: allready unsubscribed error
    delete this.queries[hash];
  }

  isDocSubscribed(collectionName, docId) {
    let collection = this.collections[collectionName];
    return collection && collection[docId];
  }

  isQuerySubscribed(collectionName, expression) {
    var hash = queryHash(collectionName, expression);
    return this.queries[hash];
  }

  getDocVersion(collectionName, docId) {
    let collection = this.collections[collectionName];
    return collection && collection[docId];
  }
}

function queryHash(collectionName, expression) {
  var args = [collectionName, expression];
  return JSON.stringify(args).replace(/\./g, '|');
}

export default ChannelSession;
