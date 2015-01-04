// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/mysql.js

var SUITE_PREFIX = 'numtel:mysql - mysql module - ';
var POLL_INTERVAL = 200;
var db;

Meteor.startup(function(){
  db = mysql.createConnection(Meteor.settings.mysql);
  //db.connect(); // Apparently this happens automatically?
  insertSampleData();

  var updateTable = 'test_updates';
  db.queryEx(function(esc, escId){
    return 'drop table if exists ' + escId(updateTable);
  });

  if(Meteor.settings.binlog){
    db.initBinlog(Meteor.settings.mysql);
  }else{
    db.initUpdateTable(updateTable);
  }

  Meteor.publish('allPlayers', function(){
    db.select(this, {
      query: 'select * from players order by score desc',
      triggers: [
        { table: 'players' }
      ],
      pollInterval: POLL_INTERVAL
    });
  });

  Meteor.publish('playerScore', function(name){
    db.select(this, {
      query: function(esc, escId){
        return 'select `id`, `score` from `players` where `name`=' + esc(name);
      },
      triggers: [
        {
          table: 'players',
          condition: function(row, newRow){
            return row.name === name;
          }
        }
      ]
    });
  });

  Meteor.methods({
    'setScore': function(id, value){
      return db.queryEx(function(esc, escId){
        return 'update players set `score`=' + esc(value) +
                  ' where `id`=' + esc(id);
      });
    },
    'insPlayer': function(name, score){
      return db.queryEx(function(esc, escId){
        return 'INSERT INTO `players` (`name`, `score`) VALUES (' +
          esc(name) + ', ' + esc(score) + ')';
      });
    },
    'delPlayer': function(name){
      return db.queryEx(function(esc, escId){
        return 'DELETE FROM `players` WHERE `name`=' + esc(name);
      });
    },
    'getQueries': function(){
      return db.__queries; // test/mock.connection.query.js
    }
  });

});

var insertSampleData = function(){
  db.queryEx('drop table if exists `players`');
  db.queryEx([
    "CREATE TABLE `players` (",
    "  `id` int(11) NOT NULL AUTO_INCREMENT,",
    "  `name` varchar(45) DEFAULT NULL,",
    "  `score` int(11) NOT NULL DEFAULT '0',",
    "  PRIMARY KEY (`id`)",
    ") ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;"
  ].join('\n'));
  db.queryEx([
    "INSERT INTO `players` (`name`, `score`) VALUES ",
      "('Kepler', 40),('Leibniz',50),('Maxwell',60),('Planck',70);"
  ].join('\n'));
  db.queryEx(function(esc, escId){
    return [
      'CREATE TRIGGER `players_test`',
      'AFTER INSERT ON `players`',
      'FOR EACH ROW',
      'BEGIN',
      '/* I will not be removed! */',
      'END',
    ].join('\n');
  });
};

Tinytest.add(SUITE_PREFIX + 'queryEx with string', function(test){
  var result = db.queryEx('select 1 + 1 as solution');
  test.equal(result[0].solution, 2);
});

Tinytest.add(SUITE_PREFIX + 'queryEx with function', function(test){
  var value = 7;
  var result = db.queryEx(function(esc, escId){
    return 'select ' + esc(value) + ' + 1 as ' + escId('solution');
  });
  test.equal(result[0].solution, 8);
});

Tinytest.add(SUITE_PREFIX + 'initUpdateTable', function(test){
  var table = db._updateTable;
  if(!table) return;

  test.equal(expectResult(db.queryEx(function(esc, escId){
    return 'show columns from ' + escId(table);
  }), [
    { Field: 'key', Type: 'int(10) unsigned', Key: 'PRI' },
    { Field: 'update', Type: 'bigint(20) unsigned', Key: 'MUL' }
  ]), true, 'Fields incorrect');

  test.equal(expectResult(db.queryEx(function(esc, escId){
    return 'show indexes from ' + escId(table);
  }), [
    { Column_name: 'key', Key_name: 'PRIMARY', Non_unique: 0 },
    { Column_name: 'update', Non_unique: 1 }
  ]), true, 'Indexes incorrect');
});

Tinytest.add(SUITE_PREFIX + 'Trigger contents preserved', function(test){
  var table = db._updateTable;
  if(!table) return; // Only run test in poll table mode

  var result = db.queryEx(function(esc, escId){
    return [
      "SELECT ACTION_STATEMENT AS body",
      "FROM information_schema.TRIGGERS",
      "WHERE TRIGGER_SCHEMA = SCHEMA()",
      "AND TRIGGER_NAME = 'players_test'"
    ].join('\n');
  });
  test.equal(result.length, 1);
  test.include(result[0].body, '/* BEGIN Meteor Triggers */');
  test.include(result[0].body, '/* I will not be removed! */');
});
