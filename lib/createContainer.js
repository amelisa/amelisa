//import React from 'react';
import model from './initModel';
import util from './util';

if (!util.isServer) window.model = model;

export default function(Component, React) {

  class Container extends React.Component {

    constructor(props) {
      super();
      this.state = {};
    }

    componentWillMount() {
      let queries = this.getQueries(this.props);
      if (!util.isServer) this.setSubscription(queries);
      this.prevQueries = queries;
    }

    componentWillUnmount() {
      this.subscription.unsubscribe();
    }

    componentWillReceiveProps(nextProps) {
      let queries = this.getQueries(nextProps);
      if (!util.fastEqual(queries, this.prevQueries)) {
        this.setQueries(queries);
      }
    }

    setSubscription(queries) {
      this.subscription = model.subscribe(queries);

      this.subscription.on('change', () => {
        if (this.state.hasResults) {
          this.forceUpdate();
        } else {
          this.setState({
            hasResults: true
          });
        }
      });
    }

    getQueries(props) {
      // TODO: probably it could be better
      let component = new Component(props, this.context);
      return component.getQueries();
    }

    getChildContext() {
      return {
        model: model
      };
    }

    setQueries(nextQueries) {
      this.subscription.changeQueries(nextQueries);
      this.prevQueries = nextQueries;
    }

    render() {
      //console.log('render', this.state.hasResults);
      if (!this.state.hasResults) {
        return <div>Empty</div>;
      } else {
        let dataProps = this.subscription.get();
        //console.log('dataProps', dataProps);
        let utilProps = {
          setQueries: this.setQueries.bind(this)
        };
        return React.createElement(Component, React.__spread({}, dataProps, this.props || {}, utilProps));
      }
    }
  }

  Container.childContextTypes = {
    model: React.PropTypes.object
  }

  Container.contextTypes = {
    session: React.PropTypes.object
  }

  return Container;
}
