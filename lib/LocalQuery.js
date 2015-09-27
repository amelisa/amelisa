// let debug = require('debug')('LocalQuery');
import ClientQuery from './ClientQuery';

class LocalQuery extends ClientQuery {
  constructor(collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet);
    this.local = true;
    this.refresh();
  }

  refresh(op) {
    super.refresh(op);

    // TODO: emit only if there were changes
    this.emit('change');
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