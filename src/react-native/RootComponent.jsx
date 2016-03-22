import { Component, PropTypes } from 'react-native'

class RootComponent extends Component {

  static propTypes = {
    model: PropTypes.object
  };

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
