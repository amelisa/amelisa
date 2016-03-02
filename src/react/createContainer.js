import React, { PropTypes } from 'react'
import Loading from './Loading'
import { isServer, fastEqual } from '../util'

function createContainer (Component) {
  class Container extends React.Component {

    static contextTypes = {
      model: PropTypes.object
    };

    static isContainer = true;

    static displayName = `${Component.name} Container`;

    constructor (props) {
      super()
      let { hasResults } = props
      this.state = {
        hasResults
      }
      this.props = props
      this.mounted = false
      // console.log('constructor', Component.name, props)
    }

    componentWillMount () {
      let subscribeQueries = this.getQueries(this.props)
      this.setSubscription(subscribeQueries)
      this.subscribeQueries = subscribeQueries
    }

    componentDidMount () {
      this.mounted = true
    }

    componentWillUnmount () {
      this.mounted = false
      if (this.subscription) this.subscription.unsubscribe()
    }

    componentWillReceiveProps (nextProps) {
      let subscribeQueries = this.getQueries(nextProps)
      if (!fastEqual(subscribeQueries, this.subscribeQueries)) {
        this.setQueries(subscribeQueries)
      }
    }

    getQueries (props) {
      let { context } = this
      let component = new Component(props, context)
      return component.getQueries.call({props, context})
    }

    setQueries (nextSubscribeQueries) {
      let rawSubscribes = this.getRawSubscribes(nextSubscribeQueries)
      this.subscription.changeSubscribes(rawSubscribes)
      this.subscribeQueries = nextSubscribeQueries
    }

    getRawSubscribes (subscribeQueries) {
      this.dataKeys = []
      let rawSubscribes = []

      for (let dataKey in subscribeQueries) {
        this.dataKeys.push(dataKey)
        rawSubscribes.push(subscribeQueries[dataKey])
      }

      return rawSubscribes
    }

    setSubscription (subscribeQueries) {
      let rawSubscribes = this.getRawSubscribes(subscribeQueries)

      if (isServer && this.props.onFetch && !this.state.hasResults) { // eslint-disable-line
        let promise = new Promise((resolve, reject) => {
          this.context.model
            .subscribe(rawSubscribes)
            .then((subscription) => {
              this.subscription = subscription

              let data = this.getPropsFromSubscription(subscription)
              resolve(data)
            })
        })

        this.props.onFetch(promise) // eslint-disable-line
      } else {
        this.context.model
          .subscribe(rawSubscribes)
          .then((subscription) => {
            this.subscription = subscription

            if (!isServer) {
              subscription.on('change', () => {
                this.refresh()
              })
            }

            this.refresh()
          })
      }
    }

    refresh () {
      if (!this.mounted) return

      if (this.state.hasResults) {
        this.forceUpdate()
      } else {
        this.setState({
          hasResults: true
        })
      }
    }

    getSubscriptionPromise () {
      let subscribeQueries = this.getQueries(this.props)
      let rawSubscribes = this.getRawSubscribes(subscribeQueries)

      return new Promise((resolve, reject) => {
        this.context.model
          .subscribe(rawSubscribes)
          .then((subscription) => {
            let props = this.getPropsFromSubscription(subscription)
            resolve(props)
          })
          .catch(reject)
      })
    }

    getPropsFromSubscription (subscription) {
      let subscribes = subscription.subscribes

      let dataProps = {}
      for (let i = 0; i < subscribes.length; i++) {
        let subscribe = subscribes[i]
        let dataKey = this.dataKeys[i]
        let options = this.subscribeQueries[dataKey][2]
        let data = subscribe.get(options)

        dataProps[dataKey] = deepClone(data)
      }

      let utilProps = {
        setQueries: this.setQueries.bind(this)
      }
      return Object.assign({}, dataProps, this.props || {}, utilProps)
    }

    render () {
      if (!this.state.hasResults) {
        // return <div>Loading...</div>
        return <Loading />
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

function deepClone (object) {
  return JSON.parse(JSON.stringify(object))
}

export default createContainer
