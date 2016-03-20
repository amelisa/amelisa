import assert from 'assert'
import ArrayType from '../../src/types/ArrayType'

let array

describe('ArrayType', () => {
  it('should have value empty array by default', () => {
    array = new ArrayType()

    assert(Array.isArray(array.get()))
    assert.equal(array.get().length, 0)
  })

  it('should push', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 2)
  })

  it('should unshift', () => {
    array = new ArrayType()
    array.unshift('1', 1)
    array.unshift('2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
  })

  it('should pop', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.pop()

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
  })

  it('should shift', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.shift()

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 2)
  })

  it('should insert at empty array', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
  })

  it('should insert by positionId', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)
    array.insert('1', '2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 2)
  })

  it('should insert without positionId', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)
    array.insert(null, '2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
  })

  it('should remove', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.remove('2')

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
  })

  it('should move', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.move('2', '1')

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
  })
})