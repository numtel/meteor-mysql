// numtel:mysql
// MIT License, ben@latenightsketches.com

var TRIGGER_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];
var buffer = [];

// @param {array} list - description of triggers
initTriggers = function(list){
  var conn = this;
  var esc = conn.escape.bind(conn);
  var escId = conn.escapeId;
  var bufferEntry;
  var updatedTables = [];

  // Add triggers to buffer if not already existing
  list.forEach(function(def){
    for(var i = 0; i<buffer.length; i++){
      if(buffer[i].conn === conn &&
          buffer[i].table === def.table &&
          buffer[i].condition === def.condition){
        bufferEntry = buffer[i];
        break;
      }
    }
    if(!bufferEntry){
      bufferEntry = _.extend(def, {
        conn: conn
      });
      buffer.push(bufferEntry);
      if(updatedTables.indexOf(def.table) === -1 ){
        updatedTables.push(def.table);
      }
    }
  });

  // Update triggers on changed tables
  removeTriggers(conn, updatedTables);
  // Create new triggers from buffer
  var updateKeys = getUpdateKeys(conn);
  updatedTables.forEach(function(table){
    var triggerDefs = buffer.filter(function(entry){
      return entry.table === table;
    });
    var conditionString = '';
    _.each(triggerDefs, function(def, i){
      if(def.condition && typeof def.condition === 'function'){
        def.condition = def.condition(esc, escId);
      }
      var updateKey = triggerHash(def);
      var updateId = updateKeys[updateKey];
      if(!updateId){
        updateId  = createUpdateKey(conn, updateKey).insertId;
        updateKeys[updateKey] = updateId;
      }
      if(typeof def.condition === 'string'){
        conditionString += [
          'IF ' + def.condition + ' THEN ',
          '  UPDATE ' + escId(conn._updateTable),
          '   SET `last_update`=now() WHERE `id` = ' + esc(updateId) + ';',
          'END IF;',
          ''
        ].join('\n');
      }else{
        conditionString += [
          'UPDATE ' + escId(conn._updateTable),
          ' SET `last_update`=now() WHERE `id` = ' + esc(updateId) + ';',
          ''
        ].join('\n');
      }
    });
    TRIGGER_EVENTS.forEach(function(event){
      createTrigger(conn, table, conditionString, event);
    });
  });
};

triggerName = function(table, event){
  return 'meteor-subscription-' + table + '-' + event.toLowerCase();
};

triggerHash = function(def){
  return murmurhash3_32_gc(def.table + def.condition, 10);
};

createTrigger = function(conn, table, body, event){
  var rowRef = event === 'INSERT' ? 'NEW' : 'OLD';
  return conn.queryEx(function(esc, escId){
    return [
      'CREATE TRIGGER ' + escId(triggerName(table, event)),
      'AFTER ' + event + ' ON ' + escId(table),
      'FOR EACH ROW',
      'BEGIN',
      body.replace(/\$ROW/g, rowRef),
      'END',
    ].join('\n');
  });
};

removeTriggers = function(conn, tables){
  var result = conn.queryEx('show triggers;');
  result.forEach(function(row){
    if(tables.indexOf(row.Table) > -1 && row.Timing === 'AFTER'){
      removeTrigger(conn, row.Trigger);
    };
  });
};

removeTrigger = function(conn, name){
  return conn.queryEx(function(esc, escId){
    return 'drop trigger ' + escId(name) + ';';
  });
};

getUpdateKeys = function(conn){
  var result = conn.queryEx(function(esc, escId){
    return 'select `id`, `key` from ' + escId(conn._updateTable) + ';';
  });
  var out = {};
  result.forEach(function(row){
    out[row.key] = row.id;
  });
  return out;
};

createUpdateKey = function(conn, key){
  return conn.queryEx(function(esc, escId){
    return [
      'INSERT INTO ' + escId(conn._updateTable) + ' (`key`) ',
      'VALUES (' + esc(key) + ')'
    ].join('\n');
  });
};
