import fs from 'fs';
import express from 'express';
import expressWs from 'express-ws';

export default function(store, httpServer, mongoUrl) {

  let app = express();
  expressWs(app, httpServer);
  app.use(store.modelMiddleware());

  app.use((req, res, next) => {
    if (req.url !== '/') return next();

    res.end('<html><head></head><body></body></html>');
  });

  app.use((req, res, next) => {
    let index = req.url.indexOf('/js/');
    if (index === -1) return next();

    let name = req.url.slice(index + 4, req.url.length - 3);
    fs.readFile('./test/integration/tmp/' + name + '.js', (err, data) => {
      if (err) throw err;

      res.end(data);
    });
  });

  return app;
}
