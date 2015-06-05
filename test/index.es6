// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/index.js

// Configure publications
var database = Meteor.settings.mysql.database;
if(Meteor.settings.recreateDb){
  // Primarily for Travis CI compat
  delete Meteor.settings.mysql.database;
}

liveDb = new LiveMysql(Meteor.settings.mysql);
liveDb.queryEx = queryEx.bind(liveDb.db);

if(Meteor.settings.recreateDb){
  querySequence(liveDb.db, [
    'DROP DATABASE IF EXISTS ' + liveDb.db.escapeId(database),
    'CREATE DATABASE ' + liveDb.db.escapeId(database),
    'USE ' + liveDb.db.escapeId(database),
  ]);
}

Meteor.startup(function(){
  insertSampleData();

  Meteor.publish('errorRaising', function(){
    return liveDb.select(
      'SELECT * FROM invalid_table ORDER BY score DESC',
      [ { database, table: 'invalid_table' } ]
    );
  });

  Meteor.publish('allPlayers', function(limit){
    return liveDb.select(
      'SELECT * FROM players ORDER BY score DESC' +
        (typeof limit === 'number' ? ' LIMIT ' + liveDb.db.escape(limit) : ''),
      [ { database, table: 'players' } ]
    );
  });

  Meteor.publish('playerScore', function(name){
    return liveDb.select(
      `SELECT id, score FROM players WHERE name = ${liveDb.db.escape(name)}`,
      [
        {
          database,
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

