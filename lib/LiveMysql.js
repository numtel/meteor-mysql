// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/LiveMysql.js
var Future = Npm.require('fibers/future');

LiveMysql = Npm.require('mysql-live-select');

import _ from "lodash";


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

// Support for simple:rest

// Result set data does not exist in a Mongo Collection, provide generic name
LiveMysql.LiveMysqlSelect.prototype._cursorDescription = { collectionName: 'data' };

LiveMysql.LiveMysqlSelect.prototype.fetch = function() {
  // HttpSubscription object requires _id field for added() method
  // Use 'id' method from result set if available or row number otherwise
  var dataWithIds = this.queryCache.data.map(function(row, index) {
    var clonedRow = _.clone(row);
    if(!('_id' in clonedRow)) {
      clonedRow._id = String('id' in clonedRow ? clonedRow.id : index + 1);
    }

    // Ensure row index is included since response will not be ordered
    if(!('_index' in clonedRow)) {
      clonedRow._index = index + 1;
    }

    return clonedRow;
  });

  return dataWithIds;
}

module.exports = LiveMysql;
