# numtel:mysql [![Build Status](https://travis-ci.org/numtel/meteor-mysql.svg?branch=master)](https://travis-ci.org/numtel/meteor-mysql)
Reactive MySQL for Meteor

Wrapper of the [MySQL NPM module](https://github.com/felixge/node-mysql) with a few added methods.

* [Quick tutorial on using this package](getting_started.md)
* [Leaderboard example modified to use MySQL](https://github.com/numtel/meteor-mysql-leaderboard)
* [Explanation of the implementation design process](context.md)

## Server Implements

### `mysql`

The `mysql` module is exposed to the server side of your application when this package is installed.

See the [MySQL NPM module documentation on GitHub](https://github.com/felixge/node-mysql) for very detailed instructions on this module.

If you are currently using the `pcel:mysql` package, the interface will be exactly the same except for the following methods which are added to each connection:

### `connection.queryEx(query)`

Perform any query synchronously and return the result. The single argument may contain a string or a function. A function may be passed that accepts two arguments. See example:

```javascript
var result = db.queryEx(function(esc, escId){
  return 'update ' + escId(table) +
         ' set `score`=`score` + ' + esc(amount) +
         ' where `id`=' + esc(id);
});
```
* The first argument, `esc` is a function that escapes values in the query.
* The second argument, `escId` is a function that escapes identifiers in the query.

### `connection.initUpdateTable(tableName)`

Specify a table (as string) to use for storing the keys used for notifying updates to queries. The table will be created if it does not exist. To install for the first time, specify a table name that does not currently exist.

### `connection.initUpdateServer([port], [hostName])`

***Under construction***

Instead of polling a table for updates, broadcast updates from MySQL directly to your Meteor server. If you can't wait for an installation script and more testing, you can try it using the following commands.

```bash
# Install dependency on CentOS
$ yum install mysql-devel

# Install dependency on openSUSE
$ zypper install libmysqlclient-devel

# Install dependency on Debian/Ubuntu
$ sudo apt-get install libmysqlclient-dev

# Install dependency on Mac OS X (Does this work??)
$ brew install mysql-connector-c

# Compile
$ gcc $(mysql_config --cflags) -shared -fPIC -o meteor_update.so lib/meteor_update.c

# Install
$ sudo cp meteor_update.so $(mysql_config --plugindir)
```

Due to the early stage of development, the default settings must be used: port 9801 on localhost.

### `connection.select(subscription, options)`

Bind a SQL select statement to a subscription object (e.g. context of a `Meteor.publish()` function).

`initUpdateTable()` or `initUpdateServer()` must be called before publishing a select statement.

Option | Type | Required | Description
------|-------|-----------|--------------
`query`|`string` or `function` | Required | Query to perform
`triggers`|`array`| Required | Description of triggers to refresh query
`pollInterval` | `number` | Optional | Poll delay duration in milliseconds

Each trigger object may contain the following properties:

Name | Type | Required | Description
-----|-------| --------|--------------
`table` | `string` | Required | Name of table to hook trigger
`condition` | `string` or `function` | Optional | Access new row on insert or old row on update/delete using `$ROW`<br><br>*Example:*<br>`$ROW.name = "dude" or $ROW.score > 200`

**Notes:**

* When a function is allowed in place of a string, use the `queryEx()` argument structure to escape values and identifiers.

* Every live-select utilizes the same poll timer. Passing a `pollInterval` will update the global poll delay. By default, the poll is intialized at 200 ms.

* MySQL command `truncate` does not use `delete` so the trigger will not be called and subscriptions will not be updated. Use slower `delete` without a `where` clause to perform same operation while using subscriptions.

## Client/Server Implements

### `MysqlSubscription([connection,] name, [args...])`

Constructor for subscribing to a published select statement. No extra call to `Meteor.subscribe()` is required. Specify the name of the subscription along with any arguments.

The first argument, `connection`, is optional. If connecting to a different Meteor server, pass the DDP connection object in this first argument. If not specified, the first argument becomes the name of the subscription (string) and the default Meteor server connection will be used.

The prototype inherits from `Array` and is extended with the following methods:

Name | Description
-----|--------------------------
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

## Tests / Benchmarks

A MySQL server is required to run the test suite.

```bash
# Install Meteor
$ curl -L https://install.meteor.com/ | /bin/sh

# Clone Repository
$ git clone https://github.com/numtel/meteor-mysql.git
$ cd meteor-mysql

# Configure database settings in your favorite editor
# (an empty database is suggested)
$ ed test/settings.local.json

# Run test/benchmark server
$ meteor test-packages --settings test/settings.local.json ./

```

## License

MIT
