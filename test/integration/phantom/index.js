import BrowserContext from './BrowserContext'
import ServerContext from './ServerContext'

const defaultPort = 5005

async function getBrowserContext (port = defaultPort) {
  let browserContext = new BrowserContext(port)
  await browserContext.init()
  return browserContext
}

async function getServerContext (port = defaultPort) {
  let serverContext = new ServerContext(port)
  await serverContext.init()
  return serverContext
}

export default {
  getBrowserContext,
  getServerContext
}
