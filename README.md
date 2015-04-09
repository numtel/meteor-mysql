# numtel:mysql [![Build Status](https://travis-ci.org/numtel/meteor-mysql.svg?branch=master)](https://travis-ci.org/numtel/meteor-mysql)
Reactive MySQL for Meteor

Provides Meteor integration of the [`mysql-live-select` NPM module](https://github.com/numtel/mysql-live-select), bringing reactive `SELECT` statement result sets from MySQL >= 5.1.15.

* [How to publish joined queries that update efficiently](https://github.com/numtel/meteor-mysql/wiki/Publishing-Efficient-Joined-Queries)
* [Leaderboard example modified to use MySQL](https://github.com/numtel/meteor-mysql-leaderboard)
* [Talk at Meteor Devshop SF, December 2014](https://www.youtube.com/watch?v=EJzulpXZn6g)

> This documentation covers `numtel:mysql` **>= 0.1.0**. For older versions that included the trigger poll table that worked with MySQL < 5.1.15, see the [old branch](https://github.com/numtel/meteor-mysql/tree/old).

## Server Implements

This package provides the `LiveMysql` class as defined in the [`mysql-live-select` NPM package](https://github.com/numtel/mysql-live-select). Be sure to follow the installation instructions for configuring your MySQL server to output the binary log.

### `LiveMysql.prototype.select()`

In this Meteor package, the `LiveMysqlSelect` object returned by the `select()` method is modified to act as a cursor that can be published.

```javascript
var liveDb = new LiveMysql(Meteor.settings.mysql);

Meteor.publish('allPlayers', function(){
  return liveDb.select(
    `SELECT * FROM players ORDER BY score DESC`,
    [ { table: 'players' } ]
  );
});
```

## Client/Server Implements

### `MysqlSubscription([connection,] name, [args...])`

Constructor for subscribing to a published select statement. No extra call to `Meteor.subscribe()` is required. Specify the name of the subscription along with any arguments.

The first argument, `connection`, is optional. If connecting to a different Meteor server, pass the DDP connection object in this first argument. If not specified, the first argument becomes the name of the subscription (string) and the default Meteor server connection will be used.

The prototype inherits from `Array` and is extended with the following methods:

Name | Description
-----|--------------------------
`change([args...])` | Change the subscription's arguments. Publication name and connection are preserved. *UI flickering may occur, please stand-by until I update this package with an improved diffing algorithm that will fix this.*
`addEventListener(eventName, listener)` | Bind a listener function to this subscription
`removeEventListener(eventName)` | Remove listener functions from an event queue
`dispatchEvent(eventName, [args...])` | Call the listeners for a given event, returns boolean
`depend()` | Call from inside of a Template helper function to ensure reactive updates
`reactive()` | Same as `depend()` except returns self
`changed()`| Signal new data in the subscription
`ready()` | Return boolean value corresponding to subscription fully loaded
`stop()` | Stop updates for this subscription

**Notes:**

* `changed()` is automatically called when the query updates and is most likely to only be called manually from a method stub on the client.
* Event listener methods are similar to native methods. For example, if an event listener returns `false` exactly, it will halt listeners of the same event that have been added previously. A few differences do exist though to make usage easier in this context:
  * The event name may also contain an identifier suffix using dot namespacing (e.g. `update.myEvent`) to allow removing/dispatching only a subset of listeners.
  * `removeEventListener()` and `dispatchEvent()` both refer to listeners by name only. Regular expessions allowed.
  * `useCapture` argument is not available.

#### Event Types

Name | Listener Arguments | Description
-----|-------------------|-----------------------
`update` | `index, msg` | Any difference, before update
`added` | `index, newRow` | Row inserted, after update
`changed` | `index, oldRow, newRow` | Row updated, after update
`removed` | `index, oldRow` | Row removed, after update
`reset` | `msg` | Subscription reset (most likely due to code-push), before update

## Closing connections between hot code-pushes

With Meteor's hot code-push feature, a new connection the database server is requested with each restart. In order to close old connections, a handler to your application process's `SIGTERM` signal event must be added that calls the `end()` method on each `LiveMysql` instance in your application. Also, a handler for `SIGINT` can be used to close connections on exit.

On the server-side of your application, add event handlers like this:

```javascript

var liveDb = new LiveMysql(Meteor.settings.mysql);

var closeAndExit = function() {
  liveDb.end();
  process.exit();
};

// Close connections on hot code push
process.on('SIGTERM', closeAndExit);
// Close connections on exit (ctrl + c)
process.on('SIGINT', closeAndExit);
```

## Tests / Benchmarks

A MySQL server configured to output the binary log in row mode is required to run the test suite.

The MySQL connection settings must be configured in `test/settings/local.json`.

The database specified should be an empty database with no tables because the tests will create and delete tables as needed.

If you set the `recreateDb` value to true, the test suite will automatically create the database, allowing you to specify a database name that does not yet exist.

```bash
# Install Meteor
$ curl -L https://install.meteor.com/ | /bin/sh

# Clone Repository
$ git clone https://github.com/numtel/meteor-mysql.git
$ cd meteor-mysql

# Configure database settings in your favorite editor
# (an empty database is suggested)
$ ed test/settings/local.json

# Run test/benchmark server
$ meteor test-packages --settings test/settings/local.json ./

```

## License

MIT
