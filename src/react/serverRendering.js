import React from 'react'
import ReactDOMServer from 'react-dom/server'

function isContainer (Container) {
  return Container && Container.isContainer
}

function overrideCreateElement (replacement, callback) {
  let originalCreateElement = React.createElement

  React.createElement = (...args) => {
    return replacement.apply(null, [originalCreateElement].concat(args))
  }

  callback()

  React.createElement = originalCreateElement
}

async function render (method, Component, baseProps = {}, baseChildren = [], promises = []) {
  baseProps = {...baseProps}
  let nextPromises = []
  let index = 0
  let html

  let datas = await Promise.all(promises)

  let onFetch = (promise) => {
    nextPromises.push(promise)
  }

  function replacement (originalCreateElement, ...args) {
    let [type, props] = args
    if (!props) props = args[1] = {}
    // console.log('type', type.name || type, isContainer(type), datas.length)

    if (isContainer(type)) {
      if (datas.length) {
        let data = datas.shift()
        Object.assign(props, data, {hasResults: true})
        let promise = promises[index]
        nextPromises.push(promise)
      } else {
        props.onFetch = onFetch
      }
      index++
    }

    return originalCreateElement.apply(null, args)
  }

  function callback () {
    html = ReactDOMServer[method](<Component {...baseProps}>{baseChildren}</Component>)
  }

  overrideCreateElement(replacement, callback)

  if (promises.length < nextPromises.length) {
    return render(method, Component, baseProps, baseChildren, nextPromises.slice())
  }
  return html
}

async function renderToString (...args) {
  return render.apply(null, ['renderToString'].concat(args))
}

async function renderToStaticMarkup (...args) {
  return render.apply(null, ['renderToStaticMarkup'].concat(args))
}

export default {
  renderToString,
  renderToStaticMarkup
}
