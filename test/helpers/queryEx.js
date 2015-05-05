
var Future = Npm.require('fibers/future');

// Must be bound to node-mysql connection instance
queryEx = function(query){
  var self = this;
  var fut = new Future();
  if(typeof query === 'function'){
    var escId = self.escapeId;
    var esc = self.escape.bind(self);
    query = query(esc, escId);
  }
  self.query(query, Meteor.bindEnvironment(function(error, rows, fields){
    if(error) return fut['throw'](error);
    fut['return'](rows);
  }));
  return fut.wait();
}
