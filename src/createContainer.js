// import React from 'react'
import util from './util'

function createContainer (Component, React) {
  class Container extends React.Component {

    static contextTypes = {
      model: React.PropTypes.object
    };

    static isContainer = true;

    static displayName = Component.name + ' Container';

    constructor (props) {
      super()
      this.state = {
        hasResults: props.hasResults // eslint-disable-line
      }
      this.props = props
    }

    componentWillMount () {
      let queries = this.getQueries(this.props)
      this.setSubscription(queries)
      this.prevQueries = queries
    }

    componentWillUnmount () {
      this.subscription.unsubscribe()
    }

    componentWillReceiveProps (nextProps) {
      let queries = this.getQueries(nextProps)
      if (!util.fastEqual(queries, this.prevQueries)) {
        this.setQueries(queries)
      }
    }

    getQueries (props) {
      let { context } = this
      let component = new Component(props, context)
      return component.getQueries.call({props, context})
    }

    setQueries (nextQueries) {
      let subscribes = this.getSubscribes(nextQueries)
      this.subscription.changeSubscribes(subscribes)
      this.prevQueries = nextQueries
    }

    getSubscribes (queries) {
      this.dataNames = []
      let subscribes = []

      for (let dataName in queries) {
        this.dataNames.push(dataName)
        subscribes.push(queries[dataName])
      }

      return subscribes
    }

    setSubscription (queries) {
      let subscribes = this.getSubscribes(queries)

      if (util.isServer && this.props.onFetch && !this.state.hasResults) { // eslint-disable-line
        let promise = new Promise((resolve, reject) => {
          this.context.model
            .subscribe(subscribes)
            .then((subscription) => {
              this.subscription = subscription

              let data = this.getPropsFromSubscription(subscription)
              resolve(data)
            })
        })

        this.props.onFetch(promise) // eslint-disable-line
      } else {
        this.context.model
          .subscribe(subscribes)
          .then((subscription) => {
            this.subscription = subscription

            if (!util.isServer) {
              subscription.on('change', () => {
                this.refresh()
              })
            }

            this.refresh()
          })
      }
    }

    refresh () {
      if (this.state.hasResults) {
        this.forceUpdate()
      } else {
        this.setState({
          hasResults: true
        })
      }
    }

    getSubscriptionPromise () {
      let queries = this.getQueries(this.props)
      let subscribes = this.getSubscribes(queries)

      return new Promise((resolve, reject) => {
        this.context.model
          .subscribe(subscribes)
          .then((subscription) => {
            let props = this.getPropsFromSubscription(subscription)
            resolve(props)
          })
          .catch(reject)
      })
    }

    getPropsFromSubscription (subscription) {
      let data = subscription.get()

      let dataProps = {}
      for (let i = 0; i < data.length; i++) {
        let dataName = this.dataNames[i]
        dataProps[dataName] = data[i]
      }
      let utilProps = {
        setQueries: this.setQueries.bind(this)
      }
      return Object.assign({}, dataProps, this.props || {}, utilProps)
    }

    render () {
      if (!this.state.hasResults) {
        return <div>Empty</div>
      } else {
        let props = this.props
        if (this.subscription) {
          props = this.getPropsFromSubscription(this.subscription)
        }

        return <Component {...props} />
      }
    }
  }

  return Container
}

export default createContainer
