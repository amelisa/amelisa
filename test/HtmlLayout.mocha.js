import assert from 'assert';
import { MemoryStorage, Store, RootComponent, HtmlLayout } from '../lib';
import { source, collectionName, localCollectionName, docId, expression, field, value } from './util';
import React from 'react';

let storage;
let store;
let model;

class Root extends RootComponent{

  render() {
    return (
      <HtmlLayout>
        'test'
      </HtmlLayout>
    )
  }
}

describe('HtmlLayout', () => {

  beforeEach(() => {
    storage = new MemoryStorage();
    return storage
      .init()
      .then(() => {
        store = new Store(storage);
        model = store.createModel();
      });
  });

  it('should render empty bundle json', () => {
    let html = React.renderToString(React.createElement(Root, {model}));
    assert(html.indexOf('{"collections":{') > -1)
  });
});
