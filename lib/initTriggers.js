// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/initTriggers.js

var TRIGGER_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];
var TRIGGER_SIGNATURE = [
  '/* BEGIN Meteor Triggers */\n',
  '\n/* END Meteor Triggers */'
];
var TRIGGER_MATCH =
  /\/\* BEGIN Meteor Triggers \*\/[^]*?\/\* END Meteor Triggers \*\//g;
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
  _.each(list, function(def){
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
  _.each(updatedTables, function(table){
    var triggerDefs = _.filter(buffer, function(entry){
      return entry.table === table;
    });
    var conditionString = TRIGGER_SIGNATURE[0];
    _.each(triggerDefs, function(def, i){
      if(def.condition && typeof def.condition === 'function'){
        def.condition = def.condition(esc, escId);
      }
      var updateKey = triggerHash(def);
      if(typeof def.condition === 'string'){
        conditionString += '\nIF ' + def.condition + ' THEN\n';
      }
      if(conn._updatedKeys !== undefined){
        conditionString += 'DO meteor_update(' + esc(String(updateKey)) + ');';
      }else{
        createUpdateKey(conn, updateKey);
        conditionString += [
          'UPDATE ' + escId(conn._updateTable) + ' as p',
            'JOIN (',
              'SELECT p1.`update` FROM ' + escId(conn._updateTable) + ' as p1',
              'ORDER BY p1.`update` DESC LIMIT 1) as g',
            'SET p.`update`= g.`update` + 1',
            'WHERE `key` = ' + esc(updateKey) + ';',
          ''
        ].join('\n');
      }
      if(typeof def.condition === 'string'){
        conditionString += 'END IF;\n';
      }
    });
    conditionString += TRIGGER_SIGNATURE[1];
    _.each(TRIGGER_EVENTS, function(event){
      // Update existing trigger if possible
      var currentTrigger = getTrigger(conn, table, event);
      var name;
      if(currentTrigger){
        name = currentTrigger.name;
        removeTrigger(conn, name);
        conditionString += currentTrigger.body
          .replace(TRIGGER_MATCH, '')
          .replace(/^BEGIN/gi, '')
          .replace(/END$/gi, '')
          .trim();
      }

      createTrigger(conn, table, conditionString, event, name);
    });
  });
};

triggerName = function(table, event){
  return 'meteor-subscription-' + table + '-' + event.toLowerCase();
};

triggerHash = function(def){
  return murmurhash3_32_gc(def.table + ' :: ' + def.condition, 10);
};

createTrigger = function(conn, table, body, event, name){
  name = name || triggerName(table, event);
  var rowRef = event === 'INSERT' ? 'NEW' : 'OLD';
  return conn.queryEx(function(esc, escId){
    return [
      'CREATE TRIGGER ' + escId(name),
      'AFTER ' + event + ' ON ' + escId(table),
      'FOR EACH ROW',
      'BEGIN',
      body.replace(/\$ROW/g, rowRef),
      'END',
    ].join('\n');
  });
};

getTrigger = function(conn, table, event){
  var result = conn.queryEx(function(esc, escId){
    return [
      "SELECT TRIGGER_NAME AS name, ACTION_STATEMENT AS body",
      "FROM information_schema.TRIGGERS",
      "WHERE TRIGGER_SCHEMA = SCHEMA()",
      "AND EVENT_OBJECT_TABLE = " + esc(table),
      "AND ACTION_TIMING = 'AFTER'",
      "AND EVENT_MANIPULATION = " + esc(event)
    ].join('\n');
  });
  return result.length > 0 ? result[0] : null;
};

removeTrigger = function(conn, name){
  return conn.queryEx(function(esc, escId){
    return 'DROP TRIGGER ' + escId(name);
  });
};

createUpdateKey = function(conn, key){
  try{
    return conn.queryEx(function(esc, escId){
      return [
        'INSERT INTO ' + escId(conn._updateTable) + ' (`key`, `update`) ',
        'VALUES (' + esc(key) + ', 1)'
      ].join('\n');
    });
  }catch(err){
    if(!err.toString().match(/ER_DUP_ENTRY/)) throw err;
  }
};
