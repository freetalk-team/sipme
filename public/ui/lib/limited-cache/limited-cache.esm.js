var CURRENT_META_VERSION = 2;
var MAXIMUM_CACHE_TIME = 365 * 86400 * 1000;
var defaultOptions = {
  // Public
  maxCacheSize: 100,
  maxCacheTime: 86400 * 1000,
  // Development-only
  warnIfItemPurgedBeforeTime: 5000,
  // Private
  opLimit: 200,
  scanLimit: 50
};

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

// To help minification
var objectCreate = Object.create,
    objectAssign = Object.assign,
    hasOwnProperty = Object.prototype.hasOwnProperty;
var dateNow = Date.now;

/* Initialization and options */

var positiveNumberOrZero = function positiveNumberOrZero(value) {
  return Math.max(value, 0) || 0;
};

var normalizeOptions = function normalizeOptions(cacheMetaOptions) {
  objectAssign(cacheMetaOptions, {
    maxCacheSize: positiveNumberOrZero(cacheMetaOptions.maxCacheSize),
    maxCacheTime: positiveNumberOrZero(cacheMetaOptions.maxCacheTime),
    opLimit: positiveNumberOrZero(cacheMetaOptions.opLimit)
  });

  return cacheMetaOptions;
};

var isCacheMeta = function isCacheMeta(cacheMeta) {
  return !!cacheMeta && !!cacheMeta.limitedCacheMetaVersion;
};

var upgradeCacheMeta = function upgradeCacheMeta(cacheMeta) {
  if (!isCacheMeta(cacheMeta)) {
    throw new Error('Limited-cache metadata is missing: please check your usage');
  }

  if (cacheMeta.limitedCacheMetaVersion !== CURRENT_META_VERSION) {
    // Version is out of date! (Today the only prior version is 1)
    // Version 1: Cache meta cannot be migrated because timestamps and keys are incompatible
    console.warn('Limited-cache metadata is from an incompatible version (1). It must be reset.');
    cacheMeta.limitedCacheMetaVersion = CURRENT_META_VERSION;
    lowLevelReset(cacheMeta);
  }
};

var lowLevelSetOptions = function lowLevelSetOptions(cacheMeta, options) {
  upgradeCacheMeta(cacheMeta);
  return normalizeOptions(objectAssign(cacheMeta.options, options));
};

var lowLevelInit = function lowLevelInit(optionsOrCacheMeta) {
  if (isCacheMeta(optionsOrCacheMeta)) {
    var existingCacheMeta = optionsOrCacheMeta;
    upgradeCacheMeta(existingCacheMeta);
    return existingCacheMeta;
  } // Else: it's options


  var fullOptions = normalizeOptions(_extends({}, defaultOptions, optionsOrCacheMeta)); // The cacheMeta is created once, and persists per instance

  var newCacheMeta = lowLevelReset({
    limitedCacheMetaVersion: CURRENT_META_VERSION,
    options: fullOptions
  });
  return newCacheMeta;
};
/* Internal cache manipulation */


var _getExpireTime = function _getExpireTime(cacheMeta, cacheKey) {
  var maxCacheTime = cacheMeta.options.maxCacheTime,
      keyInfo = cacheMeta.keyInfo[cacheKey];

  if (!keyInfo) {
    // A missing record is always treated as expired
    return 0;
  } // If we have an exact expireTime then honor it. Otherwise it'll depend on the current maxCacheTime.


  var setTime = keyInfo[0],
      expireTime = keyInfo[1];
  return expireTime || setTime + (maxCacheTime || MAXIMUM_CACHE_TIME);
};

var _cacheKeyHasExpired = function _cacheKeyHasExpired(cacheMeta, cacheKey, now) {
  return _getExpireTime(cacheMeta, cacheKey) < now;
};

var lowLevelDoMaintenance = function lowLevelDoMaintenance(cacheMeta) {
  upgradeCacheMeta(cacheMeta);
  var cache = cacheMeta.cache,
      keyList = cacheMeta.keyList,
      keyInfo = cacheMeta.keyInfo;
  var now = dateNow(); // Rebuild cache from keyList only, checking timestamps to auto-remove expired

  var _keyList$reduce = keyList.reduce(function (acc, cacheKey) {
    var accCache = acc[0],
        accKeyList = acc[1],
        accKeyInfo = acc[2];

    if (!_cacheKeyHasExpired(cacheMeta, cacheKey, now)) {
      accCache[cacheKey] = cache[cacheKey];
      accKeyList.push(cacheKey);
      accKeyInfo[cacheKey] = keyInfo[cacheKey];
    }

    return acc;
  }, [{}, [], objectCreate(null)]),
      newCache = _keyList$reduce[0],
      newKeyList = _keyList$reduce[1],
      newKeyInfo = _keyList$reduce[2];

  return objectAssign(cacheMeta, {
    cache: newCache,
    keyList: newKeyList,
    keyInfo: newKeyInfo,
    opsLeft: cacheMeta.options.opLimit
  });
};

