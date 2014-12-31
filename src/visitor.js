var EE      = require('events').EventEmitter;
var url     = require('url');
var request = require('request');
var cheerio = require('cheerio');
var util    = require('util');
var http    = require('http');

util.inherits(Visitor, EE);

function Visitor() {}

Visitor.prototype.visitRecursively = function(inputUrl, state) {
  var self = this;
  var temp;

  // emit error if inputUrl is falsy and return
  if (!inputUrl) {
    this.emit('error', {
      error: new Error('Empty input url'),
      type: 'InputError',
      input: inputUrl
    });
    return;
  }

  // if state is falsy, set it to empty object
  state = state || {};

  temp = url.parse(inputUrl);

  // if there's no host then emit error and return
  if (!temp.host || !temp.protocol) {
    this.emit('error', {
      error: new Error('Malformed input url. It has no host or protocol'),
      type: 'InputError',
      input: inputUrl
    });
    return;
  }

  // store the initial url that visitor was called with
  // links found on this page are checked if they
  state.origin = state.origin || temp.host;
  state.protocol = state.protocol || temp.protocol;

  // trim the last '/' from inputUrl cuz no keys in state have trailing '/'
  inputUrl = '/' === inputUrl[inputUrl.length - 1] ? inputUrl.slice(0, -1) : inputUrl;

  // if inputUrl has been visited then return
  if (state[inputUrl]) {
    console.log('Already visited %s', inputUrl);
    return;
  }

  // mark inputUrl as visited
  state[inputUrl] = true;

  request(inputUrl, function(err, res, body) {
    var $;
    var $schema;
    var data;

    // if error, emit error and return
    if (err) {
      self.emit('error', {
        error: err,
        type: 'RequestError',
        input: inputUrl
      });
      return;
    }

    // if status is anything other than a 200, emit httpError and return
    if (res.statusCode !== 200) {
      self.emit('error', {
        error: new Error(http.STATUS_CODES[res.statusCode]),
        code: res.statusCode,
        type: 'RequestError',
        input: inputUrl
      });
      return;
    }

    //all good, move on

    // load the body into cheerio
    $ = cheerio.load(body);

    // check if any schemas present
    $schema = $('[itemtype*="schema.org"]');

    if (!$schema.length) {
      self.emit('notFound', {
        message: 'No schema found.',
        url: inputUrl
      });
    }
    else {
      data = [];

      // go over each found schema
      $schema.each(function(i, v) {
        var obj = {};

        // go over each child of current schema
        $(v).children().each(function(j, w) {
          // its of the form { <itemprop>: <value> }
          // example { name: "JW Heating & Air", streetAddress: "1135 Venice Blvd." }
          obj[$(w).attr('itemprop') || j] = $(w).text();
        });
        // build data that will be emitted after all of this
        data.push(obj);
      });

      self.emit('data', {
        data: data,
        url: inputUrl
      });
    }

    // get the links on this page and call Visitor.prototype.visitRecursively on em, recursively :3
    $('a').each(function(i, v) {
      try {
        var temp = url.parse($(v).attr('href'));
        var nextInputUrl = '';

        if (state.origin === temp.host || (temp.href && '/' === temp.href[0]) || (!temp.host && temp.href && !temp.hash)) {
          nextInputUrl = 'http' === temp.protocol || 'https' === temp.protocol ? temp.protocol : state.protocol;
          nextInputUrl += '//';
          nextInputUrl += temp.host || state.origin;
          nextInputUrl += '/' === temp.pathname[0] ? temp.pathname : '/' + temp.pathname;
          nextInputUrl = '/' === nextInputUrl[nextInputUrl.length - 1] ? nextInputUrl.slice(0, -1) : nextInputUrl;

          if (nextInputUrl && !state[nextInputUrl]) {
            self.emit('state', state);
            self.visitRecursively(nextInputUrl, state);
          }
        }
      }
      catch (e) {
        console.log(e.message);
        console.log('Faulty input was: %s', $(v).attr('href'));
        console.log(e.stack);
      }
    });

  });
};

module.exports = Visitor;

// var x = new Visitor;

// x.visitRecursively('http://synup.com/', {});

// x.on('error', function errorHandler(e) {
//   console.log('Error: %s', e.type);
//   console.log(e.error);
//   console.log(e.input);
// });

// x.on('data', function dataHandler(d) {
//   console.log('Data for %s', d.url);
//   d.data.forEach(function(v) {
//     console.log(v);
//   });
// });

// x.on('notFound', console.log.bind(console));
