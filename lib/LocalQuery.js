let debug = require('debug')('LocalQuery');
import ClientQuery from './ClientQuery';
import RemoteDoc from './RemoteDoc';
import util from './util';

class LocalQuery extends ClientQuery {
  constructor(collectionName, expression, model, storage, collection, querySet) {
    super(collectionName, expression, model, storage, collection, querySet);
  }

  refresh(op) {
    super.refresh(op);
    // TODO: emit only if there were changes
    this.emit('change');}
  }

  subscribe(listener) {
    super.subscribe(listener);

    process.nextTick(this.refresh.bind(this));
  }

  unsubscribe(listener) {
    super.unsubscribe(listener);
  }
}

export default LocalQuery;
