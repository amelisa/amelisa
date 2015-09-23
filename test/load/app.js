import express from 'express';
import expressWs from 'express-ws';

export default function (store, httpServer) {
  let app = express();
  expressWs(app, httpServer);
  app.use(store.modelMiddleware());

  return app;
}
