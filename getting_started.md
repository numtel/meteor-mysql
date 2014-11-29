# Getting Started

Add the package to your Meteor application:

```bash
$ meteor add numtel:mysql
```

Publish a select statement, specifying when to refresh the query. By utilizing triggers and a highly optimized update table, polling queries are very simple and run quickly.

```javascript
// On the server

db = mysql.createConnection(mysqlSettings);
db.connect();
db.initUpdateTable('updates');

Meteor.publish('playerScore', function(name){
  db.select(this, {
    query: function(esc, escId){
      return 'select `score` from `players` where `name`=' + esc(name);
    },
    triggers: [
      {
        table: 'players',
        condition: function(esc, escId){
          return '$ROW.name = ' + esc(name);
        }
      }
    ]
  });
});
```

Reactive select statements are accessed on the client and server using the `MysqlSubscription()` constructor. Appearing as an array of rows, a MySQL subscription also provides Tracker dependency and event handling.

```javascript
// On the client or server

myScore = new MysqlSubscription('playerScore', 'Maxwell');

// Get updates using event callback
myScore.addEventListener('update', function(index, msg){
  console.log(msg.fields.score);
});

// Or use data reactively (on the client)
Template.scoreboard.helpers({
  myScore: function () {
    return myScore.reactive()[0].score;
  }
});

```
