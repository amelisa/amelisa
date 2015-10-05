import React from 'react';
import util from './util';

class HtmlLayout extends React.Component {

  render() {
    let { head, children, bundle } = this.props;
    let { model } = this.context;
    let json = model.getBundleJson();

    return (
      <html>
        <head>
          {head}
        </head>
        <body>
          {children}
          <script src='http://localhost:3001/js/bundle.js' />
          <script type='application/json' id='bundle' dangerouslySetInnerHTML={{__html: json}}></script>
        </body>
      </html>
    )
  }
}

HtmlLayout.contextTypes = {
  model: React.PropTypes.object
};

export default HtmlLayout;
