import assert from 'assert'
import ArrayType from '../../src/types/ArrayType'

let array

describe('ArrayType', () => {
  it('should have value empty array by default', () => {
    array = new ArrayType()

    assert(Array.isArray(array.get()))
    assert.equal(array.get().length, 0)
  })

  it('should push when empty', () => {
    array = new ArrayType()
    array.push('1', 1)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })

  it('should push', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should push after remove', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.remove('2')
    array.push('3', 3)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 3)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '3')
  })

  it('should unshift when empty', () => {
    array = new ArrayType()
    array.unshift('1', 1)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })

  it('should unshift', () => {
    array = new ArrayType()
    array.unshift('1', 1)
    array.unshift('2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '1')
  })

  it('should unshift after remove', () => {
    array = new ArrayType()
    array.unshift('1', 1)
    array.unshift('2', 2)
    array.remove('2')
    array.unshift('3', 3)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 3)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '3')
    assert.equal(array.lastItemId, '1')
  })

  it('should pop', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.pop()

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })

  it('should pop till empty', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.pop()

    assert.equal(array.get().length, 0)
    assert.equal(array.firstItemId, null)
    assert.equal(array.lastItemId, null)
  })

  it('should shift', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.shift()

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 2)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '2')
  })

  it('should shift till empty', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.shift()

    assert.equal(array.get().length, 0)
    assert.equal(array.firstItemId, null)
    assert.equal(array.lastItemId, null)
  })

  it('should insert at empty array', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })

  it('should insert by positionId', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)
    array.insert('1', '2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should insert without positionId', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)
    array.insert(null, '2', 2)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '1')
  })

  it('should insert after remove', () => {
    array = new ArrayType()
    array.insert(null, '1', 1)
    array.remove('1')
    array.insert('1', '2', 2)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should remove', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.remove('2')

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 1)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should remove till empty', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.remove('2')
    array.remove('1')

    assert.equal(array.get().length, 0)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should move', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.move('1', '2')

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '1')
  })

  it('should move when to beginning', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.move('2', null)

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '1')
  })

  it('should move when to between', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.push('3', 3)
    array.move('3', '1')

    assert.equal(array.get().length, 3)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 3)
    assert.equal(array.get()[2], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should move when from between', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.push('3', 3)
    array.move('2', '3')

    assert.equal(array.get().length, 3)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 3)
    assert.equal(array.get()[2], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should move when previous place', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.move('2', '1')

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 2)
    assert.equal(array.get()[1], 1)
    assert.equal(array.firstItemId, '2')
    assert.equal(array.lastItemId, '1')
  })

  it('should not move when same place', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.push('2', 2)
    array.move('2', '2')

    assert.equal(array.get().length, 2)
    assert.equal(array.get()[0], 1)
    assert.equal(array.get()[1], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '2')
  })

  it('should set', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.set('1', 2)

    assert.equal(array.get().length, 1)
    assert.equal(array.get()[0], 2)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })

  it('should del', () => {
    array = new ArrayType()
    array.push('1', 1)
    array.del('1')

    assert.equal(array.get().length, 0)
    assert.equal(array.firstItemId, '1')
    assert.equal(array.lastItemId, '1')
  })
})
