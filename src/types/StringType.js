import Char from './Char'

// StringType is doubly linked list data structure with O(1) inserts

class StringType {
  constructor (chars = {}) {
    this.chars = chars
    this.firstCharId = null
  }

  get () {
    let charIds = {}
    let values = []
    let charId = this.firstCharId

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      let char = this.chars[charId]
      if (!char) break
      charId = char.nextId
      if (char.removed) continue
      values.push(char.value)
    }

    return values.join('')
  }

  insert (positionId, charId, value) {
    if (!this.firstCharId && positionId) return
    let char = new Char(charId, value, positionId)
    this.chars[charId] = char
    if (!this.firstCharId) {
      this.firstCharId = charId
      return
    }

    if (!positionId) {
      let firstChar = this.chars[this.firstCharId]
      firstChar.previousId = charId
      char.nextId = firstChar.charId
      this.firstCharId = charId
    } else {
      let prevChar = this.chars[positionId]
      if (!prevChar) {
        delete this.chars[charId]
        return
      }
      let nextId = prevChar.nextId
      prevChar.nextId = charId
      char.nextId = nextId
      if (nextId) {
        let nextItem = this.chars[nextId]
        nextItem.previousId = charId
      }
    }
  }

  remove (positionId) {
    let char = this.chars[positionId]
    if (!char) return
    char.removed = true
  }

  getIndexByPositionId (positionId) {
    let charIds = {}
    let index = 0
    let charId = this.firstCharId

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      if (charId === positionId) return index
      let char = this.chars[charId]
      if (!char) break
      charId = char.nextId
      index++
    }

    return -1
  }

  getInsertPositionIdByIndex (index) {
    let charIds = {}
    let currentIndex = 0
    let charId = this.firstCharId

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      let char = this.chars[charId]
      if (!char) break
      if (char.removed) {
        charId = char.nextId
        continue
      }
      if (currentIndex === index - 1) return charId
      charId = char.nextId
      currentIndex++
    }
  }

  getRemovePositionIdByIndex (index) {
    let charIds = {}
    let currentIndex = 0
    let charId = this.firstCharId

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      let char = this.chars[charId]
      if (!char) break
      if (char.removed) {
        charId = char.nextId
        continue
      }
      if (currentIndex === index) return charId
      charId = char.nextId
      currentIndex++
    }
  }

  getNextRemovePositionId (positionId) {
    let charIds = {}
    let charId = positionId

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      let char = this.chars[charId]
      if (!char) break
      if (char.removed || charId === positionId) {
        charId = char.nextId
        continue
      }
      return charId
    }
  }

  getStringSetValue () {
    let charIds = {}
    let index = 0
    let charId = this.firstCharId
    let setValue = []

    while (charId) {
      if (charIds[charId]) break
      charIds[charId] = true

      let char = this.chars[charId]
      if (!char) break
      if (char.removed) {
        charId = char.nextId
        continue
      }
      setValue.push([char.charId, char.value])
      charId = char.nextId
      index++
    }

    return setValue
  }

  setStringSetValue (setValue) {
    this.firstCharId = null
    this.chars = {}
    let previousId

    for (let [charId, value] of setValue) {
      if (!this.firstCharId) this.firstCharId = charId
      let char = new Char(charId, value, previousId)
      this.chars[charId] = char
      if (previousId) this.chars[previousId].nextId = charId
      previousId = charId
    }
  }

  setValue (values, generateCharId) {
    this.firstCharId = null
    this.chars = {}
    let previousId

    for (let value of values) {
      let charId = generateCharId()
      if (!this.firstCharId) this.firstCharId = charId
      let char = new Char(charId, value, previousId)
      this.chars[charId] = char
      if (previousId) this.chars[previousId].nextId = charId
      previousId = charId
    }
  }
}

export default StringType
