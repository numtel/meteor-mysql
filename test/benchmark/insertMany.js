// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/benchmark/insertMany.js

// Benchmark number of inserts published to client per second
// Compare MySQL binlog, Mongo, and Mongo-Direct
var genMysqlTest = function(){
  var subscription = new MysqlSubscription('benchmark_players');
  return {
    run: function(options, done){
      var startCount = subscription.length;
      subscription.addEventListener('added.insertRows', function(){
        var result;
        if(subscription.length === startCount + options.count){
          subscription.removeEventListener(/insertRows/);
          done();
        }
      });
      Meteor.call('benchmark_insert', options.count, function(error){
        if(error && error.error === 404){
          subscription.removeEventListener(/insertRows/);
          done();
        }
        done('server');
      });
    },
    reset: function(options, done){
      if(subscription.length === 0) return done();
      Meteor.call('benchmark_reset');
      subscription.addEventListener('removed.resetTable', function(){
        if(subscription.length === 0){
          subscription.removeEventListener(/resetTable/);
          done();
        }
      });
    }
  }
};

// Both Mongo tests use same collection
MongoPlayers = new Mongo.Collection('MongoPlayers');
var genMongoTest = function(meteorMethod){
  return {
    run: function(options, done){
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
      Meteor.call(meteorMethod, options.count, function(){ done('server'); });
    },
    reset: function(options, done){
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
    }
  };
};

Benchmark.addCase({
  _label: 'Insert Rows',
  _value: 'rate',
  _default: {
    count: 1000,
    sampleSize: 1,
    // Explictly specify methods for easy omission
    methods: ['mysql-binlog', 'mongo-standard', 'mongo-direct']
  },
  'mysql-binlog': genMysqlTest(),
  'mongo-standard': genMongoTest('insDocs'),
  'mongo-direct': genMongoTest('insDocsDirect')
});
