import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { source, collectionName, docId, field } from '../../../util'

let channel
let model

describe('Model mutators rich', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel, source)
  })

  it('should diff on empty', () => {
    let blocks = [
      {
        key: '1',
        text: 'asdf'
      }
    ]
    model.richDiff([collectionName, docId, field], blocks)

    assert.deepEqual(model.get(collectionName, docId, field), blocks)
  })

  it('should diff when remove and insert', () => {
    let blocks = [
      {
        key: '1',
        text: 'asdf'
      }
    ]
    model.richDiff([collectionName, docId, field], blocks)

    let blocks2 = [
      {
        key: '2',
        text: 'zxcv'
      }
    ]
    model.richDiff([collectionName, docId, field], blocks2)

    assert.deepEqual(model.get(collectionName, docId, field), blocks2)
  })

  it('should diff when text', () => {
    let blocks = [
      {
        key: '1',
        text: 'asdf'
      }
    ]
    model.richDiff([collectionName, docId, field], blocks)

    let blocks2 = [
      {
        key: '1',
        text: 'zxcv'
      }
    ]
    model.richDiff([collectionName, docId, field], blocks2)

    assert.deepEqual(model.get(collectionName, docId, field), blocks2)
  })

  it('should diff when characterList', () => {
    let blocks = [
      {
        key: '1',
        text: 'asdf',
        characterList: [
          {
            entity: {},
            styles: ['BOLD']
          },
          {
            entity: {},
            styles: ['BOLD']
          },
          {
            entity: {},
            styles: []
          },
          {
            entity: {},
            styles: ['BOLD']
          }
        ]
      }
    ]
    model.richDiff([collectionName, docId, field], blocks)

    let blocks2 = [
      {
        key: '1',
        text: 'zxcv',
        characterList: [
          {
            entity: {},
            styles: []
          },
          {
            entity: {},
            styles: []
          },
          {
            entity: {},
            styles: ['BOLD']
          },
          {
            entity: {},
            styles: ['BOLD']
          }
        ]
      }
    ]
    model.richDiff([collectionName, docId, field], blocks2)

    assert.deepEqual(model.get(collectionName, docId, field), blocks2)
  })
})
