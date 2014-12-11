MongoPlayers = new Mongo.Collection('MongoPlayers');

Meteor.methods({
  resetCollection: function(){
    MongoPlayers.remove({});
  },
  insDocs: function(count){
    if(typeof count !== 'number' || count < 1 || Math.floor(count) !== count)
      throw new Error('invalid-count');
    for(var i = 0; i < count; i++){
      MongoPlayers.insert({
        name: randomString(10),
        score: Math.floor(Math.random() * 20) * 5
      });
    }
  },
  insDocsDirect: function(count){
    if(typeof count !== 'number' || count < 1 || Math.floor(count) !== count)
      throw new Error('invalid-count');
    var docs = [];
    for(var i = 0; i < count; i++){
      docs.push({
        name: randomString(10),
        score: Math.floor(Math.random() * 20) * 5
      });
    }
    MongoPlayers.directInsert(docs);
  }
});

