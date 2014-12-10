playersPoll = new MysqlSubscription('playersPoll');
playersUdf = new MysqlSubscription('playersUdf');

var genMongoTest = function(meteorMethod){
 return function(count, serverDone, allDone){
    var cursor = MongoPlayers.find();
    var startCount = cursor.count();
    var observer = cursor.observe({
      added: function(){
        if(cursor.count() === startCount + count){
          observer.stop();
          allDone()
        }
      }
    });
    Meteor.call(meteorMethod, count, serverDone);
  };
};

var resetMongoCollection = function(done){
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

insertManyTest = {
  methods: {
    'mysql-poll': {
      run: function(count, serverDone, allDone){
        var startCount = playersPoll.length;
        playersPoll.addEventListener('added.insertRows', function(){
          var result;
          if(playersPoll.length === startCount + count){
            playersPoll.removeEventListener(/insertRows/);
            allDone();
          }
        });
        Meteor.call('insRowsPoll', count, serverDone);
      },
      reset: function(done){
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
      run: function(count, serverDone, allDone){
        var startCount = playersUdf.length;
        playersUdf.addEventListener('added.insertRows', function(){
          var result;
          if(playersUdf.length === startCount + count){
            playersUdf.removeEventListener(/insertRows/);
            allDone();
          }
        });
        Meteor.call('insRowsUdf', count, serverDone);
      },
      reset: function(done){
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
  }
};
