import fs from 'fs';
import express from 'express';
import React from 'react';
// import Router from 'react-router';
// import routes from '../app/routes';
import expressWs from 'express-ws';
import session from 'express-session';
// import auth from 'engine-auth';
import bodyParser from 'body-parser';
let MongoStore = require('connect-mongo')(session);

export default function (store, httpServer, mongoUrl, url) {
  let sessionOptions = {
    secret: 'secret',
    store: new MongoStore({
      url: mongoUrl
    })
  }

  let app = express();
  expressWs(app, httpServer);
  app.use(session(sessionOptions));
  app.use(bodyParser.json());
  app.use(store.modelMiddleware());
  // app.use(auth.middleware(store));
  app.use((req, res, next) => {
    console.log('req', req.url)
    let model = req.getModel();
    let userId = model.get('_session.userId');

    let userDoc = model.doc('users', userId);
    userDoc
      .fetch()
      .then(() => {
        let user = userDoc.get();
        model.set('_session.user', user);
        next();
      })
      .catch(next);
  });

  app.use((req, res, next) => {
    if (req.url !== '/') return next();

    res.end('<html><head><script src="http://' + url + '/js/bundle.js" /></head><body></body></html>');
  });

  app.use((req, res, next) => {
    if (req.url !== '/js/bundle.js') return next();

    fs.readFile('./test/phantom/bundle.js', (err, data) => {
      if (err) throw err;

      res.end(data);
    });
  });

  // app.use((req, res, next) => {
  //   if (req.url === '/favicon.ico' || req.url === '/.websocket') {
  //     return next();
  //   }
  //
  //   let model = req.getModel();
  //
  //   model
  //     .prepareBundle()
  //     .then(() => {
  //       Router.run(routes, req.url, (Handler) => {
  //
  //         let Factory = React.createFactory(Handler);
  //         let html = React.renderToString(Factory({model}));
  //
  //         res.send(html);
  //       });
  //     })
  //     .catch(next);
  // });

  return app;
}
