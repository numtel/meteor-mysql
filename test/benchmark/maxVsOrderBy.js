if(Meteor.isClient){
  var reset = function(options, done){
    Meteor.call('resetTableMax', options.rows, function(){
      done();
    });
  };
  var run = function(useMax){
    return function(options, done){
      Meteor.call('performSelectMax', useMax, options.count, function(){
        done();
      });
    };
  };
  Benchmark.addCase({
    _label: 'Select MAX() vs. ORDER BY DESC LIMIT 1',
    _default: {
      rows: 10000,
      count: 10000,
      sampleSize: 1
    },
    'max': {
      run: run(true),
      reset: reset
    },
    'order-by-desc': {
      run: run(false),
      reset: reset
    }
  });

}else if(Meteor.isServer){


  var dbMax;

  var TABLE = 'perf_max_updates';

  Meteor.startup(function(){
    dbMax = mysql.createConnection(Meteor.settings.mysql);
    dbMax.connect();

    dbMax.queryEx('drop table if exists `' + TABLE + '`');
    dbMax.initUpdateTable(TABLE);
  });

  Meteor.methods({
    resetTableMax: function(count){
      // Truncate doesn't call delete trigger!
      dbMax.queryEx('delete from `' + TABLE + '`');
      dbMax.queryEx(function(esc, escId){
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
      for(var i = 0; i < count; i++){
        if(useMax){
          dbMax.queryEx([
            'UPDATE `' + TABLE + '` as p',
            'JOIN (',
            'SELECT MAX(p1.`update`) AS max FROM',
            '`' + TABLE + '` as p1',
            ') as g',
            'SET p.`update`= g.max + 1',
            'WHERE `key` = 1'
          ].join('\n'));
        }else{
          dbMax.queryEx([
            'UPDATE `' + TABLE + '` as p',
            'JOIN (',
            'SELECT p1.`update` AS max FROM',
            '`' + TABLE + '` as p1',
            'ORDER BY p1.`update` DESC LIMIT 1',
            ') as g',
            'SET p.`update`= g.max + 1',
            'WHERE `key` = 1'
          ].join('\n'));
        }
      }
    }
  });
}
