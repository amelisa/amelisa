import React from 'react';

class RootComponent extends React.Component {

  getChildContext() {
    return {
      model: this.props.model
    };
  }
}

RootComponent.childContextTypes = {
  model: React.PropTypes.object
}

export default RootComponent;
