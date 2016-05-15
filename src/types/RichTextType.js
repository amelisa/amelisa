class RichTextType {
  constructor (deltas = []) {
    this.deltas = deltas
  }

  get () {
    return this.deltas
  }

  pushDelta (delta) {
    this.deltas.push(delta)
  }
}

export default RichTextType
