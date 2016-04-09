import assert from 'assert'
import React, { Component } from 'react'
import { MemoryStorage } from '../../src/mongo/server'
import { Store } from '../../src/server'
import { RootComponent, createContainer } from '../../src/react'
import { renderToStaticMarkup } from '../../src/react/server'
import { collectionName, field, value } from '../util'

let storage
let store
let model

class TestComponent extends Component {

  subscribe () {
    return {
      users: ['users', {}]
    }
  }

  render () {
    let { users } = this.props // eslint-disable-line

    return (
      <div>
        {users.length}
      </div>
    )
  }
}

let Container = createContainer(TestComponent)

class Root extends RootComponent {

  render () {
    return <Container />
  }
}

describe('createContainer', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store({storage})
    await store.init()
    model = store.createModel()

    await Promise.all([
      model.add(collectionName, {[field]: value}),
      model.add(collectionName, {[field]: 'Petr'}),
      model.add(collectionName, {[field]: 'Vasya'}),
      model.add(collectionName, {[field]: 'Kostya'}),
      model.add(collectionName, {[field]: 'Misha'})
    ])
  })

  it('should subscribe', async () => {
    let html = await renderToStaticMarkup(Root, {model})

    assert(html)
    assert.equal(typeof html, 'string')
    assert.equal(html, '<div>5</div>')
  })
})
