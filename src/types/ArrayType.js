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
    let toIndex = 0
    if (itemId) {
      toIndex = this.getIndexByPositionId(itemId)
      if (toIndex === -1) return
      toIndex++
    }
    if (fromIndex === toIndex) toIndex--
    let value = this.items.splice(fromIndex, 1)[0]
    this.items.splice(toIndex, 0, value)
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

  setValue (values, generateCharId) {
    let items = []

    for (let value of values) {
      let itemId = generateCharId()
      let item = new Item(itemId, value)
      items.push(item)
    }

    this.items = items
  }
}

export default ArrayType
