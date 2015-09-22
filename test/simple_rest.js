// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/simple_rest.js

var SUITE_PREFIX = 'numtel:mysql - simple:rest support - ';

Tinytest.addAsync(SUITE_PREFIX + 'allPlayers publication', function(test, done){
  HTTP.get(Meteor.absoluteUrl() + '/publications/allPlayers',
    function(error, result) {
      test.equal(result.statusCode, 200);

      // JSON data does not come ordered
      var data = _.sortBy(result.data.data, '_index');

      // expectedRows is defined in test/MysqlSubscription.js
      test.equal(expectResult(data, expectedRows), true);
      done();
    }
  );
});
