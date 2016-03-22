import BrowserContext from './BrowserContext'
import ServerContext from './ServerContext'

const defaultPort = 5005

function getBrowserContext (port = defaultPort) {
  let browserContext = new BrowserContext(port)
  return browserContext.init()
}

function getServerContext (port = defaultPort) {
  let serverContext = new ServerContext(port)
  return serverContext.init()
}

export default {
  getBrowserContext,
  getServerContext
}
