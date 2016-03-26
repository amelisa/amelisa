import assert from 'assert'
import HtmlLayout from '../../src/react/HtmlLayout'
import { MemoryStorage } from '../../src/mongo/server'
import { Store } from '../../src/server'
import React from 'react'
import { renderToString } from 'react-dom/server'

let storage
let store
let model

describe('HtmlLayout', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store({storage})
    await store.init()
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
