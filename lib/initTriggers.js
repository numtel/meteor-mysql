// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/initTriggers.js

var TRIGGER_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];
var buffer = [];

// Create triggers and corresponding update records
// NOTE: Any competing triggers will be removed! All 'AFTER' triggers on
//   tables used will be removed. This is a requirement of the implementation.
// Must have called mysql.initTriggerTable() before calling this method in
//   order to have set conn._updateTable
// @context MySQl connection
// @param {array} list - description of triggers
// @param {string} list.$.table - table to trigger update (required)
// @param {string} list.$.condition - SQL fragment of conditional to filter
//                                    rows to trigger update (optional)
initTriggers = function(list){
  var conn = this;
  var esc = conn.escape.bind(conn);
  var escId = conn.escapeId;
  var bufferEntry;
  var updatedTables = [];

  // Add triggers to buffer if not already existing
  list.forEach(function(def){
    if(def.condition && typeof def.condition === 'function'){
      def.condition = def.condition(esc, escId);
    }
    for(var i = 0; i<buffer.length; i++){
      if(buffer[i].conn === conn &&
         buffer[i].table === def.table &&
         buffer[i].condition === def.condition){
        bufferEntry = buffer[i];
        break;
      }
    }
    if(!bufferEntry){
      bufferEntry = _.extend(def, { conn: conn });
      buffer.push(bufferEntry);
      if(updatedTables.indexOf(def.table) === -1 ){
        updatedTables.push(def.table);
      }
    }
  });

  // Create new triggers from buffer
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
      createUpdateKey(conn, updateKey);
      if(typeof def.condition === 'string'){
        conditionString += [
          'IF ' + def.condition + ' THEN ',
          '  UPDATE ' + escId(conn._updateTable),
          '   SET `last_update`=now() WHERE `key` = ' + esc(updateKey) + ';',
          'END IF;',
          ''
        ].join('\n');
      }else{
        conditionString += [
          'UPDATE ' + escId(conn._updateTable),
          ' SET `last_update`=now() WHERE `key` = ' + esc(updateKey) + ';',
          ''
        ].join('\n');
      }
    });
    TRIGGER_EVENTS.forEach(function(event){
      // Force out any competing triggers
      var currentTrigger = getTriggerName(conn, table, event);
      if(currentTrigger) removeTrigger(conn, currentTrigger);

      createTrigger(conn, table, conditionString, event);
    });
  });
};

triggerName = function(table, event){
  return 'meteor-subscription-' + table + '-' + event.toLowerCase();
};

triggerHash = function(def){
  return murmurhash3_32_gc(def.table + ' :: ' + def.condition, 10);
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

// Used to determine existence of competing trigger for removal
getTriggerName = function(conn, table, event){
  var result = conn.queryEx(function(esc, escId){
    return [
      "SELECT TRIGGER_NAME",
      "FROM information_schema.TRIGGERS",
      "WHERE TRIGGER_SCHEMA = SCHEMA()",
      "AND EVENT_OBJECT_TABLE = " + esc(table),
      "AND ACTION_TIMING = 'AFTER'",
      "AND EVENT_MANIPULATION = " + esc(event)
    ].join('\n');
  });
  return result.length > 0 ? result[0].TRIGGER_NAME : null;
};

removeTrigger = function(conn, name){
  return conn.queryEx(function(esc, escId){
    return 'drop trigger ' + escId(name) + ';';
  });
};

createUpdateKey = function(conn, key){
  try{
    return conn.queryEx(function(esc, escId){
      return [
        'INSERT INTO ' + escId(conn._updateTable) + ' (`key`) ',
        'VALUES (' + esc(key) + ')'
      ].join('\n');
    });
  }catch(err){
    if(!err.toString().match(/ER_DUP_ENTRY/)) throw err;
  }
};
