// let debug = require('debug')('LocalStorage');
import uuid from 'uuid';

const sourceKey = 'source';
const projectionHashsKey = 'projectionHashs';

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

  getProjectionHashes() {
    let projectionHashsJson = this.db.getItem(projectionHashsKey);
    if (!projectionHashsJson) return {};

    return JSON.parse(projectionHashsJson);
  }

  setProjectionHashes(projectionHashs) {
    let projectionHashsJson = JSON.stringify(projectionHashs);

    this.db.setItem(projectionHashsKey, projectionHashsJson);
  }
}

export default LocalStorage;
