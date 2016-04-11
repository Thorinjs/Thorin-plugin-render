'use strict';
/**
 * Created by Adrian on 09-Apr-16.
 *
 * This will extend the default thorin.Action
 */
module.exports = function(thorin, opt) {
  const logger = thorin.logger(opt.logger),
    isInjected = Symbol(),
    Action = thorin.Action;

  Action.HANDLER_TYPE.RENDER = "render";

  class ThorinRenderAction extends Action {

    /**
     * This will be available for all actions, it will register a render
     * callback to the run stack.
     * Note: if you register multiple render('templateName'), we will work only with the first one that
     * matches the intent result/error combo.
     * Ex:
     *  thorin.dispatcher.addAction('myAction')
     *    .alias('GET', '/')
     *    .before('render', (intentObj) => {
     *      console.log("Rendering intent")
     *    })
     *    .render('home.html')
     *    .after('render', (intentObj, html) => {
     *      console.log("Rendered")
     *    });
     *
     *    Render calls are:
     *    .render("templateName") -> this will render the given template when the intent finalizes.
     *    .render("templateName", 400) -> this will render the given template only when the intent has a 400 error.
     *    .render("templateName", "error")  -> this will render the given template only when the intent is not a successful result.
     *    .render("templateName", "success")
     *    .render(fn, 400)  -> same as fn() but for errors.
     *    .render(fn) -> this will call fn(intentObj) and the function MUST return a templateName to render.
     *                -> If it will not return a template string, we skip the rendering.
     * */
    render(a, when) {
      if(!this[isInjected]) {
        this[isInjected] = true;
        this.stack.splice(0, 0, {
          type: thorin.Action.HANDLER_TYPE.RENDER
        });
      }
      if(typeof this.renderTemplates === 'undefined') {
        this.renderTemplates = {
          error: [],
          success: null,
          all: null
        };
      }
      let item = {};
      if(typeof a === 'string' && a != '') {
        item.name = a;
      } else if(typeof a === 'function') {
        item.fn = a;
      }
      if(typeof when === 'number') {  // we have a error code.
        item.status = when;
        this.renderTemplates.error.splice(0, 0, item);  // in front.
        return this;
      }
      if(when === 'error') {
        this.renderTemplates.error.push(item);
        return this;
      }
      if(when === "success") {
        if(this.renderTemplates.success) {
          logger.warn('Action ' + this.name + ' already has a success template defined and cannot add ' + item.name);
          return this;
        }
        this.renderTemplates.success = item;
        return this;
      }
      if(typeof when === "undefined") {
        if(this.renderTemplates.all) {
          logger.warn('Action ' + this.name + ' already has a global template defined and cannot add ' + item.name);
          return this;
        }
        this.renderTemplates.all = item;
      }
      return this;
    }

    /*
     * Runs our custom render middleware.
     * */
    _runCustomType(intentObj, handler, done) {
      if(handler.type !== Action.HANDLER_TYPE.RENDER) {
        return super._runCustomType.apply(this, arguments);
      }
      intentObj._setTemplateSource(getTemplateSource.bind(this));
      if(this.events.before.render || this.events.after.render) {
        intentObj._setTemplateSuccess(this._runHandler.bind(this, 'after', 'render', intentObj));
      }
      done();
    }

  }

  /*
   * This function is called in the intent send() function, and it will return the template
   * that we want to use.
   * An intent that already has raw result attached to it will ignore the templating system.
   *
   * */
  function getTemplateSource(intentObj) {
    if(intentObj.hasRawResult()) return;
    let isError = intentObj.hasError(),
      templateName;
    // FIRST, we check for error templates.
    if(isError) {
      let errorObj = intentObj.error(),
        statusCode = errorObj.statusCode;
      for(let i=0; i < this.renderTemplates.error.length; i++) {
        let item = this.renderTemplates.error[i];
        // check for status frist,
        if(item.status === statusCode) {
          templateName = getTemplateFromItem(item, intentObj);
          break;
        }
        // get the default one.
        if(!item.status) {
          templateName = getTemplateFromItem(item, intentObj);
          break;
        }
      }
      if(!templateName) {
        templateName = getTemplateFromItem(this.renderTemplates.all, intentObj); //return the all or none.
      }
      if(templateName) {
        // IF we have a template, we have to run the before handler.
        this._runHandler('before', 'render', intentObj, templateName);
      }
      return templateName
    }
    // IF we have a success, return the first one from success.
    if(this.renderTemplates.success) {
      let sTemplate = getTemplateFromItem(this.renderTemplates.success, intentObj);
      if(!sTemplate) {
        sTemplate = getTemplateFromItem(this.renderTemplates.all, intentObj);
      }
      if(sTemplate) {
        this._runHandler('before', 'render', intentObj, sTemplate);
      }
      return sTemplate;
    }
    // Fallback, return the all one, if any.
    let aTemplate = getTemplateFromItem(this.renderTemplates.all, intentObj);
    if(aTemplate) {
      this._runHandler('before', 'render', intentObj, aTemplate);
    }
    return aTemplate;
  }

  function getTemplateFromItem(item, intentObj) {
    if(typeof item !== 'object' || !item) return undefined;
    if(item.fn) {
      try {
        let templateName = item.fn(intentObj);
        if(typeof templateName !== 'string') {
          return;
        }
        return templateName;
      } catch(e) {
        logger.error(`Captured an error in .render(fn)`, e);
        return;
      }
    }
    return item.name;
  }

  thorin.Action = ThorinRenderAction;

};