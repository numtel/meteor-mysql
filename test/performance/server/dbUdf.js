var dbUdf;

var TABLE_PREFIX = 'perf_udf_';

Meteor.startup(function(){
  dbUdf = mysql.createConnection(Meteor.settings.mysql);
  dbUdf.connect();

  dbUdf.queryEx('drop table if exists `' + TABLE_PREFIX + 'updates`');
  dbUdf.initUpdateServer();
  
  dbUdf.queryEx('drop table if exists `' + TABLE_PREFIX + 'players`');
  dbUdf.queryEx([
    "CREATE TABLE `" + TABLE_PREFIX + "players` (",
    "  `id` int(11) NOT NULL AUTO_INCREMENT,",
    "  `name` varchar(45) DEFAULT NULL,",
    "  `score` int(11) NOT NULL DEFAULT '0',",
    "  PRIMARY KEY (`id`)",
    ") ENGINE=InnoDB DEFAULT CHARSET=latin1;"
  ].join('\n'));
});

Meteor.methods({
  resetTableUdf: function(){
    // Truncate doesn't call delete trigger!
    dbUdf.queryEx('delete from `' + TABLE_PREFIX + 'players`');
  },
  insRowsUdf: function(count){
    if(typeof count !== 'number' || count < 1 || Math.floor(count) !== count)
      throw new Error('invalid-count');
    dbUdf.queryEx(function(esc, escId){
      var query = 'INSERT INTO `' + TABLE_PREFIX + 'players` (`name`, `score`) VALUES ';
      var rows = [];
      for(var i = 0; i < count; i++){
        rows.push('(' + esc(randomString(10)) + ', ' +
                  esc(Math.floor(Math.random() * 20) * 5) + ')');
      }
      return query + rows.join(', ');
    });
  }
});

Meteor.publish('playersUdf', function(){
  dbUdf.select(this, {
    query: 'select * from `' + TABLE_PREFIX + 'players` order by score desc',
    triggers: [ { table: TABLE_PREFIX + 'players' } ]
  });
});
