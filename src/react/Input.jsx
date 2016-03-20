import React, { Component, PropTypes } from 'react'

class Input extends Component {

  constructor (props, context) {
    super()

    let { collectionName, docId, field } = props
    let value = context.model.get(collectionName, docId, field)

    this.state = {
      value
    }
  }

  static contextTypes = {
    model: PropTypes.object
  };

  static propTypes = {
    collectionName: PropTypes.string,
    docId: PropTypes.string,
    field: PropTypes.string
  };

  componentDidMount () {
    let { collectionName, docId, field } = this.props
    let doc = this.context.model.doc(collectionName, docId)

    doc.on('stringInsert', (eventField, index, howMany) => {
      if (eventField !== field) return
      let value = doc.get(field)
      let input = this.refs['input']
      let { selectionStart, selectionEnd } = input
      if (selectionStart > index + howMany) selectionStart = selectionStart + howMany
      if (selectionEnd > index + howMany) selectionEnd = selectionEnd + howMany

      this.setState({
        value
      })
      input.setSelectionRange(selectionStart, selectionEnd)
    })

    doc.on('stringRemove', (eventField, index, howMany) => {
      if (eventField !== field) return
      let value = doc.get(field)
      let input = this.refs['input']
      let { selectionStart, selectionEnd } = input
      if (selectionStart > index) selectionStart = selectionStart - howMany
      if (selectionEnd > index) selectionEnd = selectionEnd - howMany

      this.setState({
        value
      })
      input.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  onChange = (event) => {
    let { collectionName, docId, field } = this.props
    let { value } = event.nativeEvent.target
    this.context.model.stringDiff([collectionName, docId, field], value)
  }

  render () {
    let { value } = this.state

    return <textarea ref='input' className='input' onChange={this.onChange} value={value} />
  }
}

export default Input
