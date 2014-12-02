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
  initUpdateTable: function(tableName){
    var funName = tableName + '_next';
    var varPrefix = 'meteor_';
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
    try{
      this.queryEx(function(esc, escId){
        return [
          'CREATE FUNCTION ' + escId(funName) + ' ()',
            'RETURNS BIGINT UNSIGNED NOT DETERMINISTIC',
            'RETURN concat(UNIX_TIMESTAMP(),',
              'LPAD(@COUNTER:=',
                'IF((SELECT @LASTUP IS NULL)=1, 0,',
                'IF((SELECT @LASTUP IS NULL)=1, 0,',
                'IF(@LASTUP < UNIX_TIMESTAMP(), 0,',
                  '@COUNTER + 1))), 6, \'0\'));',
        ].join('\n').replace(/@LASTUP|@COUNTER/gi, function(match){
          return '@' + escId(varPrefix + match.substr(1).toLowerCase());
        });
      });
    }catch(err){
      if(!err.toString().match(/ER_SP_ALREADY_EXISTS/)) throw err;
    }
    this._nextFun = funName;
    this._varPrefix = varPrefix;
    this._updateTable = tableName;
  },
  select: function(subscription, options){
    if(!this._updateTable) throw new Error('invalid-update-table');
    initTriggers.call(this, options.triggers);
    syncSelect.call(this, subscription, options);
  }
};

