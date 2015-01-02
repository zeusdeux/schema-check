var state = {};


function init(token) {
  state[token] = state[token] || {};
}

exports.getSocket = function(token) {
  init(token);
  return state[token].socket;
};

exports.setSocket = function(token, socket) {
  init(token);
  return state[token].socket = socket;
};

exports.removeSocket = function(token) {
  init(token);
  return delete state[token].socket;
};

exports.getVisitor = function(token) {
  init(token);
  return state[token].visitor;
};

exports.setVisitor = function(token, visitor) {
  init(token);
  return state[token].visitor = visitor;
};

exports.removeVisitor = function(token) {
  init(token);
  return delete state[token].visitor;
};
