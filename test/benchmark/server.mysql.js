// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/benchmark/server.mysql.js

// Provide server for MySQL benchmarks
var connections = [
  {
    tablePrefix: 'benchmark_poll_',
    init: function(conn){
      var upTable = this.tablePrefix + 'updates';
      conn.queryEx('drop table if exists `' + upTable + '`');
      conn.initUpdateTable(upTable); 
    }
  }
]

Meteor.settings.udf && connections.push({
  tablePrefix: 'benchmark_udf_',
  init: function(conn){ conn.initUpdateServer(); }
});

connections.forEach(function(def){
  var conn;
  var playersTable = def.tablePrefix + 'players';
  Meteor.startup(function(){
    conn = mysql.createConnection(Meteor.settings.mysql);
    conn.connect();

    def.init.call(def, conn);
    
    conn.queryEx('drop table if exists `' + playersTable + '`');
    conn.queryEx([
      "CREATE TABLE `" + playersTable + "` (",
      "  `id` int(11) NOT NULL AUTO_INCREMENT,",
      "  `name` varchar(45) DEFAULT NULL,",
      "  `score` int(11) NOT NULL DEFAULT '0',",
      "  PRIMARY KEY (`id`)",
      ") ENGINE=InnoDB DEFAULT CHARSET=latin1;"
    ].join('\n'));
  });

  var connMethods = {};
  connMethods[def.tablePrefix + 'reset'] = function(){
    // Truncate doesn't call delete trigger!
    conn.queryEx('delete from `' + playersTable + '`');
  };
  connMethods[def.tablePrefix + 'insert'] = function(count){
    if(typeof count !== 'number' || count < 1 || Math.floor(count) !== count)
      throw new Error('invalid-count');
    conn.queryEx(function(esc, escId){
      var query = 'INSERT INTO `' + playersTable + '` (`name`, `score`) VALUES ';
      var rows = [];
      for(var i = 0; i < count; i++){
        rows.push('(' + esc(randomString(10)) + ', ' +
                  esc(Math.floor(Math.random() * 20) * 5) + ')');
      }
      return query + rows.join(', ');
    });
  };
  Meteor.methods(connMethods);

  Meteor.publish(playersTable, function(){
    conn.select(this, {
      query: 'select * from `' + playersTable + '` order by score desc',
      triggers: [ { table: playersTable } ]
    });
  });
});
