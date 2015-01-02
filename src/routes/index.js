var router = require('express').Router();
var Visitor = require('../visitor');
//var React = require('react');
var State = require('../state');

router.get('/', function(_, res) {
  var markup = '';

  res.render('index', {
    markup: markup
  });
});

router.post('/search', function(req, res) {
  var visitor = new Visitor;
  var url = req.param('url');
  var token = req.param('token');
  var socket = token ? State.getSocket(token) : void 0;

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

    visitor.on('errored', function(o){
      socket.emit('errored', o);
    });
    visitor.on('data', function(data){
      socket.emit('data', data);
    });
    visitor.on('notFound', function(data){
      socket.emit('notFound', data);
    });
    visitor.on('state', function(state){
      socket.emit('state', state);
    });

    res.status(200).end();
  }
  else res.status(400).end('Invalid request');
});

router.post('/stopSearch', function(req, res) {
  var token = req.param('token');

  console.log('Got request to stop search');
  // stop current search if there is one going on
  // well this wont really "stop" the search but it will
  // prevent any more network requests from going out
  // for whatever search was running
  if (State.getVisitor(token)) {
    State.getVisitor(token).emit('stop');
    State.getVisitor(token).removeAllListeners();
    State.removeVisitor(token);
  }
});
module.exports = router;
