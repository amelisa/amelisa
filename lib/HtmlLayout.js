import React from 'react';

class HtmlLayout extends React.Component {

  render() {
    let { head, children, model } = this.props;
    let json = model.getBundleJson();

    return (
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          {head}
        </head>
        <body>
          <div id='app'>
            {children}
          </div>
          <script src='/js/bundle.js' />
          <script type='application/json' id='bundle' dangerouslySetInnerHTML={{__html: json}}></script>
        </body>
      </html>
    )
  }
}

export default HtmlLayout;
