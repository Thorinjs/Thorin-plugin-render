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
  * Expose the asset() functionality that will generate the given tag
  * and attach an integrity= if specified, for scripts.
  * NOTE: this works with config.cdn set at the root config level.
  * */
  locals.asset = function GetAsset(type, url, opt) {
    let src = '',
      integrityTag = '',
      attributes = '',
      hasIntegrity = false;
    let cdnUrl = thorin.config('cdn'),
      finalUrl;
    if(typeof opt === 'object' && opt) {
      Object.keys(opt).forEach((keyName) => {
        if(keyName === 'integrity') {
          hasIntegrity = opt[keyName];
          return;
        }
        if(keyName === 'version') { // append the thorin version to the qs
          if(url.indexOf('?') === -1) {
            url += '?v=' + opt[keyName];
          } else {
            url += '&v=' + opt[keyName];
          }
          return;
        }
        attributes += ' ' + keyName + '="' + opt[keyName] + '"';
      });
    }
    if(url.indexOf('http') !== 0) {
      if(url.charAt(0) !== '/') url = '/' + url;
      if(cdnUrl) {
        finalUrl = cdnUrl + url;
      } else {
        finalUrl = url;
      }
    } else {
      finalUrl = url;
    }
    if(cdnUrl && hasIntegrity) {  // check file integrity only in cdn.
      let fullPath = path.normalize(thorin.root + '/public/' + url);
      let fileHash = getIntegrityHash(fullPath);
      if(fileHash) {
        integrityTag = ` integrity="${fileHash}"`;
      }
    }
    if(type === 'script') {
      src = `<script type="text/javascript" src="${finalUrl}"${integrityTag}${attributes}></script>`;
    } else if(type === 'link') {
      src = `<link href="${finalUrl}" type="text/css"${attributes}/>`;
    } else {
      src = `<${type} src="${finalUrl}"${attributes}></${type}>`;
    }
    return src;
  }

};