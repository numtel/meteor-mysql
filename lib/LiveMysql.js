// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/LiveMysql.js
var Future = Npm.require('fibers/future');

LiveMysql = Npm.require('mysql-live-select');

// Convert the LiveMysqlSelect object into a cursor
LiveMysql.LiveMysqlSelect.prototype._publishCursor = function(sub) {
  var self = this;
  var fut = new Future;
  var initLength;

  sub.onStop(function(){
    self.stop();
  });

  // Send reset message (for code pushes)
  sub._session.send({
    msg: 'added',
    collection: sub._name,
    id: sub._subscriptionId,
    fields: { reset: true }
  });

  // Send aggregation of differences
  self.on('update', function(diff, rows){
    sub._session.send({
      msg: 'added',
      collection: sub._name,
      id: sub._subscriptionId,
      fields: { diff: diff }
    });

    if(sub._ready === false && !fut.isResolved()){
      fut['return']();
    }
  });

  // Do not crash application on publication error
  self.on('error', function(error){
    if(!fut.isResolved()){
      fut['throw'](error);
    }
  });

  return fut.wait()
}
