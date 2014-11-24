'use strict';
// numtel:mysql
// MIT License, ben@latenightsketches.com

var Future = Npm.require('fibers/future');
var bindEnv = Meteor.bindEnvironment;

mysql = Npm.require('mysql');

// Wrap original createConnection method
// (Constructor is not public)
mysql._createConnection = mysql.createConnection;
mysql.createConnection = function(config){
  var result = mysql._createConnection(config);
  if(typeof result === 'object'){
    // Append extra methods
    _.each(mysqlMethods, function(fun, key){
      result[key] = fun.bind(result);
    });
  }
  return result;
};

var mysqlMethods = {
  queryEx: function(query){
    var fut = new Future();
    var escId = this.escapeId;
    var esc = this.escape.bind(this);
    if(typeof query === 'function'){
      query = query(esc, escId);
    }
    this.query(query, bindEnv(function(error, rows, fields){
      if(error) return fut['throw'](error);
      fut['return'](rows);
    }));
    return fut.wait();
  },
  initUpdateTable: function(tableName){
    this.queryEx(function(esc, escId){
      return [
        'CREATE TABLE IF NOT EXISTS' + escId(tableName) + ' (',
          '`id` INT(11) NOT NULL AUTO_INCREMENT,',
          '`key` INT UNSIGNED DEFAULT NULL,',
          '`last_update` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
          'PRIMARY KEY (`id`),',
          'UNIQUE KEY (`key`),',
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