var _removeFromIndex = function _removeFromIndex(cacheMeta, startIndex, now) {
  var cache = cacheMeta.cache,
      keyList = cacheMeta.keyList,
      keyInfo = cacheMeta.keyInfo; // Always remove the item requested, and also remove any neighbors who have expired

  var nextIndex = startIndex;
  var nextCacheKey = keyList[startIndex];
  var keyListLength = keyList.length;

  do {
    // Remove the 'next' item
    cache[nextCacheKey] = keyInfo[nextCacheKey] = undefined; // Now advance and decide whether to keep going

    nextIndex++;
    nextCacheKey = keyList[nextIndex];
  } while (nextIndex < keyListLength && _cacheKeyHasExpired(cacheMeta, nextCacheKey, now)); // Remove the index for everything from the startIndex until we stopped


  keyList.splice(startIndex, nextIndex - startIndex);
};

var _removeItemsToMakeRoom = function _removeItemsToMakeRoom(cacheMeta, now) {
  var _cacheMeta$options = cacheMeta.options,
      scanLimit = _cacheMeta$options.scanLimit,
      warnIfItemPurgedBeforeTime = _cacheMeta$options.warnIfItemPurgedBeforeTime,
      cache = cacheMeta.cache,
      keyList = cacheMeta.keyList,
      keyInfo = cacheMeta.keyInfo; // These track the soonest-to-expire thing we've found. It may not actually be "oldest".
  // By default we'll remove the item at the head of the queue, unless we find something better.

  var oldestItemIndex = 0;

  var oldestExpireTime = _getExpireTime(cacheMeta, keyList[0]);

  if (oldestExpireTime > now) {
    // The head of the list hasn't yet expired: scan for a better candidate to remove
    var indexToCheck = 0;
    var maxIndexToCheck = Math.min(keyList.length, scanLimit);

    while (indexToCheck < maxIndexToCheck) {
      var cacheKeyForIndex = keyList[indexToCheck];

      var expireTimeForIndex = _getExpireTime(cacheMeta, cacheKeyForIndex); // We only consider it if it's eligible for expiration: otherwise it can't be a better option
      // than the default head-of-queue


      if (expireTimeForIndex < now) {
        // We found an expired item! This wins automatically
        oldestItemIndex = indexToCheck;
        oldestExpireTime = 0;
        break;
      }

      if (expireTimeForIndex < oldestExpireTime) {
        // We have a new leader
        oldestItemIndex = indexToCheck;
        oldestExpireTime = expireTimeForIndex;
      }

      indexToCheck += 1;
    }
  } // Warn if the 'oldest' item is more recent than we'd like: this means it cycled into and out of
  // cache too quickly for the cache to be useful.

  _removeFromIndex(cacheMeta, oldestItemIndex, now);
};
/* Accessors */


var lowLevelHas = function lowLevelHas(cacheMeta, cacheKey) {
  upgradeCacheMeta(cacheMeta);
  var cache = cacheMeta.cache;

  if (hasOwnProperty.call(cache, cacheKey) && cache[cacheKey] !== undefined) {
    if (!_cacheKeyHasExpired(cacheMeta, cacheKey, dateNow())) {
      return true;
    } // If it's expired, clear the value so that we can short-circuit future lookups


    cache[cacheKey] = undefined;
  }

  return false;
};

var lowLevelGetOne = function lowLevelGetOne(cacheMeta, cacheKey) {
  upgradeCacheMeta(cacheMeta);

  if (lowLevelHas(cacheMeta, cacheKey)) {
    return cacheMeta.cache[cacheKey];
  }

  return;
};

var lowLevelGetAll = function lowLevelGetAll(cacheMeta) {
  upgradeCacheMeta(cacheMeta); // Remove all expired values, and return whatever's left

  lowLevelDoMaintenance(cacheMeta); // Retype because there won't be any `undefined` values after doMaintenance

  return cacheMeta.cache;
};

var lowLevelSet = function lowLevelSet(cacheMeta, cacheKey, item) {
  upgradeCacheMeta(cacheMeta);
  var maxCacheSize = cacheMeta.options.maxCacheSize,
      keyList = cacheMeta.keyList,
      keyInfo = cacheMeta.keyInfo;
  var now = dateNow();
  var isNew = !keyInfo[cacheKey];

  if (cacheMeta.cache[cacheKey] !== item) {
    var _extends2;

    // The cache itself is immutable (but the rest of cacheMeta is not)
    cacheMeta.cache = _extends({}, cacheMeta.cache, (_extends2 = {}, _extends2[cacheKey] = item, _extends2));
  } // We've now set or updated it. Regardless of whether it's new, bump its set time
  // @TODO: expireTime override


  keyInfo[cacheKey] = [now, 0];

  if (isNew) {
    // It's a new key: grow the cache, then shrink it if we can
    keyList.push(cacheKey);
    cacheMeta.opsLeft--;

    if (cacheMeta.opsLeft <= 0) {
      // Time for an oil change
      lowLevelDoMaintenance(cacheMeta);
    }

    if (maxCacheSize && cacheMeta.keyList.length > maxCacheSize) {
      // We're still over the limit: drop at least one item
      _removeItemsToMakeRoom(cacheMeta, now);
    }
  }

  if (_cacheKeyHasExpired(cacheMeta, keyList[0], now)) {
    // While we're here, if we need to expire the head of the queue then drop it
    _removeFromIndex(cacheMeta, 0, now);
  }

  return cacheMeta;
};

