var url         = require('url');
var util        = require('util');
var http        = require('http');
var request     = require('request');
var cheerio     = require('cheerio');
var EE          = require('events').EventEmitter;
var dStop       = require('debug')('schema-check:visitor:stopSearch');
var dReq        = require('debug')('schema-check:visitor:makeRequest');
var dVisitRecur = require('debug')('schema-check:visitor:visitorRecursively');
var dReqVerbose = require('debug')('schema-check:visitor:makeRequest:verbose');


util.inherits(Visitor, EE);

function Visitor() {
  var self = this;

  this.on('stop', function _stopSearchHandler() {
    dStop('_stopSearchHandler: Stopping any more network requests');
    self._stopped = true;
  });
}

Visitor.prototype.visitRecursively = function visitRecursively(inputUrl, state) {
  var self = this;
  var parsedInputUrl;

  dVisitRecur('starting with (raw) input url %s', inputUrl);
  // dVisitRecur('state is %s', state);

  // emit error if inputUrl is falsy and return
  if (!inputUrl) {
    dVisitRecur('emitting error of type InputError');
    this.emit('errored', {
      error: new Error('Empty input url'),
      type: 'InputError',
      input: inputUrl
    });
    return;
  }

  // if state is falsy, set it to empty object
  state = state || {};

  parsedInputUrl = url.parse(inputUrl);

  // if there's no host then emit error and return
  if (!parsedInputUrl.host || !parsedInputUrl.protocol) {
    dVisitRecur('emitting error of type InputError');
    this.emit('errored', {
      error: new Error('Malformed input url. It has no host or protocol'),
      type: 'InputError',
      input: inputUrl
    });
    return;
  }

  // store the initial url that visitor was called with
  // links found on this page are checked if they
  state.origin        = state.origin || parsedInputUrl.host.replace('www.', '');
  state.originWithWWW = state.originWithWWW || 'www.' + state.origin;
  state.protocol      = state.protocol || parsedInputUrl.protocol;

  // trim the last '/' from inputUrl cuz no keys in state have trailing '/'
  inputUrl = '/' === inputUrl[inputUrl.length - 1] ? inputUrl.slice(0, -1) : inputUrl;

  // trim whitespace
  inputUrl = inputUrl.trim();

  // todo: I should probably strip 'www.' from input url to prevent network call for both, say,
  // http://www.x.com and http://x.com
  // but then again, some people might have setup weird redirects for www. and non www.
  // if i decided to enable this, the fix is below
  inputUrl = inputUrl.replace(/^(https?:\/\/)www\./g, '$1');

  dVisitRecur('processed input url is %s', inputUrl);

  // if inputUrl has been visited then return
  if (state[inputUrl]) {
    console.log('Already visited %s', inputUrl);
    return;
  }

  dVisitRecur('has the search been stopped? %s', !!this._stopped);
  // if search has been stopped then just return blindly and dont hit the network
  if (this._stopped) return;

  // mark inputUrl as visited
  state[inputUrl] = true;

  // dVisitRecur('updated state is %o', state);

  // BIG BOI MAKING REQUEST OMG OMG THIS IS THE CALL THAT MAKES IT ALL HAPPEN
  // (including stackoverflow, sigh -.-)
  dVisitRecur('making request for url');
  makeRequest(self, inputUrl, parsedInputUrl, state);

  dVisitRecur('done with url %s. returning..\n', inputUrl);
};

function makeRequest(self, inputUrl, parsedInputUrl, state) {
  request(inputUrl, function _requestHandler(err, res, body) {
    var $;
    var data;
    var $schema;
    // var urlsWithoutHttpAndHttpsRegex = /^(-\.)?([^\s/?\.#-]+\.?)+(\/[^\s]*)?$/i;

    // dReq('res %o', res);
    // dReq('body %s', body);

    dReqVerbose('parsed input url is %o', parsedInputUrl);

    // if error, emit error and return
    if (err) {
      dReq('emitting error of type RequestError %o', err);
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
      dReq('response status code is %s', res.statusCode);
      dReq('emitting error of type HttpError %o', err);
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

    // no schemas? Emit notFound
    if (!$schema.length) {
      dReq('emitting notFound');
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
        var obj        = {};
        var $itemprops = $(v).find('[itemprop]');
        var itemtype   = $(v).attr('itemtype') || 'unknownItemtype' + i;

        data[itemtype] = data[itemtype] || {};

        // go over each child of current schema
        $itemprops.each(function $itempropsEachLoopCB(j, w) {
          // its of the form { <itemprop>: <value> }
          // example { name: "JW Heating & Air", streetAddress: "1135 Venice Blvd." }
          obj[$(w).attr('itemprop') || 'itemprop' + j] = $(w).text() || $(w).attr('src') || $(w).val();
        });
        // build data that will be emitted after all of this
        data[itemtype] = obj;
      });

      // emit data
      // if there were no itemprops for an itemtype then data[itemtype]
      // will be [] i.e., empty array
      dReq('emitting data %o', {
        data: data,
        url: inputUrl
      });
      self.emit('data', {
        data: data,
        url: inputUrl
      });
    }

    // get the links on this page and call Visitor.prototype.visitRecursively on em, recursively :3
    $('a').each(function $aEachCB(i, v) {
      try {
        var temp         = url.parse($(v).attr('href'));
        var nextInputUrl = '';

        if (state.origin === temp.host || state.originWithWWW === temp.host || (!temp.host && temp.href)) {

          dReqVerbose('untouched temp.pathname is %s', temp.pathname);

          if (temp.pathname && ('/' !== temp.pathname[0] && '.' !== temp.pathname[0])) temp.pathname = '/' + temp.pathname;

          dReqVerbose('resolving %s and %s', parsedInputUrl.pathname, temp.pathname);

          // resolve relative href (like ../contact or ./resume) against the current pathname we are at i.e., parsedInputUrl.pathname
          temp.pathname = url.resolve(parsedInputUrl.pathname, temp.pathname);

          dReqVerbose('resolved pathname is %s', temp.pathname);

          nextInputUrl = 'http' === temp.protocol || 'https' === temp.protocol ? temp.protocol : state.protocol;
          nextInputUrl += '//';
          nextInputUrl += temp.host || state.origin;
          nextInputUrl += '/' === temp.pathname[0] ? temp.pathname : '/' + temp.pathname;
          nextInputUrl = '/' === nextInputUrl[nextInputUrl.length - 1] ? nextInputUrl.slice(0, -1) : nextInputUrl;
          nextInputUrl = nextInputUrl.replace(/^(https?:\/\/)www\./g, '$1');

          if (nextInputUrl && !state[nextInputUrl]) {
            self.emit('state', state);
            self.visitRecursively(nextInputUrl, state);
            dReqVerbose('done calling visitRecursively with next input url %s', nextInputUrl);
          }
        }
      }
      catch (e) {
        dReq('error during parsing $(\'a\') hrefs %o', err);
        dReqVerbose('Faulty input was %s', $(v).attr('href'));
      }
    });
  });
}

module.exports = Visitor;

// var x = new Visitor;

// x.visitRecursively('http://muditameta.com', {});

// x.on('errored', function errorHandler(e) {
//   console.log('Error: %s', e.type);
//   console.log(e.error);
//   console.log(e.input);
// });

// x.on('data', function dataHandler(d) {
//   console.log('Data for %s', d.url);
//   console.log(d.data);
// });

// x.on('notFound', console.log.bind(console));
