var router = require('express').Router();
var Visitor = require('../visitor');
//var React = require('react');
var State = require('../state');
var d = require('debug')('routes:index');


router.get('/', function _getRootPathCB(_, res) {
  var markup = '';

  d('get:/ rendering index');
  res.render('index', {
    markup: markup,
    env: process.env.NODE_ENV
  });
});

router.get('/search', function _getSearchPathCB(req, res) {
  var visitor = new Visitor;
  var url = req.param('url');
  var token = req.param('token');
  var socket = token ? State.getSocket(token) : void 0;

  d('get:/search request url %s ', url);
  d('get:/search request token %s ', token);
  d('get:/search socket id %s', socket.id);

  // if there's already a visitor for this token (which means there might be a search happening)
  // and there's a new search request then stop the previous search
  if (State.getVisitor(token)) {
    State.getVisitor(token).emit('stop');
    State.getVisitor(token).removeAllListeners();
    State.removeVisitor(token);
  }

  if (url && token && socket) {
    // set new visitor for token
    State.setVisitor(token, visitor);

    // start magic
    visitor.visitRecursively(url);

    d('get:/search setting up listeners on the new visitor for current request');
    visitor.on('errored', function(o) {
      socket.emit('errored', o);
    });
    visitor.on('data', function(data) {
      socket.emit('data', data);
    });
    visitor.on('notFound', function(data) {
      socket.emit('notFound', data);
    });
    visitor.on('state', function(state) {
      socket.emit('state', state);
    });

    res.status(200).end();
  }
  else res.status(400).end('Invalid request');
});

router.post('/stopSearch', function _postStopSearchCB(req, res) {
  var token = req.param('token');

  d('post:/stopSearch got request to stop search');
  d('post:/stopSearch token', token);

  // stop current search if there is one going on
  // well this wont really "stop" the search but it will
  // prevent any more network requests from going out
  // for whatever search was running
  if (State.getVisitor(token)) {
    State.getVisitor(token).emit('stop');
    State.getVisitor(token).removeAllListeners();
    State.removeVisitor(token);
  }

  res.status(200).end();
});

module.exports = router;
