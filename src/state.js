var state = {};
var d = require('debug')('state');

function init(token) {
  state[token] = state[token] || {};
  d('init: state[token] %o', state[token]);
}

exports.getSocket = function getSocket(token) {
  init(token);
  d('getSocket: getting socket for token %s', token);
  return state[token].socket;
};

exports.setSocket = function setSocket(token, socket) {
  init(token);
  d('setSocket: setting socket for token %s with socket.id %s', token, socket.id);
  return state[token].socket = socket;
};

exports.removeSocket = function removeSocket(token) {
  init(token);
  d('removeSocket: removing socket for token %s', token);
  return delete state[token].socket;
};

exports.getVisitor = function getVisitor(token) {
  init(token);
  d('getVisitor: getting visitor for token %s', token);
  return state[token].visitor;
};

exports.setVisitor = function setVisitor(token, visitor) {
  init(token);
  d('setVisitor: setting visitor for token %s as visitor %o', token, visitor);
  return state[token].visitor = visitor;
};

exports.removeVisitor = function removeVisitor(token) {
  init(token);
  d('removeVisitor: removing visitor for token %s', token);
  return delete state[token].visitor;
};
