import React, { PropTypes } from 'react-native'
import Loading from './Loading'
import { deepClone, fastEqual } from '../util'

function createContainer (Component) {
  if (!Component.prototype.subscribe) {
    throw new Error(`${Component.name} should has 'subscribe' method for 'createContainer'`)
  }

  class Container extends React.Component {

    static contextTypes = {
      model: PropTypes.object
    };

    static propTypes = {
      hasResults: PropTypes.bool,
      onFetch: PropTypes.func
    };

    static isContainer = true;

    static displayName = `${Component.name} Container`;

    constructor (props) {
      super()
      let { hasResults } = props
      this.state = {
        hasResults
      }
      this.mounted = false
    }

    componentWillMount () {
      let subscribeData = this.getSubscribeData(this.props)
      this.setSubscription(subscribeData)
      this.subscribeData = subscribeData
    }

    componentDidMount () {
      this.mounted = true
    }

    componentWillUnmount () {
      this.mounted = false
      if (!this.subscription) return

      this.subscription.unsubscribe()
    }

    componentWillReceiveProps (nextProps) {
      let subscribeData = this.getSubscribeData(nextProps)
      if (!fastEqual(subscribeData, this.subscribeData)) {
        this.setSubscribeData(subscribeData)
      }
    }

    getSubscribeData (props) {
      let { context } = this
      let component = new Component(props, context)
      return component.subscribe.call({props, context})
    }

    setSubscribeData (nextSubscribeQueries) {
      this.setDataKeysAndRawSubscribes(nextSubscribeQueries)
      this.subscription.changeSubscribes(this.rawSubscribes)
      this.subscribeData = nextSubscribeQueries
    }

    setDataKeysAndRawSubscribes (subscribeData) {
      this.dataKeys = []
      this.rawSubscribes = []

      for (let dataKey in subscribeData) {
        this.dataKeys.push(dataKey)
        this.rawSubscribes.push(subscribeData[dataKey])
      }
    }

    setSubscription (subscribeData) {
      let { model } = this.context

      this.setDataKeysAndRawSubscribes(subscribeData)

      return model
        .subscribe(this.rawSubscribes)
        .then((subscription) => {
          this.subscription = subscription

          subscription.on('change', () => {
            this.refresh()
          })

          this.refresh()
        })
    }

    refresh () {
      if (!this.mounted) return
      let { hasResults } = this.state

      if (hasResults) {
        this.forceUpdate()
      } else {
        this.setState({
          hasResults: true
        })
      }
    }

    getPropsFromSubscription (subscription) {
      let subscribes = subscription.subscribes

      let dataProps = {}
      for (let i = 0; i < subscribes.length; i++) {
        let subscribe = subscribes[i]
        let dataKey = this.dataKeys[i]
        let options = this.subscribeData[dataKey][2]
        let data = subscribe.get(options)

        dataProps[dataKey] = deepClone(data)
      }

      let utilProps = {
        setSubscribeData: this.setSubscribeData.bind(this)
      }
      return Object.assign({}, dataProps, this.props || {}, utilProps)
    }

    render () {
      let { hasResults } = this.state

      if (!hasResults) return <Loading />

      let props = this.props
      if (this.subscription) {
        props = this.getPropsFromSubscription(this.subscription)
      }

      return <Component {...props} />
    }
  }

  return Container
}

export default createContainer
