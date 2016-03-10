import assert from 'assert'
import NumberType from '../../src/types/NumberType'

let number

describe('NumberType', () => {
  it('should have value zero by default', () => {
    number = new NumberType()

    assert.equal(number.get(), 0)
  })

  it('should have value zero if inited with string', () => {
    number = new NumberType('3')

    assert.equal(number.get(), 0)
  })

  it('should be inited with number value', () => {
    number = new NumberType(3)

    assert.equal(number.get(), 3)
  })

  it('should increment', () => {
    number = new NumberType(3)
    number.increment(2)

    assert.equal(number.get(), 5)
  })

  it('should increment by one by default', () => {
    number = new NumberType(3)
    number.increment()

    assert.equal(number.get(), 4)
  })
})
