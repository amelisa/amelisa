// import React from 'react';
import util from './util';

function createContainer(Component, React) {
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

    getSubscribes(queries) {
      this.dataNames = [];
      let subscribes = [];

      for (let dataName in queries) {
        this.dataNames.push(dataName);
        subscribes.push(queries[dataName]);
      }

      return subscribes;
    }

    setSubscription(queries) {
      let subscribes = this.getSubscribes(queries);

      this.context.model
        .subscribe(subscribes)
        .then((subscription) => {
          this.subscription = subscription;

          subscription.on('change', () => {
            this.refresh();
          });

          this.refresh();
        });
    }

    refresh() {
      if (this.state.hasResults) {
        this.forceUpdate();
      } else {
        this.setState({
          hasResults: true
        });
      }
    }

    getQueries(props) {
      // TODO: probably it could be better
      let component = new Component(props, this.context);
      return component.getQueries();
    }

    setQueries(nextQueries) {
      let subscribes = this.getSubscribes(nextQueries);
      this.subscription.changeSubscribes(subscribes);
      this.prevQueries = nextQueries;
    }

    render() {
      if (!this.state.hasResults) {
        return <div>Empty</div>;
      } else {
        let data = this.subscription.get();
        let dataProps = {};
        for (let i = 0; i < data.length; i++) {
          let dataName = this.dataNames[i];
          dataProps[dataName] = data[i];
        }

        let utilProps = {
          setQueries: this.setQueries.bind(this)
        };
        return React.createElement(Component, React.__spread({}, dataProps, this.props || {}, utilProps));
      }
    }
  }

  Container.contextTypes = {
    model: React.PropTypes.object
  }

  return Container;
}

export default createContainer;
