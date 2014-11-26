'use strict';
// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/mysql.js

var Future = Npm.require('fibers/future');
var bindEnv = Meteor.bindEnvironment;

mysql = Npm.require('mysql');

// Wrap original createConnection method
// (Constructor is not public)
mysql._createConnection = mysql.createConnection;
mysql.createConnection = function(config){
  var result = mysql._createConnection(config);
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
    this.query(query, bindEnv(function(error, rows, fields){
      if(error) return fut['throw'](error);
      fut['return'](rows);
    }));
    return fut.wait();
  },
  initUpdateTable: function(tableName){
    this.queryEx(function(esc, escId){
      return [
        'CREATE TABLE IF NOT EXISTS ' + escId(tableName) + ' (',
          '`key` INT(10) UNSIGNED NOT NULL,',
          '`last_update` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
          'PRIMARY KEY (`key`),',
          'INDEX (`last_update`)',
        ') ENGINE=MyISAM;'
      ].join('\n');
    });
    this._updateTable = tableName;
  },
  select: function(subscription, options){
    if(!this._updateTable) throw new Error('invalid-update-table');
    initTriggers.call(this, options.triggers);
    syncSelect.call(this, subscription, options);
  }
};

