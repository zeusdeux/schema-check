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
  log: {
    enable: {
      warn: true,
      error: true,
      info: true,
      verbose: true
    },
    style: {
      error: 'color: #F41111',
      info: 'color: #119E4A',
      normalText: 'color: #000',
      warn: 'color: #F4C611',
      verbose: 'color: #A911F4'
    },
    warn: function() {
      var msg = '';
      var style = utils.log.style;
      var args = [].slice.call(arguments, 0);

      if (!utils.log.enable.warn) return;
      if ('string' === typeof args[0]) msg = args.shift();
      if (args.length) {
        msg = msg + '\n';
        console.warn('%cwarn: %c%s%s', style.warn, style.normalText, msg, utils.stringifyArray(args, ', '));
      }
      else {
        console.warn('%cwarn: %c%s', style.warn, style.normalText, msg);
      }
    },
    error: function() {
      var msg = '';
      var style = utils.log.style;
      var args = [].slice.call(arguments, 0);

      if (!utils.log.enable.error) return;
      if ('string' === typeof args[0]) msg = args.shift();
      if (args.length) {
        msg = msg + '\n';
        console.error('%cerror: %c%s%s', style.error, style.normalText, msg, utils.stringifyArray(args, ', '));
        console.log.apply(console, args);
      }
      else {
        console.error('%cerror: %c%s', style.error, style.normalText, msg);
      }
    },
    info: function() {
      var msg = '';
      var style = utils.log.style;
      var args = [].slice.call(arguments, 0);

      if (!utils.log.enable.info) return;
      if ('string' === typeof args[0]) msg = args.shift();
      if (args.length) {
        msg = msg + '\n';
        console.log('%cinfo: %c%s%s', style.info, style.normalText, msg, utils.stringifyArray(args, ', '));
        console.log.apply(console, args);
      }
      else {
        console.log('%cinfo: %c%s', style.info, style.normalText, msg);
      }
    },
    verbose: function() {
      var msg = '';
      var style = utils.log.style;
      var args = [].slice.call(arguments, 0);

      if ('string' === typeof args[0]) msg = args.shift();
      if (!utils.log.enable.verbose) return;
      if (args.length) {
        msg = msg + '\n';
        console.log('%cverbose: %c%s%s', style.verbose, style.normalText, msg, utils.stringifyArray(args, ', '));
        console.log.apply(console, args);
      }
      else {
        console.log('%cverbose: %c%s', style.verbose, style.normalText, msg);
      }
    }
  }
};

module.exports = utils;
