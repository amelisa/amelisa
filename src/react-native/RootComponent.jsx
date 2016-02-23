import { Component, PropTypes } from 'react-native'

class RootComponent extends Component {

  static childContextTypes = {
    model: PropTypes.object
  };

  getChildContext () {
    return {
      model: this.props.model
    }
  }
}

export default RootComponent
