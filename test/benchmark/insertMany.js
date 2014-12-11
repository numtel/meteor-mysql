playersPoll = new MysqlSubscription('playersPoll');
playersUdf = new MysqlSubscription('playersUdf');
MongoPlayers = new Mongo.Collection('MongoPlayers');

var genMongoTest = function(meteorMethod){
 return function(options, done){
    var cursor = MongoPlayers.find();
    var startCount = cursor.count();
    var observer = cursor.observe({
      added: function(){
        if(cursor.count() === startCount + options.count){
          observer.stop();
          done();
        }
      }
    });
    Meteor.call(meteorMethod, options.count, function(){
      done('server');
    });
  };
};

var resetMongoCollection = function(options, done){
  var cursor = MongoPlayers.find();
  if(cursor.count() === 0) return done();
  var observer = cursor.observe({
    removed: function(){
      if(cursor.count() === 0){
        observer.stop();
        done();
      }
    }
  });
  Meteor.call('resetCollection');
};

Benchmark.addCase({
  _label: 'Insert Rows',
  _value: 'rate',
  _default: {
    count: 1000,
    sampleSize: 1,
    methods: ['mysql-poll', 'mysql-udf', 'mongo-standard', 'mongo-direct']
  },
  'mysql-poll': {
    run: function(options, done){
      var startCount = playersPoll.length;
      playersPoll.addEventListener('added.insertRows', function(){
        var result;
        if(playersPoll.length === startCount + options.count){
          playersPoll.removeEventListener(/insertRows/);
          done();
        }
      });
      Meteor.call('insRowsPoll', options.count, function(){
        done('server');
      });
    },
    reset: function(options, done){
      if(playersPoll.length === 0) return done();
      Meteor.call('resetTablePoll');
      playersPoll.addEventListener('removed.resetTable', function(){
        if(playersPoll.length === 0){
          playersPoll.removeEventListener(/resetTable/);
          done();
        }
      });
    }
  },
  'mysql-udf': {
    run: function(options, done){
      var startCount = playersUdf.length;
      playersUdf.addEventListener('added.insertRows', function(){
        var result;
        if(playersUdf.length === startCount + options.count){
          playersUdf.removeEventListener(/insertRows/);
          done();
        }
      });
      Meteor.call('insRowsUdf', options.count, function(error){
        if(error && error.error === 404){
          // UDF not available
          playersUdf.removeEventListener(/insertRows/);
          done();
        }
        done('server');
      });
    },
    reset: function(options, done){
      if(playersUdf.length === 0) return done();
      Meteor.call('resetTableUdf');
      playersUdf.addEventListener('removed.resetTable', function(){
        if(playersUdf.length === 0){
          playersUdf.removeEventListener(/resetTable/);
          done();
        }
      });
    }
  },
  'mongo-standard': {
    run: genMongoTest('insDocs'),
    reset: resetMongoCollection
  },
  'mongo-direct': {
    run: genMongoTest('insDocsDirect'),
    reset: resetMongoCollection
  }
});
