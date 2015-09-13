import debug from 'debug';
debug.enable(process.env.DEBUG);
import util from './util';
import initModel from './initModel';
import createContainer from './createContainer';
import HtmlLayout from './HtmlLayout';
import RootComponent from './RootComponent';

let api = {
  createContainer: createContainer,
  model: initModel,
  HtmlLayout: HtmlLayout,
  RootComponent: RootComponent
};

if (util.isServer) {
  api.MemoryStorage = util.serverRequire(module, './MemoryStorage');
  api.MongoStorage = util.serverRequire(module, './MongoStorage');
  api.RedisChannel = util.serverRequire(module, './RedisChannel');
  api.ServerSocketChannel = util.serverRequire(module, './ServerSocketChannel');
  api.Store = util.serverRequire(module, './Store');
}

export default api;
