import debug from 'debug';
debug.enable(process.env.DEBUG);
import util from './util';
import initModel from './initModel';
import createContainer from './createContainer';

let api = {
  createContainer: createContainer,
  model: initModel
};

if (util.isServer) {
  api.MemoryStorage = util.serverRequire(module, './MemoryStorage');
  api.MongoStorage = util.serverRequire(module, './MongoStorage');
  api.ServerSocketChannel = util.serverRequire(module, './ServerSocketChannel');
  api.Store = util.serverRequire(module, './Store');
}

export default api;
