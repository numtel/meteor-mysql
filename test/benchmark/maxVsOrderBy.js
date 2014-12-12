// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/benchmark/maxVsOrderBy.js

// Determine performance difference using each MySQL statement:
// MAX() or ORDER BY DESC LIMIT 1 to get highest value from table
if(Meteor.isClient){
  var genMethod = function(useMax){
    return {
      run: function(options, done){
        Meteor.call('performSelectMax', useMax, options.count, done);
      },
      reset: function(options, done){
        Meteor.call('resetTableMax', options.rows, done);
      }
    };
  };
  Benchmark.addCase({
    _label: 'Select MAX() vs. ORDER BY DESC LIMIT 1',
    _default: {
      rows: 5000,
      count: 1000,
      sampleSize: 3
    },
    'max': genMethod(true),
    'order-by-desc': genMethod(false)
  });

}else if(Meteor.isServer){
  var conn;
  var TABLE = 'benchmark_max_vs_orderby';

  Meteor.startup(function(){
    conn = mysql.createConnection(Meteor.settings.mysql);
    conn.connect();

    conn.queryEx('drop table if exists `' + TABLE + '`');
    conn.initUpdateTable(TABLE);
  });

  Meteor.methods({
    resetTableMax: function(count){
      // Truncate doesn't call delete trigger!
      conn.queryEx('delete from `' + TABLE + '`');
      conn.queryEx(function(esc, escId){
        var query = 'INSERT INTO `' + TABLE + '` (`key`, `update`) VALUES ';
        var rows = [];
        var key;
        for(var i = 0; i < count; i++){
          rows.push('(' + i + ', ' + i + ')');
        }
        return query + rows.join(', ');
      });
    },
    performSelectMax: function(useMax, count){
      var query;
      for(var i = 0; i < count; i++){
        query = [
          'UPDATE `' + TABLE + '` as p',
          'JOIN (',
        ];
        if(useMax){
          query = query.concat([
            'SELECT MAX(p1.`update`) AS max FROM',
            '`' + TABLE + '` as p1',
          ]);
        }else{
          query = query.concat([
            'SELECT p1.`update` AS max FROM',
            '`' + TABLE + '` as p1',
            'ORDER BY p1.`update` DESC LIMIT 1',
          ]);
        }
        query = query.concat([
          ') as g',
          'SET p.`update`= g.max + 1',
          'WHERE `key` = 1'
        ]);
        conn.queryEx(query.join('\n'));
      }
    }
  });
}
