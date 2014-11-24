// numtel:mysql
// MIT License, ben@latenightsketches.com

var POLL_INTERVAL = 1000;
var selectBuffer = [];
var connBuffer = [];

// Update automatically when specified trigger tables update
syncSelect = function(subscription, options){
  var conn = this;
  insertConnIntoBuffer(conn);
  // Arguments for updateSubscription()
  var updateArgs = [options.query];
  // Build runtime meta data
  var selectMeta = {
    conn: conn,
    subscription: subscription,
    data: [],
    updateKeys: {}
  };
  options.triggers.forEach(function(trigger){
    var updateKey = triggerHash(trigger);
    if(!selectMeta.updateKeys[updateKey]){
      selectMeta.updateKeys[updateKey] = updateArgs;
    }
  });
  selectBuffer.push(selectMeta);
  // Perform first update
  updateSubscription.apply(selectMeta, updateArgs);
};

var insertConnIntoBuffer = function(conn){
  var existing = connBuffer.filter(function(entry){
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
    return 'select `key`, `last_update` from ' +
              escId(connMeta.conn._updateTable) +
            ' where `last_update` > ' +
              esc(connMeta.latestUpdate)
  });
  var updateKeys = [];
  var latestInt = 0;
  updates && updates.forEach(function(row){
    var rowTimestamp = new Date(row.last_update).getTime();
    if(rowTimestamp > latestInt){
      connMeta.latestUpdate = row.last_update;
      latestInt = rowTimestamp;
    };
    updateKeys.push(row.key);
  });
  return updateKeys;
};

var managePoll = function(){
  connBuffer.forEach(function(connMeta){
    var updatedKeys = pollUpdateTable(connMeta);
    selectBuffer.forEach(function(selectMeta){
      if(selectMeta.conn === connMeta.conn){
        _.each(selectMeta.updateKeys, function(updateArgs, updateKey){
          updateSubscription.apply(selectMeta, updateArgs);
        });
      }
    });
  });
  Meteor.setTimeout(managePoll, POLL_INTERVAL);
};
managePoll();

var updateSubscription = function(query){
  // TODO is it possible to do this with fewer change events?
  var self = this;
  var rows = self.conn.queryEx(query);
  rows.forEach(function(row, index){
    if(self.data.length - 1 < index){
      self.subscription.added(self.subscription._name, 'i' + index, row);
      self.data[index] = row;
    }else if(JSON.stringify(self.data[index]) !== JSON.stringify(row)){
      self.subscription.changed(self.subscription._name, 'i' + index, row);
      self.data[index] = row;
    }
  });
  if(self.data.length > rows.length){
    for(var i = rows.length; i<self.data.length; i++){
      self.subscription.removed(self.subscription._name, 'i' + i);
      self.data.splice(i, 1);
    }
  }
};

