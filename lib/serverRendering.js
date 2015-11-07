import React from 'react';
import ReactDOMServer from 'react-dom/server';

function isContainer(Container) {
  return Container && Container.isContainer;
}

function overrideCreateElement(replacement, callback) {
  let originalCreateElement = React.createElement;

  React.createElement = (...args) => {
    return replacement.apply(null, [originalCreateElement].concat(args));
  }

  callback();

  React.createElement = originalCreateElement;
}

function render(method, Component, baseProps = {}, baseChildren, promises = []) {
  baseProps = Object.assign({}, baseProps);
  baseChildren = Object.assign({}, baseChildren);
  let nextPromises = [];
  let index = 0;
  let html;

  return Promise
    .all(promises)
    .then((datas) => {
      function replacement(originalCreateElement, type, props, children) {
        props = props || {};

        if (isContainer(type)) {
          if (datas.length) {
            let data = datas.shift();
            Object.assign(props, data, {hasResults: true});
            let promise = promises[index];
            nextPromises.push(promise);
          } else {
            props.onFetch = (promise) => {
              nextPromises.push(promise);
            }
          }
          index++;
        }

        return originalCreateElement(type, props, children);
      }

      function callback() {
        html = ReactDOMServer[method](<Component {...baseProps}>{baseChildren}</Component>);
      }

      overrideCreateElement(replacement, callback);

      if (promises.length < nextPromises.length) {
        return render(method, Component, baseProps, baseChildren, nextPromises.slice());
      }

      return html;
    });
}

function renderToString(...args) {
  return render.apply(null, ['renderToString'].concat(args));
}

function renderToStaticMarkup(...args) {
  return render.apply(null, ['renderToStaticMarkup'].concat(args));
}

export default {
  renderToString,
  renderToStaticMarkup
};
