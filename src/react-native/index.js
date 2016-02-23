import debug from 'debug'
debug.enable(process.env.DEBUG)
import getModel from './getModel'
import createContainer from './createContainer'
import RootComponent from './RootComponent'

export default {
  createContainer,
  getModel,
  RootComponent
}
