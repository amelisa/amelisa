// import React from 'react';
import util from './util';

function createContainer(Component, React) {
  class Container extends React.Component {

    constructor(props) {
      super();
      this.state = {
        hasResults: props.hasResults
      };
      this.props = props;
    }

    componentWillMount() {
      let queries = this.getQueries(this.props);
      this.setSubscription(queries);
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

      if (util.isServer && this.props.onFetch && !this.state.hasResults) {
        let promise = new Promise((resolve, reject) => {
          this.context.model
            .subscribe(subscribes)
            .then((subscription) => {
              this.subscription = subscription;

              let data = this.getPropsFromSubscription(subscription);
              resolve(data);
            });
        });

        this.props.onFetch(promise);
      } else {
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

    getSubscriptionPromise() {
      let queries = this.getQueries(this.props);
      let subscribes = this.getSubscribes(queries);

      return new Promise((resolve, reject) => {
        this.context.model
          .subscribe(subscribes)
          .then((subscription) => {
            let props = this.getPropsFromSubscription(subscription);
            resolve(props);
          })
          .catch(reject);
      });
    }

    getPropsFromSubscription(subscription) {
      let data = subscription.get();

      let dataProps = {};
      for (let i = 0; i < data.length; i++) {
        let dataName = this.dataNames[i];
        dataProps[dataName] = data[i];
      }
      let utilProps = {
        setQueries: this.setQueries.bind(this)
      };
      return Object.assign({}, dataProps, this.props || {}, utilProps)
    }

    render() {
      if (!this.state.hasResults) {
        return <div>Empty</div>;
      } else {
        let props = this.props;
        if (this.subscription) {
          props = this.getPropsFromSubscription(this.subscription);
        }

        return <Component {...props} />;
      }
    }
  }

  Container.contextTypes = {
    model: React.PropTypes.object
  }

  Container.isContainer = true;

  Container.displayName = Component.name + ' Container';

  return Container;
}

export default createContainer;
