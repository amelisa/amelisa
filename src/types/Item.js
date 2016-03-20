class Item {
  constructor (itemId, value, previousId, nextId) {
    this.itemId = itemId
    this.value = value
    this.previousId = previousId
    this.nextId = nextId
    this.removed = false
  }
}

export default Item
