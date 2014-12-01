// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/syncSelect.js;

var pollInterval = 1000;
var selectBuffer = [];
var connBuffer = [];
var resultsBuffer = {};

// Update automatically when specified trigger tables update
// @param {object} subscription - Context of Meteor.publish function
// @param {object} options
// @param {string|function} options.query - conn.queryEx() style
// @param {array} options.triggers - See lib/initTriggers.js
// @param {integer} options.pollInterval - Set new global poll interval (ms)
syncSelect = function(subscription, options){
  var conn = this;
  pollInterval = options.pollInterval || pollInterval;
  insertConnIntoBuffer(conn);
  // Build runtime meta data
  var selectMeta = {
    conn: conn,
    subscription: subscription,
    query: conn._escapeQueryFun(options.query),
    lastUpdate: 0,
    data: [],
    updateKeys: []
  };
  _.each(options.triggers, function(trigger){
    var updateKey = triggerHash(trigger);
    if(selectMeta.updateKeys.indexOf(updateKey) === -1){
      selectMeta.updateKeys.push(updateKey);
    }
  });
  selectBuffer.push(selectMeta);
  // Perform first update
  updateSubscription.apply(selectMeta);
  subscription.ready();
};

var insertConnIntoBuffer = function(conn){
  var existing = _.filter(connBuffer, function(entry){
    return entry.conn === conn;
  }).length > 0;
  if(!existing){
    connBuffer.push({
      conn: conn,
      latestUpdate: 0
    });
  }
};

var pollUpdateTable = function(connMeta){
  var updates = connMeta.conn.queryEx(function(esc, escId){
    return 'select `key`, `update` from ' +
              escId(connMeta.conn._updateTable) +
            ' where `update` > ' +
              esc(connMeta.latestUpdate)
  });
  var updateKeys = [];
  updates && _.each(updates, function(row){
    row.update = parseInt(row.update, 10);
    if(row.update > connMeta.latestUpdate){
      connMeta.latestUpdate = row.update;
    };
    updateKeys.push(row.key);
  });
  return updateKeys;
};

var managePoll = function(){
  _.each(connBuffer, function(connMeta){
    var updatedKeys = pollUpdateTable(connMeta);
    _.each(selectBuffer, function(selectMeta){
      if(selectMeta.conn === connMeta.conn){
        _.each(selectMeta.updateKeys, function(updateKey){
          if(updatedKeys.indexOf(updateKey) !== -1){
            updateSubscription.call(selectMeta);
          }
        });
      }
    });
  });
  Meteor.setTimeout(managePoll, pollInterval);
};
managePoll();

var updateSubscription = function(){
  // TODO is it possible to do this with fewer change events?
  var self = this;
  var rows;
  var now = new Date().getTime(); // IE8 compat
  var resultBuffer;

  if(!(self.query in resultsBuffer)){
    resultsBuffer[self.query] = resultBuffer = { lastUpdate: 0 };
  }else{
    resultBuffer = resultsBuffer[self.query];
  }

  if(resultBuffer.lastUpdate <= self.lastUpdate){
    rows = self.conn.queryEx(self.query);
    resultBuffer.rows = rows;
    resultBuffer.lastUpdate = now;
  }else{
    rows = resultBuffer.rows;
  }

  self.lastUpdate = now;

  _.each(rows, function(row, index){
    if(self.data.length - 1 < index){
      self.subscription.added(self.subscription._name, 'i' + index, row);
      self.data[index] = row;
    }else if(JSON.stringify(self.data[index]) !== JSON.stringify(row)){
      self.subscription.changed(self.subscription._name, 'i' + index, row);
      self.data[index] = row;
    }
  });
  if(self.data.length > rows.length){
    for(var i = self.data.length - 1; i >= rows.length; i--){
      self.subscription.removed(self.subscription._name, 'i' + i);
    }
    self.data.splice(rows.length, self.data.length - rows.length);
  }
};

