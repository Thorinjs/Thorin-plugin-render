'use strict';
const path = require('path');
/**
 * Created by Adrian on 09-Apr-16.
 */
module.exports = function(thorin, opt) {
  const logger = thorin.logger(opt.logger),
    env = thorin.env,
    rootPath = (path.isAbsolute(opt.path) ? opt.path : path.normalize(thorin.root + '/' + opt.path));
  const plugin = {};

  /*
  * Renders the given template path, with the given data in the arguments.
  * */
  plugin.render = function DoRender(templateName, locals, onDone) {
    let templatePath = (path.isAbsolute(templateName) ? templateName : path.normalize(rootPath) + '/' + templateName);
    return onDone(null, "TODO");
  };


  return plugin;
};