import assert from 'assert'
import HtmlLayout from '../../src/react/HtmlLayout'
import { Store } from '../../src/server'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { getStorage } from '../util'

let storage
let store
let model

describe('HtmlLayout', () => {
  beforeEach(async () => {
    storage = await getStorage()
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
