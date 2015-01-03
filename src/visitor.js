var url = require('url');
var util = require('util');
var http = require('http');
var request = require('request');
var cheerio = require('cheerio');
var EE = require('events').EventEmitter;
var d = require('debug')('visitor');

util.inherits(Visitor, EE);

function Visitor() {
  var self = this;

  this.on('stop', function _stopSearchHandler() {
    d('_stopSearchHandler: Stopping any more network requests');
    self._stopped = true;
  });
}

Visitor.prototype.visitRecursively = function visitRecursively(inputUrl, state) {
  var self = this;
  var temp;

  d('visitRecursively: raw input url is %s', inputUrl);
  d('visitRecursively: state is %s', state);

  // emit error if inputUrl is falsy and return
  d('visitRecursively: emitting error of type InputError');
  if (!inputUrl) {
    this.emit('errored', {
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
    d('visitRecursively: emitting error of type InputError');
    this.emit('errored', {
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

  d('visitRecursively: processed input url is %s', inputUrl);

  // if inputUrl has been visited then return
  if (state[inputUrl]) {
    console.log('Already visited %s', inputUrl);
    return;
  }

  d('visitRecursively: has the search been stopped? %s', !!this._stopped);
  // if search has been stopped then just return blindly and dont hit the network
  if (this._stopped) return;

  // mark inputUrl as visited
  state[inputUrl] = true;

  d('visitRecursively: updated state is %o', state);

  request(inputUrl, function _requestHandler(err, res, body) {
    var $;
    var $schema;
    var data;

    // d('visitRecursively:request: res %o', res);
    // d('visitRecursively:request: body %s', body);

    // if error, emit error and return
    if (err) {
      d('visitRecursively:request: emitting error of type RequestError %o', err);
      self.emit('errored', {
        error: err,
        message: err.message,
        type: 'RequestError',
        code: 500,
        input: inputUrl
      });
      return;
    }

    // if status is anything other than a 200, emit httpError and return
    if (res.statusCode !== 200) {
      err = new Error(http.STATUS_CODES[res.statusCode]);
      d('visitRecursively:request: response status code is %s', res.statusCode);
      d('visitRecursively:request: emitting error of type HttpError %o', err);
      self.emit('errored', {
        error: err,
        message: err.message,
        type: 'HttpError',
        input: inputUrl,
        code: res.statusCode
      });
      return;
    }

    //all good, move on

    // load the body into cheerio
    $ = cheerio.load(body);

    // check if any schemas present
    $schema = $('[itemtype*="schema.org"]');

    if (!$schema.length) {
      d('visitRecursively:request: emitting notFound');
      self.emit('notFound', {
        message: 'No schema found.',
        url: inputUrl
      });
    }
    else {
      /*
        structure
        {
          <itemtype>: {.. <itemprop>: <value> ..}
        }
      */
      data = {};

      // go over each found schema
      $schema.each(function $schemaEachLoopCB(i, v) {
        var obj = {};
        var $itemprops = $(v).find('[itemprop]');
        var itemtype = $(v).attr('itemtype') || 'unknownItemtype' + i;

        data[itemtype] = data[itemtype] || {};

        // go over each child of current schema
        $itemprops.each(function $itempropsEachLoopCB(j, w) {
          // its of the form { <itemprop>: <value> }
          // example { name: "JW Heating & Air", streetAddress: "1135 Venice Blvd." }
          obj[$(w).attr('itemprop') || 'itemprop' + j] = $(w).text();
        });
        // build data that will be emitted after all of this
        data[itemtype] = obj;
      });

      d('visitRecursively:request: emitting data %o', {data: data, url: inputUrl});
      // emit data
      // if there were no itemprops for an itemtype then data[itemtype]
      // will be [] i.e., empty array
      self.emit('data', {
        data: data,
        url: inputUrl
      });
    }

    // get the links on this page and call Visitor.prototype.visitRecursively on em, recursively :3
    $('a').each(function $aEachCB(i, v) {
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
        d('visitRecursively:request: error during parsing $(\'a\') hrefs %o', err);
        d('visitRecursively:request: Faulty input was %s', $(v).attr('href'));
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