var lowLevelRemove = function lowLevelRemove(cacheMeta, cacheKey) {
  upgradeCacheMeta(cacheMeta);
  var cache = cacheMeta.cache,
      keyInfo = cacheMeta.keyInfo;

  if (keyInfo[cacheKey]) {
    if (cache[cacheKey] !== undefined) {
      var _extends3;

      cacheMeta.cache = _extends({}, cache, (_extends3 = {}, _extends3[cacheKey] = undefined, _extends3));
    }

    keyInfo[cacheKey] = undefined;
  }

  return cacheMeta;
};

var lowLevelReset = function lowLevelReset(cacheMeta) {
  upgradeCacheMeta(cacheMeta);
  return objectAssign(cacheMeta, {
    cache: {},
    keyList: [],
    keyInfo: objectCreate(null),
    opsLeft: cacheMeta.options.opLimit
  });
};

// Doing this via a helper function makes the typeChecks easier, and minifies better.

var bindFunctionToCacheMeta = function bindFunctionToCacheMeta( // eslint-disable-next-line @typescript-eslint/no-explicit-any
fn, cacheMeta) {
  return fn.bind(null, cacheMeta);
};

var LimitedCache = function LimitedCache(options) {
  var cacheMeta = lowLevelInit(options);
  return {
    get: bindFunctionToCacheMeta(lowLevelGetOne, cacheMeta),
    getAll: bindFunctionToCacheMeta(lowLevelGetAll, cacheMeta),
    has: bindFunctionToCacheMeta(lowLevelHas, cacheMeta),
    set: function set(cacheKey, item) {
      lowLevelSet(cacheMeta, cacheKey, item);
      return item;
    },
    remove: function remove(cacheKey) {
      lowLevelRemove(cacheMeta, cacheKey);
      return true;
    },
    reset: bindFunctionToCacheMeta(lowLevelReset, cacheMeta),
    getCacheMeta: function getCacheMeta() {
      return cacheMeta;
    },
    getOptions: function getOptions() {
      return cacheMeta.options;
    },
    setOptions: bindFunctionToCacheMeta(lowLevelSetOptions, cacheMeta),
    doMaintenance: bindFunctionToCacheMeta(lowLevelDoMaintenance, cacheMeta)

    , values() { return Object.values(this.getAll()); }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any

var proxyHandler = {
  get: function get(cacheMeta, cacheKey) {
    if (cacheKey === 'hasOwnProperty') {
      return hasOwnProperty;
    }

    return lowLevelGetOne(cacheMeta, cacheKey);
  },
  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(cacheMeta, cacheKey) {
    var hasResult = lowLevelHas(cacheMeta, cacheKey);
    var getResult = lowLevelGetOne(cacheMeta, cacheKey);

    if (hasResult) {
      return {
        configurable: true,
        enumerable: hasResult,
        value: getResult,
        writable: true
      };
    }

    return;
  },
  has: lowLevelHas,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: function set(cacheMeta, cacheKey, item) {
    lowLevelSet(cacheMeta, cacheKey, item);
    return item;
  },
  deleteProperty: function deleteProperty(cacheMeta, cacheKey) {
    lowLevelRemove(cacheMeta, cacheKey);
    return true;
  },
  ownKeys: function ownKeys(cacheMeta) {
    return Object.keys(lowLevelGetAll(cacheMeta));
  }
};
/**
 * So that we can retrieve the cacheMeta for a LimitedCacheObject, without polluting its properties, each proxy
 * is associated back to its internal cacheMeta here.
 */

var cacheMetasForProxies = /*#__PURE__*/new WeakMap();

var LimitedCacheObject = function LimitedCacheObject(options) {
  var cacheMeta = lowLevelInit(options);
  var limitedCacheObject = new Proxy(cacheMeta, proxyHandler);
  cacheMetasForProxies.set(limitedCacheObject, cacheMeta);
  return limitedCacheObject;
};

var getCacheMetaFromObject = function getCacheMetaFromObject(instance) {
  return cacheMetasForProxies.get(instance);
};

var limitedCacheUtil = {
  init: lowLevelInit,
  get: lowLevelGetOne,
  getAll: lowLevelGetAll,
  has: lowLevelHas,
  set: lowLevelSet,
  remove: lowLevelRemove,
  reset: lowLevelReset,
  doMaintenance: lowLevelDoMaintenance,
  setOptions: lowLevelSetOptions
};

export { CURRENT_META_VERSION, LimitedCache, LimitedCacheObject, MAXIMUM_CACHE_TIME, defaultOptions, getCacheMetaFromObject, isCacheMeta, limitedCacheUtil, lowLevelDoMaintenance, lowLevelGetAll, lowLevelGetOne, lowLevelHas, lowLevelInit, lowLevelRemove, lowLevelReset, lowLevelSet, lowLevelSetOptions, upgradeCacheMeta };
//# sourceMappingURL=limited-cache.esm.js.map
