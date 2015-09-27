import React from 'react';
import util from './util';

class HtmlLayout extends React.Component {

  render() {
    let { head, children } = this.props;
    let { model } = this.context;
    let state = model.get();
    let data = {};
    for (let collectionName in state) {
      if (util.isLocalCollection(collectionName) && collectionName !== '_model') {
        data[collectionName] = state[collectionName];
      }
    }
    let json = JSON.stringify(data);
    json = json && json.replace(/<\//g, '<\\/');

    return (
      <html>
        <head>
          {head}
        </head>
        <body>
          {children}
          <script src='http://localhost:3001/js/bundle.js' />
          <script type='application/json' dangerouslySetInnerHTML={{__html: json}}></script>
        </body>
      </html>
    )
  }
}

HtmlLayout.contextTypes = {
  model: React.PropTypes.object
};

export default HtmlLayout;
