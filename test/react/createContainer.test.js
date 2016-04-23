import assert from 'assert'
import React, { Component } from 'react'
import { render } from 'react-dom'
import { MemoryStorage } from '../../src/mongo/server'
import { Store } from '../../src/server'
import { RootComponent, createContainer } from '../../src/react'
import { renderToStaticMarkup } from '../../src/react/server'
import { collectionName, field, value, sleep } from '../util'

let storage
let store
let model
let changeUserQueryForTestComponent

class TestComponent extends Component {

  state = {
    userQuery: {}
  };

  componentWillMount () {
    changeUserQueryForTestComponent = this.changeUserQuery
  }

  changeUserQuery = () => {
    let { resubscribe } = this.props // eslint-disable-line

    this.setState({
      userQuery: {[field]: value}
    })
    // resubscribe({users: ['users', {[field]: value}]})
    resubscribe()
  };

  subscribe () {
    let { userQuery } = this.state

    return {
      users: ['users', userQuery]
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

  // TODO: fix rerender
  it.skip('should resubscribe', async () => {
    // let html = await renderToStaticMarkup(Root, {model})
    render(<Root model={model} />, document.body)
    await sleep(20)

    assert(changeUserQueryForTestComponent)

    changeUserQueryForTestComponent()
    await sleep(20)
    let html = document.body.innerHTML
    assert.equal(typeof html, 'string')
    assert.equal(html, '<div>1</div>')
  })
})
