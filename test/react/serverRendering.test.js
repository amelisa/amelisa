import assert from 'assert'
import { MemoryStorage, Store, renderToStaticMarkup } from '../../src'
import { RootComponent, createContainer } from '../../src/react'
import { collectionName, field, value } from '../util'
import React from 'react'

let storage
let store
let model

class TestComponent6 extends React.Component {

  render () {
    return (
      <div className='no-name'>
        No name
      </div>
    )
  }
}

class TestComponent5 extends React.Component {

  getQueries () {
    return {
      users: ['users', {name: 'Misha'}]
    }
  }

  render () {
    let { users } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    return (
      <div className='misha'>
        {name}
      </div>
    )
  }
}

let Container5 = createContainer(TestComponent5)

class TestComponent4 extends React.Component {

  getQueries () {
    return {
      users: ['users', {name: 'Kostya'}]
    }
  }

  render () {
    let { users } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    return (
      <div className='kostya'>
        {name}
      </div>
    )
  }
}

let Container4 = createContainer(TestComponent4)

class TestComponent3 extends React.Component {

  getQueries () {
    return {
      users: ['users', {name: 'Vasya'}]
    }
  }

  render () {
    let { users } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    let components = [<div key='1'>{name}</div>, <Container5 key='2'/>]

    return (
      <div className='vasya'>
        {components}
      </div>
    )
  }
}

let Container3 = createContainer(TestComponent3)

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

    let components = [<div key='1'>{name}</div>, <TestComponent6 key='2'/>, <Container3 key='3'/>, <Container4 key='4'/>]

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
    let { users } = this.props // eslint-disable-line
    let user = users[0]
    let name = user ? user.name : 'no'

    let components = [<div key='1'>{name}</div>, <TestComponent6 key='2'/>, <Container2 key='3'/>]

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
    let components = [<div key='1'>Root</div>, <Container key='2'/>]
    return (
      <div className='root'>
        {components}
      </div>
    )
  }
}

describe('serverRendering', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()

    await storage.init()
    store = new Store(storage)
    model = store.createModel()

    await Promise.all([
      model.add(collectionName, {[field]: value}),
      model.add(collectionName, {[field]: 'Petr'}),
      model.add(collectionName, {[field]: 'Vasya'}),
      model.add(collectionName, {[field]: 'Kostya'}),
      model.add(collectionName, {[field]: 'Misha'})
    ])
  })

  it('should render to string', async () => {
    let html = await renderToStaticMarkup(Root, {model})

    assert(html)
    assert.equal(typeof html, 'string')
    assert(html.indexOf('ivan"><div>Ivan') > -1)
    assert(html.indexOf('petr"><div>Petr') > -1)
    assert(html.indexOf('vasya"><div>Vasya') > -1)
    assert(html.indexOf('kostya">Kostya') > -1)
    assert(html.indexOf('misha">Misha') > -1)
  })
})
