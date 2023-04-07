'use strict';
const path = require('path');
/**
 * Created by Adrian on 08-Apr-16.
 *
 * The thorin render plugin hooks itself into thorin.Actions and adds a .render() hook.
 * The render hook will then use the incoming intent to render HTML, or whatever
 * and send it back to the client.
 *
 * Supported engines:
 *  - html (any .html or .htm or .txt file) with no locals support.
 *  - nunjucks  (https://mozilla.github.io/nunjucks)
 */
const renderActionInit = require('./lib/renderAction'),
  renderIntentInit = require('./lib/renderIntent'),
  renderEngineInit = require('./lib/engine');

const SUPPORTED_ENGINES = ['nunjucks', 'html'];

module.exports = function (thorin, opt, pluginName) {
  opt = thorin.util.extend({
    engine: 'nunjucks',
    logger: pluginName || 'render',
    path: 'app/views' // the default path of the view files, relative to thorin.root
  }, opt);
  const logger = thorin.logger(opt.logger);
  let engineObj = {};
  // IF we have a custom string engine, we will try and require it to use it.
  if (typeof opt.engine === 'string') {
    if (SUPPORTED_ENGINES.indexOf(opt.engine.toLowerCase()) === -1) {
      logger.error('Unsupported render engine: ' + opt.engine);
    } else {
      if (opt.engine === 'html') {
        engineObj = {
          type: 'html'
        };
      } else {
        engineObj = {
          type: opt.engine
        };
        // check if we have it installed.
        try {
          if (!require.main) throw  {
            code: 'MODULE_NOT_FOUND',
            message: engineObj.type
          }
          engineObj.instance = require.main.require(engineObj.type);
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(engineObj.type) !== -1) {
            try {
              engineObj.instance = require(engineObj.type);
            } catch (e) {
              if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(engineObj.type) !== -1) {
                logger.error(`Render engine module ${engineObj.type} not found. Please use: npm i --save ${engineObj.type}`);
              } else {
                throw e;
              }
            }
          } else {
            throw e;
          }
        }
      }
    }
  } else {
    // IF we have a callback in the engine field, we will use it in stead.
    engineObj = {
      type: 'callback',
      instance: opt.engine
    };
  }

  // Step one, create the renderer object.
  const renderObj = renderEngineInit(thorin, engineObj, opt);
  // Step two, extend the thorin.Action
  renderActionInit(thorin, renderObj, opt);
  // Step three, extend the thorin.Intent, but after any other plugins that extend it.
  thorin.on(thorin.EVENT.INIT, () => {
    renderIntentInit(thorin, renderObj, opt);
  });
  renderObj.name = opt.logger;
  renderObj.options = opt;

  /* This will ensure that we have an app/views folder. */
  renderObj.setup = function DoSetup(done) {
    const SETUP_DIRECTORIES = ['app/views'];
    for (let i = 0; i < SETUP_DIRECTORIES.length; i++) {
      try {
        thorin.util.fs.ensureDirSync(path.normalize(thorin.root + '/' + SETUP_DIRECTORIES[i]));
      } catch (e) {
      }
    }
    done();
  }

  return renderObj;
};
module.exports.publicName = 'render';
