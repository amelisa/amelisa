import Item from './Item'

// ArrayType is doubly linked list data structure with O(1) inserts

class ArrayType {
  constructor (items = {}) {
    this.items = items
    this.firstItemId = null
    this.lastItemId = null
  }

  get () {
    let itemIds = {}
    let values = []
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      itemId = item.nextId
      if (item.removed) continue
      values.push(item.value)
    }

    return values
  }

  getNotRemoved () {
    return this.items
      .filter((item) => !item.removed)
  }

  getByIndex (index) {
    let itemIds = {}
    let currentIndex = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed) {
        itemId = item.nextId
        continue
      }
      if (currentIndex === +index) return item.value
      itemId = item.nextId
      currentIndex++
    }
  }

  getByPositionId (positionId) {
    let item = this.items[positionId]
    if (!item) return
    return item.value
  }

  set (positionId, value) {
    let item = this.items[positionId]
    if (!item) return
    item.value = value
  }

  del (positionId) {
    let item = this.items[positionId]
    if (!item) return
    item.removed = true
  }

  push (itemId, value) {
    let item = new Item(itemId, value)
    this.items[itemId] = item
    if (!this.firstItemId) {
      this.firstItemId = itemId
      this.lastItemId = itemId
      return
    }
    let lastItem = this.items[this.lastItemId]
    lastItem.nextId = itemId
    item.previousId = lastItem.itemId
    this.lastItemId = itemId
  }

  unshift (itemId, value) {
    let item = new Item(itemId, value, null, this.firstItemId)
    this.items[itemId] = item
    if (!this.firstItemId) {
      this.firstItemId = itemId
      this.lastItemId = itemId
      return
    }
    let firstItem = this.items[this.firstItemId]
    firstItem.previousId = itemId
    item.nextId = firstItem.itemId
    this.firstItemId = itemId
  }

  pop () {
    if (!this.lastItemId) return
    let lastItem = this.items[this.lastItemId]
    delete this.items[this.lastItemId]
    let previousId = lastItem.previousId
    if (previousId) {
      this.items[previousId].nextId = null
      this.lastItemId = previousId
    } else {
      this.firstItemId = null
      this.lastItemId = null
    }
  }

  shift () {
    if (!this.firstItemId) return
    let firstItem = this.items[this.firstItemId]
    delete this.items[this.firstItemId]
    let nextId = firstItem.nextId
    if (nextId) {
      this.items[nextId].previousId = null
      this.firstItemId = nextId
    } else {
      this.firstItemId = null
      this.lastItemId = null
    }
  }

  insert (positionId, itemId, value) {
    if (!this.firstItemId && positionId) return
    let item = new Item(itemId, value, positionId)
    this.items[itemId] = item
    if (!this.firstItemId) {
      this.firstItemId = itemId
      this.lastItemId = itemId
      return
    }

    if (!positionId) {
      let firstItem = this.items[this.firstItemId]
      firstItem.previousId = itemId
      item.nextId = firstItem.itemId
      this.firstItemId = itemId
    } else {
      let prevItem = this.items[positionId]
      if (!prevItem) {
        delete this.items[itemId]
        return
      }
      let nextId = prevItem.nextId
      prevItem.nextId = itemId
      item.nextId = nextId
      if (nextId) {
        let nextItem = this.items[nextId]
        nextItem.previousId = itemId
      } else {
        this.lastItemId = itemId
      }
    }
  }

  remove (positionId) {
    let item = this.items[positionId]
    if (!item) return
    item.removed = true
  }

  move (positionId, itemId) {
    if (!this.firstItemId || positionId === itemId) return
    let item = this.items[positionId]
    if (!item) return
    let toItem
    if (itemId) {
      toItem = this.items[itemId]
      if (!toItem) return
      if (toItem.nextId === positionId) {
        if (toItem.previousId) {
          toItem = this.items[toItem.previousId]
        } else {
          toItem = null
        }
      }
    }
    if (item.previousId) {
      let prevItem = this.items[item.previousId]
      prevItem.nextId = item.nextId
    } else {
      this.firstItemId = item.nextId
    }
    if (item.nextId) {
      let nextItem = this.items[item.nextId]
      nextItem.previousId = item.previousId
    } else {
      this.lastItemId = item.previousId
    }
    if (!toItem) {
      let firstItem = this.items[this.firstItemId]
      firstItem.previousId = item.itemId
      item.nextId = firstItem.itemId
      this.firstItemId = item.itemId
      item.previousId = null
      return
    }
    if (toItem.nextId) {
      let nextItem = this.items[toItem.nextId]
      nextItem.previousId = item.itemId
    } else {
      this.lastItemId = item.itemId
    }
    item.nextId = toItem.nextId
    item.previousId = toItem.itemId
    toItem.nextId = item.itemId
  }

  getIndexByPositionId (positionId) {
    let itemIds = {}
    let index = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      if (itemId === positionId) return index
      let item = this.items[itemId]
      if (!item) break
      itemId = item.nextId
      index++
    }

    return -1
  }

  getNotRemovedIndexByPositionId (positionId) {
    let itemIds = {}
    let index = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      if (itemId === positionId) return index
      let item = this.items[itemId]
      if (!item) break
      itemId = item.nextId
      if (!item.removed) index++
    }

    return -1
  }

  getInsertPositionIdByIndex (index) {
    let itemIds = {}
    let currentIndex = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed) {
        itemId = item.nextId
        continue
      }
      if (currentIndex === index - 1) return itemId
      itemId = item.nextId
      currentIndex++
    }
  }

  getRemovePositionIdByIndex (index) {
    let itemIds = {}
    let currentIndex = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed) {
        itemId = item.nextId
        continue
      }
      if (currentIndex === index) return itemId
      itemId = item.nextId
      currentIndex++
    }
  }

  getNextRemovePositionId (positionId) {
    let itemIds = {}
    let itemId = positionId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed || itemId === positionId) {
        itemId = item.nextId
        continue
      }
      return itemId
    }
  }

  getNextSetPositionId (positionId) {
    let itemIds = {}
    let itemId = positionId || this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed || itemId === positionId) {
        itemId = item.nextId
        continue
      }
      return itemId
    }
  }

  getSetPositionIdByIndex (index) {
    let itemIds = {}
    let currentIndex = 0
    let itemId = this.firstItemId

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed) {
        itemId = item.nextId
        continue
      }
      if (currentIndex === +index) return itemId
      itemId = item.nextId
      currentIndex++
    }
  }

  getArraySetValue () {
    let itemIds = {}
    let index = 0
    let itemId = this.firstItemId
    let setValue = []

    while (itemId) {
      if (itemIds[itemId]) break
      itemIds[itemId] = true

      let item = this.items[itemId]
      if (!item) break
      if (item.removed) {
        itemId = item.nextId
        continue
      }
      setValue.push([item.itemId, item.value])
      itemId = item.nextId
      index++
    }

    return setValue
  }

  setArraySetValue (setValue) {
    this.firstItemId = null
    this.lastItemId = null
    this.items = {}
    let previousId
    let index = 0

    for (let [itemId, value] of setValue) {
      if (!this.firstItemId) this.firstItemId = itemId
      let item = new Item(itemId, value, previousId)
      this.items[itemId] = item
      if (previousId) this.items[previousId].nextId = itemId
      previousId = itemId
      if (index === setValue.length - 1) this.lastItemId = itemId
      index++
    }
  }

  setValue (values, generateCharId) {
    this.firstItemId = null
    this.lastItemId = null
    this.items = {}
    let previousId
    let index = 0

    for (let value of values) {
      let itemId = generateCharId()
      if (!this.firstItemId) this.firstItemId = itemId
      let item = new Item(itemId, value, previousId)
      this.items[itemId] = item
      if (previousId) this.items[previousId].nextId = itemId
      previousId = itemId
      if (index === values.length - 1) this.lastItemId = itemId
      index++
    }
  }
}

export default ArrayType
