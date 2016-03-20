import assert from 'assert'
import StringType from '../../src/types/StringType'

let string

describe('StringType', () => {
  it('should have value empty string by default', () => {
    string = new StringType()

    assert.equal(string.get(), '')
  })

  it('should insert at empty string', () => {
    string = new StringType()
    string.insert(null, '1', 'a')

    assert.equal(string.get(), 'a')
  })

  it('should insert by positionId', () => {
    string = new StringType()
    string.insert(null, '1', 'a')
    string.insert('1', '2', 'b')

    assert.equal(string.get(), 'ab')
  })

  it('should insert without positionId', () => {
    string = new StringType()
    string.insert(null, '1', 'a')
    string.insert(null, '2', 'b')

    assert.equal(string.get(), 'ba')
  })

  it('should remove', () => {
    string = new StringType()
    string.insert(null, '1', 'a')
    string.insert('1', '2', 'b')
    string.remove('2')

    assert.equal(string.get(), 'a')
  })

  it('should get insert positionId when insert to the end', () => {
    string = new StringType()
    string.insert(null, '1', 'a')
    string.insert('1', '2', 'b')
    let positionId = string.getInsertPositionIdByIndex(2)

    assert.equal(positionId, '2')
  })
})
