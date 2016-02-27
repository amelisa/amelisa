import assert from 'assert'
import { MemoryStorage, Store, renderToStaticMarkup } from '../../src/server'
import { RootComponent, createContainer } from '../../src/react'
import { collectionName, field, value } from '../util'
import React from 'react'

let storage
let store
let model

class TestComponent2 extends React.Component {

  getQueries () {
    return {
      users: ['users', {name: 'Petr'}]
    }
  }

  render () {
    let { users } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    let components = [<div key='1'>{name}</div>]

    return (
      <div className='petr'>
        {components}
      </div>
    )
  }
}

let Container2 = createContainer(TestComponent2)

class TestComponent extends React.Component {

  getQueries () {
    return {
      users: ['users', {name: 'Ivan'}]
    }
  }

  render () {
    let { users, children } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    let components = [<div key='1'>{name}</div>]

    return (
      <div className='ivan'>
        {components}
        {children}
      </div>
    )
  }
}

let Container = createContainer(TestComponent)

class Root extends RootComponent {

  render () {
    return (
      <div className='root'>
        <Container key='2'>
          <Container2 key='3'/>
        </Container>
      </div>
    )
  }
}

describe.skip('serverRendering2', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()

    await Promise.all([
      model.add(collectionName, {[field]: value}),
      model.add(collectionName, {[field]: 'Petr'})
    ])
  })

  it('should render to string with children', async () => {
    let html = await renderToStaticMarkup(Root, {model})

    assert(html)
    assert.equal(typeof html, 'string')
    assert(html.indexOf('ivan"><div>Ivan') > -1)
    assert(html.indexOf('petr"><div>Petr') > -1)
  })
})
