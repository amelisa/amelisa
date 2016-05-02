import assert from 'assert'
import { Store } from '../../src/server'
import { RootComponent, createContainer } from '../../src/react'
import { renderToStaticMarkup } from '../../src/react/server'
import { getStorage, collectionName, docId, field, value, sleep } from '../util'
import React from 'react'

let storage
let store
let model

class TestComponent extends React.Component {

  subscribe () {
    return {
      // users: ['users', {name: 'Ivan'}]
      user: [collectionName, docId]
    }
  }

  render () {
    let { user } = this.props // eslint-disable-line
    let name = user ? user.name : 'no'

    let components = [<div key='1'>{name}</div>]

    return (
      <div className='ivan'>
        {components}
      </div>
    )
  }
}

let Container = createContainer(TestComponent)

class Root extends RootComponent {

  render () {
    let { children } = this.props // eslint-disable-line

    let components = [<div key='1'>Root</div>]
    return (
      <div className='root'>
        {components}
        {children}
      </div>
    )
  }
}

describe.skip('serverRendering3', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage})
    await store.init()
    model = store.createModel()

    let doc = {
      id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
  })

  it('should render to string and dispose container', async () => {
    let html = await renderToStaticMarkup(Root, {model}, <Container />)

    assert(html)
    assert.equal(typeof html, 'string')

    await sleep(10)
    await model.set([collectionName, docId, field], 'Petr')
  })
})
