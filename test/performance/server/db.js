var db;

Meteor.startup(function(){
  db = mysql.createConnection(Meteor.settings.mysql);
  db.connect();

  db.queryEx('drop table if exists `perf_updates`');
  db.initUpdateTable('perf_updates');
  
  db.queryEx('drop table if exists `perf_players`');
  db.queryEx([
    "CREATE TABLE `perf_players` (",
    "  `id` int(11) NOT NULL AUTO_INCREMENT,",
    "  `name` varchar(45) DEFAULT NULL,",
    "  `score` int(11) NOT NULL DEFAULT '0',",
    "  PRIMARY KEY (`id`)",
    ") ENGINE=InnoDB DEFAULT CHARSET=latin1;"
  ].join('\n'));
});

Meteor.methods({
  resetTable: function(){
    // Truncate doesn't call delete trigger!
    db.queryEx('delete from `perf_players`');
  },
  insRows: function(count){
    if(typeof count !== 'number' || count < 1 || Math.floor(count) !== count)
      throw new Error('invalid-count');
    db.queryEx(function(esc, escId){
      var query = "INSERT INTO `perf_players` (`name`, `score`) VALUES ";
      var rows = [];
      for(var i = 0; i < count; i++){
        rows.push('(' + esc(randomString(10)) + ', ' +
                  esc(Math.floor(Math.random() * 20) * 5) + ')');
      }
      return query + rows.join(', ');
    });
  }
});

Meteor.publish('players', function(){
  db.select(this, {
    query: 'select * from `perf_players` order by score desc',
    triggers: [ { table: 'perf_players' } ]
  });
});
