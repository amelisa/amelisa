import Char from './Char'

// StringType is doubly linked list data structure with O(1) inserts

class StringType {
  constructor (chars = {}) {
    this.chars = chars
    this.firstCharId = null
  }

  get () {
    let values = []
    let charId = this.firstCharId

    while (charId) {
      let char = this.chars[charId]
      if (!char) break
      charId = char.nextId
      if (char.removed) continue
      values.push(char.value)
    }

    return values.join('')
  }

  insert (positionId, charId, value) {
    let nextId
    if (positionId) {
      let prevChar = this.chars[positionId]
      if (!prevChar) return
      nextId = prevChar.nextId
      prevChar.nextId = charId
    } else {
      if (this.firstCharId) {
        let firstChar = this.chars[this.firstCharId]
        firstChar.previousId = charId
        nextId = firstChar.charId
      }
      this.firstCharId = charId
    }
    let char = new Char(charId, value, positionId, nextId)
    this.chars[charId] = char
    if (!nextId) return
    let nextChar = this.chars[nextId]
    nextChar.previousId = charId
  }

  remove (positionId) {
    let char = this.chars[positionId]
    if (!char) return
    char.removed = true
  }

  getIndexByPositionId (positionId) {
    let index = 0
    let charId = this.firstCharId
    while (charId) {
      if (charId === positionId) return index
      let char = this.chars[charId]
      charId = char && char.nextId
    }
    return -1
  }

  getInsertPositionIdByIndex (index) {
    let currentIndex = 0
    let charId = this.firstCharId
    while (charId) {
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
    let currentIndex = 0
    let charId = this.firstCharId
    while (charId) {
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

  getStringSetValue () {
    let index = 0
    let charId = this.firstCharId
    let setValue = []
    while (charId) {
      let char = this.chars[charId]
      charId = char && char.nextId
      if (char && !char.removed) {
        setValue.push([char.charId, char.value])
        index++
      }
    }
    return setValue
  }

  setStringSetValue (setValue) {
    this.firstCharId = null
    let chars = {}
    let previousId

    for (let [charId, value] of setValue) {
      if (!this.firstCharId) this.firstCharId = charId
      let char = new Char(charId, value, previousId)
      chars[charId] = char
      if (previousId) chars[previousId].nextId = charId
      previousId = charId
    }

    this.chars = chars
  }

  setValue (values, generateCharId) {
    this.firstCharId = null
    let chars = {}
    let previousId

    for (let value of values) {
      let charId = generateCharId()
      if (!this.firstCharId) this.firstCharId = charId
      let char = new Char(charId, value, previousId)
      chars[charId] = char
      if (previousId) chars[previousId].nextId = charId
      previousId = charId
    }

    this.chars = chars
  }
}

export default StringType
