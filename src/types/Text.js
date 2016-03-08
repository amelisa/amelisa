import Char from './Char'

class Text {
  constructor (chars = []) {
    this.chars = chars
  }

  get () {
    return this.chars
      .filter((char) => !char.removed)
      .map((char) => char.value)
      .join('')
  }

  insertChar (positionId, charId, value) {
    let index = 0
    if (positionId) {
      index = this.getIndexByPositionId(positionId)
      if (index === -1) return
      index++
    }
    let char = new Char(charId, value)
    this.chars.splice(index, 0, char)
  }

  removeChar (positionId) {
    let index = this.getIndexByPositionId(positionId)
    if (index === -1) return
    let char = this.chars[index]
    char.removed = true
  }

  getIndexByPositionId (positionId) {
    return this.chars.findIndex((char) => char.charId === positionId)
  }

  getInsertPositionIdByIndex (index) {
    let char = this.chars[index - 1]
    if (char) return char.charId
  }

  getRemovePositionIdByIndex (index) {
    let char = this.chars.filter((char) => !char.removed)[index]
    if (char) return char.charId
  }
}

export default Text
