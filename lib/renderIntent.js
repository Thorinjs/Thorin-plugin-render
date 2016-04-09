'use strict';
/**
 * Created by Adrian on 09-Apr-16.
 */
module.exports = function(thorin, renderObj, opt) {

  const Intent = thorin.Intent,
    logger = thorin.logger(opt.logger),
    templateSource = Symbol(),
    templateSuccess = Symbol();

  class ThorinIntent extends Intent {

    /*
    * Sets the template source, based on the result of the intent.
    * */
    _setTemplateSource(fn) {
      this[templateSource] = fn;
    }

    /*
    * Sets the callback that will call the "after" render handlers.
    * */
    _setTemplateSuccess(fn) {
      this[templateSuccess] = fn;
    }

    /*
    * Override the default send() function to handle rendering.
    * */
    send() {
      if(typeof this[templateSource] === 'undefined') { // we have no template source.
        return super.send.apply(this, arguments);
      }
      let templatePath = this[templateSource](this);
      delete this[templateSource];
      if(!templatePath) {
        return super.send.apply(this, arguments);
      }
      let _args = arguments;
      renderObj.render(templatePath, this, (err, html) => {
        if(err) {
          logger.warn(`Failed to render template ${templatePath} for intent from action ${this.action}`, err);
          this.error(err);
        } else {
          this.rawResult(html);
        }
        if(this[templateSuccess]) {
          this[templateSuccess](templatePath, err || html);
          delete this[templateSuccess];
        }
        super.send.apply(this, _args);
      });
    }

  }
  thorin.Intent = ThorinIntent;
};