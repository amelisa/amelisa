class Char {
  constructor (charId, value, previousId, nextId) {
    this.charId = charId
    this.value = value
    this.previousId = previousId
    this.nextId = nextId
    this.removed = false
  }
}

export default Char
