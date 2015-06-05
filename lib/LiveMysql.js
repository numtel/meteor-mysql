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
  self.on('diff', function(diff){
    sub._session.send({
      msg: 'added',
      collection: sub._name,
      id: sub._subscriptionId,
      fields: { diff: diff }
    });
  });

  // Mark subscription as ready if no data
  self.on('update', function(rows){
    if(sub._ready === false){
      initLength = rows.length;
      if(initLength === 0) {
        // An empty diff event must be sent to the client even though
        // the LiveMysqlSelect object doesn't emit one
        sub._session.send({
          msg: 'added',
          collection: sub._name,
          id: sub._subscriptionId,
          fields: { diff: [] }
        });

        fut['return']();
      }
    }
  });

  // Do not crash application on publication error
  self.on('error', function(error){
    if(!fut.isResolved()){
      fut['throw'](error);
    }
  });

  // Mark subscription as ready if data is loaded
  self.on('added', function(row, index){
    if(sub._ready === false &&
       self.data.length === initLength - 1){
      fut['return']();
    }
  });

  return fut.wait()
}
