var router = require('express').Router();
var Visitor = require('../visitor');
//var React = require('react');
var uuid = require('node-uuid').v4;
var util = require('../util');

router.get('/', function(_, res) {
  var markup = '';

  res.render('index', {
    markup: markup
  });
});

router.get('/token', function(_, res){
  res.send(uuid());
});

router.post('/search', function(req, res) {
  var visitor = new Visitor;
  var url = req.query.url;
  var token = req.query.token;
  var socket = token ? util.getSocket(token) : void 0;

  if (url && token && socket) {
    visitor.visitRecursively(url);

    visitor.on('error', function(o){
      socket.emit('error', o);
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

module.exports = router;
