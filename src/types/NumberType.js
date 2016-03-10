class NumberType {
  constructor (value) {
    if (typeof value !== 'number') value = 0
    this.value = value
  }

  get () {
    return this.value
  }

  increment (value = 1) {
    this.value = this.value + value
  }
}

export default NumberType
