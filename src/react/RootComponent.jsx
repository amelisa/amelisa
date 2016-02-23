import { Component, PropTypes } from 'react'

class RootComponent extends Component {

  static childContextTypes = {
    model: PropTypes.object
  };

  getChildContext () {
    // FIXME: fix hack for passing model through react-router
    return {
      model: this.props.model || this.props.location.model // eslint-disable-line
    }
  }
}

export default RootComponent
