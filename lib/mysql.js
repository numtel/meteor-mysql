'use strict';
// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/mysql.js

var Future = Npm.require('fibers/future');
mysql = Npm.require('mysql');

// Wrap original createConnection method
// (Constructor is not public)
var origConnectionMethod = mysql.createConnection;
mysql._createConnection =  origConnectionMethod; // Expose original
mysql.createConnection = function(config){
  var result = origConnectionMethod.apply(this, arguments);
  if(typeof result === 'object'){
    // Append extra methods, not modifying prototype
    _.each(mysqlMethods, function(fun, key){
      result[key] = fun.bind(result);
    });
  }
  return result;
};

var mysqlMethods = {
  _escapeQueryFun: function(query){
    if(typeof query === 'function'){
      var escId = this.escapeId;
      var esc = this.escape.bind(this);
      return query(esc, escId);
    }
    return query;
  },
  queryEx: function(query){
    var fut = new Future();
    query = this._escapeQueryFun(query);
    this.query(query, Meteor.bindEnvironment(function(error, rows, fields){
      if(error) return fut['throw'](error);
      fut['return'](rows);
    }));
    return fut.wait();
  },
  initUpdateTable: function(tableName, updateVar){
    updateVar = updateVar || 'meteor_update_count';
    this.queryEx(function(esc, escId){
      return [
        'CREATE TABLE IF NOT EXISTS ' + escId(tableName) + ' (',
          '`key` INT(10) UNSIGNED NOT NULL,',
          '`update` BIGINT UNSIGNED NOT NULL,',
          'PRIMARY KEY (`key`),',
          'INDEX (`update`)',
        ') ENGINE=MyISAM;'
      ].join('\n');
    });
    // Initialize update counter
    this.queryEx(function(esc, escId){
      return [
        'set @' + escId(updateVar) + ' = (',
          'select `update` from ' + escId(tableName),
            'order by `update` desc limit 1',
        ') or 1;'
      ].join('\n');
    });
    this._updateVar = updateVar;
    this._updateTable = tableName;
  },
  select: function(subscription, options){
    if(!this._updateTable) throw new Error('invalid-update-table');
    initTriggers.call(this, options.triggers);
    syncSelect.call(this, subscription, options);
  }
};

