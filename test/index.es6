// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/index.js

// Configure publications
var liveDb = new LiveMysql(Meteor.settings.mysql);

Meteor.startup(function(){
  insertSampleData();

  Meteor.publish('allPlayers', function(){
    return liveDb.select(
      `SELECT * FROM players ORDER BY score DESC`,
      [ { table: 'players' } ]
    );
  });

  Meteor.publish('playerScore', function(name){
    return liveDb.select(
      `SELECT id, score FROM players WHERE name = ${liveDb.db.escape(name)}`,
      [
        {
          table: 'players',
          condition: function(row, newRow){
            return row.name === name;
          }
        }
      ]
    );
  });

  Meteor.methods({
    'setScore': function(id, value){
      return querySequence(liveDb.db, [`
        UPDATE players
        SET score = ${liveDb.db.escape(value)}
        WHERE id = ${liveDb.db.escape(id)}
      `]);
    },
    'insPlayer': function(name, score){
      return querySequence(liveDb.db, [`
        INSERT INTO players (name, score) VALUES
          (${liveDb.db.escape(name)}, ${liveDb.db.escape(score)})
      `]);
    },
    'delPlayer': function(name){
      return querySequence(liveDb.db,
        [`DELETE FROM players WHERE name = ${liveDb.db.escape(name)}`]);
    },
  });

});

var insertSampleData = function(){
  querySequence(liveDb.db, [
    `DROP TABLE IF EXISTS players`,
    `CREATE TABLE players (
      id int(11) NOT NULL AUTO_INCREMENT,
      name varchar(45) DEFAULT NULL,
      score int(11) NOT NULL DEFAULT '0',
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`,
    `INSERT INTO players (name, score) VALUES
      ('Kepler', 40),('Leibniz',50),('Maxwell',60),('Planck',70);`
  ]);
};

