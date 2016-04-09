'use strict';
const fs = require('fs');
/**
 * Created by Adrian on 09-Apr-16.
 */

module.exports = function (thorin, opt) {
  let templateCache = {},
    shouldCache = (thorin.env === 'production');
  if(thorin.env === 'production') {
    shouldCache = true;
  }
  return function renderHtml(filePath, onDone) {
    if(shouldCache && templateCache[filePath]) {
      return onDone(null, templateCache[filePath]);
    }
    fs.readFile(filePath, { encoding: 'utf8' }, (err, html) => {
      if(err) return onDone(err);
      if(shouldCache) {
        templateCache[filePath] = html;
      }
      onDone(null, html);
    });
  };
};