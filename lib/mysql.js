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
  initUpdateServer: function(port, selfHost){
    var self = this;
    self._updatedKeys = [];
    self._updatePort = port || 9801;
    self._updatehost = selfHost || 'localhost';
    var net = Npm.require('net');
    net.createServer(function(sock) {
      sock.on('data', function(data) {
        self._updatedKeys.push(parseInt(data, 10));
      });
    }).listen(self._updatePort, self._updateHost);
    self.queryEx('DROP FUNCTION IF EXISTS `meteor_update`;');
    self.queryEx('CREATE FUNCTION meteor_update RETURNS STRING ' +
                  'SONAME "meteor_update.so";');
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
    if(self._updatedKeys === undefined &&
       self._updateTable === undefined)
        throw new Error('no-update-mechanism');
    initTriggers.call(self, options.triggers);
    syncSelect.call(self, subscription, options);
  }
};

