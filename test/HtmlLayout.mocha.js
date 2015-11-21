import assert from 'assert'
import { MemoryStorage, Store, HtmlLayout } from '../lib'
import React from 'react'
import { renderToString } from 'react-dom/server'

let storage
let store
let model

describe('HtmlLayout', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    return storage
      .init()
      .then(() => {
        store = new Store(storage)
        model = store.createModel()
      })
  })

  it('should render empty bundle json', () => {
    let html = renderToString(
      <HtmlLayout model={model}>
        'test'
      </HtmlLayout>
    )
    assert(html.indexOf('{"collections":{') > -1)
  })
})
