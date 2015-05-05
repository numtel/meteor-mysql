// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/benchmark/server.mysql.js

// Provide server for MySQL benchmarks

var conn = liveDb;
var playersTable = 'benchmark_players';
Meteor.startup(function(){
  var settings = _.clone(Meteor.settings.mysql);
  settings.serverId *= 2; // Unique serverId required

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
connMethods['benchmark_reset'] = function(){
  // Truncate doesn't call delete trigger!
  conn.queryEx('delete from `' + playersTable + '`');
};
connMethods['benchmark_insert'] = function(count){
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
  return conn.select(
    'select * from `' + playersTable + '` order by score desc',
    [ { table: playersTable } ]);
});
