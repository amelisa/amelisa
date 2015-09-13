import React from 'react';

class RootComponent extends React.Component {

  componentDidMount() {
    let { model } = this.props;
    model.channel.on('open', this.forceUpdate.bind(this));
    model.channel.on('close', this.forceUpdate.bind(this));
  }

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
