import assert from 'assert'
import BooleanType from '../../src/types/BooleanType'

let boolean

describe('BooleanType', () => {
  it('should have value false by default', () => {
    boolean = new BooleanType()

    assert.equal(boolean.get(), false)
  })

  it('should have value false if inited with string', () => {
    boolean = new BooleanType('true')

    assert.equal(boolean.get(), false)
  })

  it('should be inited with boolean value', () => {
    boolean = new BooleanType(true)

    assert.equal(boolean.get(), true)
  })

  it('should invert when false', () => {
    boolean = new BooleanType(false)
    boolean.invert()

    assert.equal(boolean.get(), true)
  })

  it('should invert when true', () => {
    boolean = new BooleanType(true)
    boolean.invert()

    assert.equal(boolean.get(), false)
  })
})
