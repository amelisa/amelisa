import React, { PropTypes } from 'react'

class HtmlLayout extends React.Component {

  static propTypes = {
    head: PropTypes.any,
    children: PropTypes.any,
    model: PropTypes.object
  }

  render () {
    let { head, children, model } = this.props
    let json = model.getBundleJson()

    return (
      <html>
        <head>
          <meta name='viewport' content='width=device-width, initial-scale=1.0' />
          {head}
        </head>
        <body>
          <div id='app'>
            {children}
          </div>
          <script defer src='/js/bundle.js' />
          <script type='application/json' id='bundle' dangerouslySetInnerHTML={{__html: json}}></script>
        </body>
      </html>
    )
  }
}

export default HtmlLayout
