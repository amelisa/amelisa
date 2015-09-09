let debug = require('debug')('LocalStorage');
import uuid from 'uuid';

const sourceKey = 'source';

class LocalStorage {
  constructor() {
    this.db = localStorage;
  }

  getSource() {
    let source = this.db.getItem(sourceKey);
    if (!source) {
      source = uuid.v4();
      this.db.setItem(sourceKey, source);
    }
    return source;
  }
}

export default LocalStorage;
