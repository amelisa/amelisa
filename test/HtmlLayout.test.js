import assert from 'assert'
import HtmlLayout from '../src/HtmlLayout'
import { MemoryStorage, Store } from '../src'
import React from 'react'
import { renderToString } from 'react-dom/server'

let storage
let store
let model

describe('HtmlLayout', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()
    store = new Store(storage)
    model = store.createModel()
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
