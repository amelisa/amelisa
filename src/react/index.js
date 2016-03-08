import debug from 'debug'
debug.enable(process.env.DEBUG)
import getModel from './getModel'
import createContainer from './createContainer'
import Input from './Input'
import RootComponent from './RootComponent'

export default {
  createContainer,
  getModel,
  Input,
  RootComponent
}
