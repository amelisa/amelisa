import React from 'react';

class RootComponent extends React.Component {

  getChildContext() {
    // FIXME: fix hack for passing model through react-router
    return {
      model: this.props.model || this.props.location.model
    };
  }
}

RootComponent.childContextTypes = {
  model: React.PropTypes.object
}

export default RootComponent;
