// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/MysqlSubscription.js

var POLL_WAIT = 1000 + 200; // test/mysql.js :: POLL_INTERVAL + allowance

players = new MysqlSubscription('allPlayers');
myScore = new MysqlSubscription('playerScore', 'Maxwell');

var expectedRows = [ // test/mysql.js :: insertSampleData()
  { name: 'Planck', score: 70 },
  { name: 'Maxwell', score: 60 },
  { name: 'Leibniz', score: 50 },
  { name: 'Kepler', score: 40 }
];

// TODO count queries
// TODO simulate many connections

Tinytest.addAsync('numtel:mysql - MysqlSubscription initialization',
function(test, done){
  var updateCount = 0;
  test.equal(typeof players.length, 'number');

  // Allow 1 second for subscription to be ready
  Meteor.setTimeout(function(){
    test.isTrue(players.subscription.ready());
    test.isTrue(expectResult(players, expectedRows));
    done();
  }, POLL_WAIT);
});

Tinytest.addAsync('numtel:mysql - MysqlSubscription added/deleted row',
function(test, done){
  var newPlayer = 'Archimedes';
  Meteor.call('getQueries', function(error, startQueries){
    // NOTE: On server, the result argument of the Meteor method call is
    //       passed by reference, i.e. startQueries===endQueries
    var startQueriesLength = startQueries.length;
    Meteor.call('insPlayer', newPlayer, 100);
    Meteor.setTimeout(function(){
      var newExpected = expectedRows.slice();
      newExpected.unshift({ name: newPlayer, score: 100 });
      test.isTrue(expectResult(players, newExpected));
      Meteor.call('delPlayer', newPlayer);
      Meteor.call('getQueries', function(error, endQueries){
        var newQueries = endQueries.slice(startQueriesLength);
        console.log(newQueries);
        Meteor.setTimeout(function(){
          test.isTrue(expectResult(players, expectedRows));
          done();
        }, POLL_WAIT);
      });
    }, POLL_WAIT);
  });
});

Tinytest.addAsync('numtel:mysql - MysqlSubscription conditional trigger + changed',
function(test, done){
  Meteor.setTimeout(function(){
    test.equal(myScore.length, 1);
    test.equal(myScore[0].score, 60);
    Meteor.call('getQueries', function(error, startQueries){
      // NOTE: On server, the result argument of the Meteor method call is
      //       passed by reference, i.e. startQueries===endQueries
      var startQueriesLength = startQueries.length;
      Meteor.call('setScore', myScore[0].id, 30);
      Meteor.setTimeout(function(){
        Meteor.call('getQueries', function(error, endQueries){
          var newQueries = endQueries.slice(startQueriesLength);
          test.equal(_.unique(newQueries).length, newQueries.length,
            'Ensure no duplicated queries');
          test.equal(myScore[0].score, 30);
          Meteor.call('setScore', myScore[0].id, 60);
          done();
        });
      }, POLL_WAIT);
    });
  }, POLL_WAIT);
});


