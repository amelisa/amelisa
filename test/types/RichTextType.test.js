import assert from 'assert'
import RichTextType from '../../src/types/RichTextType'

let rich
let value = {insert: 'Gandalf', attributes: {bold: true}}

describe('RichTextType', () => {
  it('should have value as empty array by default', () => {
    rich = new RichTextType()

    assert.deepEqual(rich.get(), [])
  })

  it('should have value if inited with it', () => {
    rich = new RichTextType([value])

    assert.deepEqual(rich.get(), [value])
  })

  it('should push delta', () => {
    rich = new RichTextType()
    rich.pushDelta(value)

    assert.deepEqual(rich.get(), [value])
  })
})
