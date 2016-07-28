'use strict';
const fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
/**
 * Created by Adrian on 18-Apr-16.
 */

module.exports = function(thorin, options, locals) {
  const logger = thorin.logger(options.logger);
  let integrityCache = {};  // a integrity cache. we expire it once an hour.
  setTimeout(() => { integrityCache = {}; }, 60 * 60 * 1000);
  const HASH_TYPE = 'sha256';
  function getIntegrityHash(filePath) {
    let qsIdx = filePath.indexOf('?');
    if(qsIdx !== -1) {
      filePath = filePath.substr(0, qsIdx);
    }
    if(typeof integrityCache[filePath] === 'string') return integrityCache[filePath];
    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    } catch(e) {
      logger.warn(`Failed to read asset ${filePath} for integrity check.`, e);
      return null;
    }
    try {
      const fileHash = crypto.createHash(HASH_TYPE).update(fileContent).digest("base64");
      integrityCache[filePath] = HASH_TYPE + '-' + fileHash;
    } catch(e) {
      logger.warn(`Failed to generate integrity hash for asset ${filePath}`, e);
      return null;
    }
    return integrityCache[filePath];
  }

  /*
  * Returns the full CDN-url of the given asset. If no CDN is specified,
  * returns the root-relative (/asset) URL of the static asset.
  * NOTE: if _version is specified, it will append a ?v={version}
  * NOTE: this works with config.cdn set at the root config level.
  * */
  locals.asset = function GetAssetURL(url, _version) {
    let cdnUrl = thorin.config('cdn') || '';
    if(url.substr(0, 4) === 'http' || url.substr(0,2) === '//') return url;
    if(url.charAt(0) !== '/' && cdnUrl.charAt(0) !== '/') {
      url = '/' + url;
    } else if(url.charAt(0) === '/' && cdnUrl.charAt(0) === '/') {
      url = url.substr(1);
    }
    if(typeof _version !== 'undefined') {
      if(_version === true) _version = thorin.version;
      url += '?v=' + _version;
    }
    if(!cdnUrl) return url;
    return cdnUrl + url;
  };

  /*
  * Builds the integrity="hash" attribute for a <script> tag, based on what
  * we have in the public/ folder.
  * */
  locals.checkIntegrity = function(url) {
    if(thorin.env !== 'production') return '';
    let attr = '',
      cdnUrl = thorin.config('cdn');
    if(!cdnUrl) return attr;
    let fullPath = path.normalize(thorin.root + '/public/' + url);
    let fileHash = getIntegrityHash(fullPath);
    if(fileHash) {
      attr = 'integrity="'+fileHash+'"';
    }
    return attr;
  };

  /* Returns the first alias of a given action code. This is useful when we want to create anchors between actions and not their aliases */
  locals.actionAlias = function(actionCode) {
    if(typeof actionCode !== 'string' || !actionCode) return '';
    let actionObj = thorin.dispatcher.getAction(actionCode);
    if(!actionObj || actionObj.aliases.length === 0) return '';
    return actionObj.aliases[0].name;
  };

  /* Utility function that returns the given string if the current action is the given actionCode
   * Eg: {{ isAction('home.landing','active-menu-item') }} -> returns the class when action = home.landing
    * */
  locals.isAction = function(actionCode, result) {
    let intentObj = this.ctx.intent;
    if(!intentObj) return '';
    if(intentObj.action === actionCode) return result;
    return '';
  }

};