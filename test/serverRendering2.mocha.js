import assert from 'assert'
import { MemoryStorage, Store, RootComponent, createContainer, renderToStaticMarkup } from '../lib'
import { collectionName, field, value } from './util'
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

let Container2 = createContainer(TestComponent2, React)

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

let Container = createContainer(TestComponent, React)

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
  beforeEach(() => {
    storage = new MemoryStorage()
    return storage
      .init()
      .then(() => {
        store = new Store(storage)
        model = store.createModel()

        return Promise
          .all([
            model.add(collectionName, {[field]: value}),
            model.add(collectionName, {[field]: 'Petr'})
          ])
      })
  })

  it('should render to string', () => {
    return renderToStaticMarkup(Root, {model})
      .then((html) => {
        assert(html)
        assert.equal(typeof html, 'string')
        assert(html.indexOf('ivan"><div>Ivan') > -1)
        assert(html.indexOf('petr"><div>Petr') > -1)
      })
  })
})
