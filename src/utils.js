var utils = {
  clone: function clone(arg) {
    //is it an object?
    if (typeof arg === 'object' && arg !== null) {
      //if object and RegExp clone RegExp
      if ('[object RegExp]' === Object.prototype.toString.call(arg) || arg instanceof RegExp) {
        return new RegExp(
          arg.source, (arg.global ? 'g' : '') +
          (arg.ignoreCase ? 'i' : '') +
          (arg.multiline ? 'm' : '') +
          (arg.sticky ? 'y' : '')
        );
      }
      //if object and Date, clone Date
      if ('[object Date]' === Object.prototype.toString.call(arg) || arg instanceof Date) {
        return new Date(Date.parse(arg));
      }
      //else treat it like an iterable {} style object or Array
      return Object.keys(arg).reduce(function(p, c) {
        if (typeof arg[c] === 'object' && arg[c] !== null) {
          p[c] = clone(arg[c]);
        }
        else {
          p[c] = arg[c];
        }
        return p;
      }, Array.isArray(arg) ? [] : {});
    }
    else return arg;
  },
  isObject: function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  },
  stringifyArray: function sa(xs, joinWithChar, init) {
    var x;
    xs = xs.slice(0);
    if ('string' !== typeof init) init = '';
    if (!xs.length) return init.trim().slice(0, -1);
    x = xs.shift();
    if (Array.isArray(x)) {
      return sa(x.concat(xs), joinWithChar, init);
    }
    else if (utils.isObject(x)) {
      return sa(xs, joinWithChar, init + utils.stringifyObject(x, joinWithChar) + joinWithChar);
    }
    else {
      try {
        return sa(xs, joinWithChar, init + x.toString() + joinWithChar);
      }
      catch (e) {
        return sa(xs, joinWithChar, init + x + joinWithChar);
      }
    }
  },
  stringifyObject: function so(xs, joinWithChar) {
    var temp = '';
    if (!utils.isObject(xs)) return xs.toString();
    Object.keys(xs).forEach(function(v) {
      if (utils.isObject(xs[v])) {
        temp += v + ': ' + so(xs[v], joinWithChar) + joinWithChar;
      }
      else if (Array.isArray(xs[v])) {
        temp += v + ': ' + utils.stringifyArray(xs[v], joinWithChar, '') + joinWithChar;
      }
      else {
        temp = temp + v + ': ' + xs[v] + joinWithChar;
      }
    });
    return '(' + temp.trim().slice(0, -1) + ')';
  },
  supportedMimeTypes: [
    /text\/html/,
    /text\/xml/,
    /text\/plain/,
    /text\/css/,
    /application\/xml/,
    /application\/json/,
    /application\/javascript/
  ],
  isSupportedMimeType: function(mimeType) {
    return !!utils.supportedMimeTypes.filter(function(v) {
      return v.test(mimeType);
    }).length;
  }
};

module.exports = utils;
