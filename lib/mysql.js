'use strict';
// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/mysql.js

var Future = Npm.require('fibers/future');
var LiveMysql = Npm.require('mysql-live-select');
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
    var self = this;
    if(typeof query === 'function'){
      var escId = self.escapeId;
      var esc = self.escape.bind(self);
      return query(esc, escId);
    }
    return query;
  },
  queryEx: function(query){
    var self = this;
    var fut = new Future();
    query = self._escapeQueryFun(query);
    self.query(query, Meteor.bindEnvironment(function(error, rows, fields){
      if(error) return fut['throw'](error);
      fut['return'](rows);
    }));
    return fut.wait();
  },
  initBinlog: function(settings){
    var self = this;
    self._binlog = new LiveMysql(settings);
  },
  initUpdateTable: function(tableName){
    var self = this;
    self._updateTable = tableName;

    self.queryEx(function(esc, escId){
      return [
        'CREATE TABLE IF NOT EXISTS ' + escId(tableName) + ' (',
          '`key` INT(10) UNSIGNED NOT NULL,',
          '`update` BIGINT UNSIGNED NOT NULL,',
          'PRIMARY KEY (`key`),',
          'INDEX (`update`)',
        ') ENGINE=MEMORY;'
      ].join('\n');
    });
  },
  select: function(subscription, options){
    var self = this;
    if(self._binlog){
      binlogSelect.call(self, subscription, options.query, options.triggers);
    }else if(self._updateTable){
      initTriggers.call(self, options.triggers);
      syncSelect.call(self, subscription, options);
    }else{
      throw new Error('no-update-mechanism');
    }
  }
};

