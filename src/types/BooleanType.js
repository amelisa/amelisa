class BooleanType {
  constructor (value) {
    if (typeof value !== 'boolean') value = false
    this.value = value
  }

  get () {
    return this.value
  }

  invert () {
    this.value = !this.value
  }
}

export default BooleanType
