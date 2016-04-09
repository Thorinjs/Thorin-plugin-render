'use strict';
const path = require('path');
/**
 * Created by Adrian on 08-Apr-16.
 *
 * The thorin render plugin hooks itself into thorin.Actions and adds a .render() hook.
 * The render hook will then use the incoming intent to render HTML, or whatever
 * and send it back to the client.
 */
const renderActionInit = require('./lib/renderAction'),
  renderIntentInit = require('./lib/renderIntent'),
  renderClassInit = require('./lib/renderClass');
module.exports = function(thorin, opt, pluginName) {
  opt = thorin.util.extend({
    logger: pluginName,
    path: 'app/views' // the default path of the view files, relative to thorin.root
  }, opt);
  const logger = thorin.logger(opt.logger);

  // Step one, create the renderer object.
  const renderObj = renderClassInit(thorin, opt);
  // Step two, extend the thorin.Action
  renderActionInit(thorin, renderObj, opt);
  // Step three, extend the thorin.Intent, but after any other plugins that extend it.
  thorin.on(thorin.EVENT.INIT, () => {
    renderIntentInit(thorin, renderObj, opt);
  });



  return renderObj;
};