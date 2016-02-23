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
  baseProps = Object.assign({}, baseProps)
  let nextPromises = []
  let index = 0
  let html

  let datas = await Promise.all(promises)

  let onFetch = (promise) => {
    nextPromises.push(promise)
  }

  // function processChildren (children) {
  //   console.log('processChildren', children)
  //   if (!Array.isArray(children)) children = React.Children.toArray(children)
  //   children = children.map((child) => {
  //     console.log('child', child.type.name || child.type, isContainer(child.type), datas.length)
  //
  //     let childChildren = child.props.children
  //     if (childChildren) childChildren = processChildren(childChildren)
  //
  //     if (isContainer(child.type)) {
  //       if (datas.length) {
  //         let data = datas.shift()
  //         let promise = promises[index]
  //         nextPromises.push(promise)
  //         return React.cloneElement(child, Object.assign({}, data, {hasResults: true, children: childChildren}))
  //       } else {
  //         return React.cloneElement(child, {onFetch, children: childChildren})
  //       }
  //       index++
  //     } else {
  //       return child
  //     }
  //   })
  //   if (children.length === 1) children = children[0]
  //   console.log(children)
  //   return children
  // }
  //
  // baseChildren = processChildren(baseChildren)

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
