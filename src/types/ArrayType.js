import Item from './Item'

class ArrayType {
  constructor (items = []) {
    this.items = items
  }

  get () {
    return this.getNotRemoved()
      .map((item) => item.value)
  }

  getNotRemoved () {
    return this.items
      .filter((item) => !item.removed)
  }

  push (itemId, value) {
    let item = new Item(itemId, value)
    this.items.push(item)
  }

  unshift (itemId, value) {
    let item = new Item(itemId, value)
    this.items.unshift(item)
  }

  pop () {
    this.items.pop()
  }

  shift () {
    this.items.shift()
  }

  insert (positionId, itemId, value) {
    let index = 0
    if (positionId) {
      index = this.getIndexByPositionId(positionId)
      if (index === -1) return
      index++
    }
    let item = new Item(itemId, value)
    this.items.splice(index, 0, item)
  }

  remove (positionId) {
    let index = this.getIndexByPositionId(positionId)
    if (index === -1) return
    let item = this.items[index]
    item.removed = true
  }

  move (positionId, itemId) {
    let fromIndex = this.getIndexByPositionId(positionId)
    if (fromIndex === -1) return
    let toIndex = this.getIndexByPositionId(itemId)
    if (toIndex === -1) return
    this.items.splice(toIndex, 0, this.items.splice(fromIndex, 1)[0])
  }

  getIndexByPositionId (positionId) {
    return this.items.findIndex((item) => item.itemId === positionId)
  }

  getInsertPositionIdByIndex (index) {
    let item = this.getNotRemoved()[index - 1]
    if (item) return item.itemId
  }

  getRemovePositionIdByIndex (index) {
    let item = this.getNotRemoved()[index]
    if (item) return item.itemId
  }

  getArraySetValue () {
    return this.items
      .filter((item) => !item.removed)
      .map((item) => [item.itemId, item.value])
  }

  setArraySetValue (setValue) {
    this.items = setValue.map(([itemId, value]) => new Item(itemId, value))
  }
}

export default ArrayType
