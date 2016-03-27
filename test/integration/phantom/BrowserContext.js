import driver from 'node-phantom-simple'
import phantomjs from 'phantomjs2'

const options = {
  path: phantomjs.path
}

class BrowserContext {
  constructor (port) {
    this.port = port
  }

  init () {
    return new Promise((resolve, reject) => {
      driver.create(options, (err, browser) => {
        if (err) return reject(err)

        this.browser = browser
        resolve(this)

        setTimeout(() => {
          console.log('browser context close')
          this.close()
        }, 5000)
      })
    })
  }

  createPage () {
    return new Promise((resolve, reject) => {
      this.browser.createPage((err, page) => {
        if (err) return reject(err)

        page.onConsoleMessage = (msg, lineNum, sourceId) => {
          console.log('CONSOLE: ' + msg) // + ' (from line #' + lineNum + ' in "' + sourceId + '")')
        }

        page.onError = (msg, trace) => {
          let msgStack = ['ERROR: ' + msg]

          if (trace && trace.length) {
            msgStack.push('TRACE:')
            trace.forEach((t) => {
              msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''))
            })
          }

          console.error(msgStack.join('\n'))
        }

        page.open('http://localhost:' + this.port, (err, status) => {
          if (err) return reject(err)

          if (status !== 'success') return reject('Unable to open site, status: ' + status)

          resolve(page)
        })
      })
    })
  }

  runScript (page, name) {
    return new Promise((resolve, reject) => {
      page.onCallback = (data) => {
        resolve(data)
      }

      page.includeJs('http://localhost:' + this.port + '/js/' + name + '.js', (err) => {
        if (err) return reject(err)
      })
    })
  }

  evaluate (page, func) {
    return new Promise((resolve, reject) => {
      page.onCallback = (data) => {
        resolve(data)
      }

      page.evaluate(func, (err, data) => {
        if (err) return reject(err)
      })
    })
  }

  evaluateSync (page, func) {
    return new Promise((resolve, reject) => {
      page.evaluate(func, (err, data) => {
        if (err) return reject(err)

        resolve(data)
      })
    })
  }

  close () {
    this.browser.exit()
  }
}

export default BrowserContext
