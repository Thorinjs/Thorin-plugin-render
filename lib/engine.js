'use strict';
const path = require('path'),
  initUtilities = require('./utilities'),
  engineHtml = require('./engineHtml');
/**
 * Created by Adrian on 09-Apr-16.
 */
module.exports = function(thorin, engine, opt) {
  const logger = thorin.logger(opt.logger),
    env = thorin.env,
    rootPath = (path.isAbsolute(opt.path) ? opt.path : path.normalize(thorin.root + '/' + opt.path)),
    plugin = {};

  let instance = engine.instance,
    hasEngine = (engine.instance ? true : false),
    globalLocals = {
      environment: thorin.env,
      config: thorin.config,
      thorin: {
        app: thorin.app,
        version: thorin.version,
        id: thorin.id
      }
    },
    renderFn;
  /* Attach various helpers that will expose functionality in the view. */
  initUtilities(thorin, opt, globalLocals);

  let renderHtml = engineHtml(thorin, opt);

  /* Configure the render engine now. */
  (() => {
    if(!instance) return;
    switch(engine.type) {
      case "nunjucks":
        let envOpt = {
          trimBlocks: true,
          lstripBlocks: true
        };
        if(env !== 'production') {
          envOpt.noCache = true;
        }
        let tmpEnv = instance.configure(envOpt);
        renderFn = tmpEnv.render.bind(tmpEnv);
        break;
      case "callback":
        renderFn = instance;
        break;
    }
  })();

  /*
  * Renders the given template path, with the given data in the arguments.
  * */
  plugin.render = function DoRender(templateName, locals, onDone) {
    let templatePath = (path.isAbsolute(templateName) ? templateName : path.normalize(rootPath + '/' + templateName));
    // IF we have a simple HTML file, we just render it.
    let templateExt = path.extname(templatePath);
    if(templateExt === '.html' || templateExt === '.htm' || templateExt === '.txt') {
      return renderHtml(templatePath, (e, html) => {
        if(e) {
          return onDone(thorin.error('RENER.ERROR', 'Failed to render page', e, 500));
        }
        onDone(null, html);
      });
    }
    if(!hasEngine || !renderFn) {
      return onDone(thorin.error('RENDER.NOT_READY', 'Render engine is not ready.'));
    }
    try {
      let localData;
      if(locals instanceof thorin.Intent) {
        localData = thorin.util.extend(globalLocals, {
          intent: locals
        });
      } else {
        localData = thorin.util.extend(globalLocals, (typeof locals === 'object' && locals ? locals : {}));
      }
      renderFn(templatePath, localData, (e, html) => {
        if(e) {
          return onDone(thorin.error('RENER.ERROR', 'Failed to render page', e, 500));
        }
        onDone(null, html);
      });
    } catch(e) {
      return onDone(thorin.error('RENDER.ERROR', 'Failed to render page', e, 500));
    }
  };

  /*
  * Extends the global locals by adding stuff that is available in all renders.
  * */
  plugin.addLocal = function AddLocal(k, v) {
    if(typeof k === 'object' && v) {
      globalLocals = thorin.util.extend(globalLocals, v);
      return this;
    }
    if(typeof k === 'string' && typeof v !== 'undefined') {
      globalLocals[k] = v;
    }
    return this;
  };
  /*
  * Returns the render instance. This is useful if you want to add custom filters or
  * other custom implementations.
  * */
  plugin.instance = function getInstance() {
    return instance;
  };

  return plugin;
};