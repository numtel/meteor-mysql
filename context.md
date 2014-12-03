# Implementation Context

In MySQL, triggers can not call the external environment without a UDF (user defined function) that must be compiled for the individual machine and able to be executed by any MySQL user. Please see this [StackOverflow answer about executing external programs from MySQL](http://stackoverflow.com/a/20439489). If you're more interested in trigger practices, be sure to read the linked article, [The Trouble with Triggers](http://www.oracle.com/technetwork/issue-archive/2008/08-sep/o58asktom-101055.html).

Polling a table that is updated by triggers has been chosen as the method to update each select statement as the easiest option to reach. By compiling live-select update queries into `AFTER` triggers on each event (`INSERT`, `UPDATE`, and `DELETE`), a separate table keeps track of last updated triggers keyed by a hash generated from the table name and conditions for each select query published.

## Next Frontier

To realize OPLOG-esque integration with MySQL, a UDF written in C/C++ must be compiled and installed on the machine running MySQL server. `sudo` or `root` access is required to install the UDF in MySQL's plugin directory.

Keeping the same package interface, a UDF backed update transmission option would offer lower latency and greater reliability.

Trigger action bodies could change from conditionals that operate on an update polling table like this:

```sql
IF NEW.name = 'Maxwell' THEN
  SET @`test_updates_count` = (
    SELECT `update` FROM `test_updates`
    ORDER BY `update` DESC LIMIT 1);
  UPDATE `test_updates`
    SET `update`= @`test_updates_count` + 1
    WHERE `key` = 3303291040;
END IF;
```

To much simpler ones like this that would instantly broadcast updates to Meteor:
```sql
IF NEW.name = 'Maxwell' THEN
  DO meteor_update(3303291040);
END IF;
```

## Postgres Sequel

Postgres allows functions accessing external resources to be written using `plperlu` scripts (only as a super user). More research is required to determine whether this a path to a reactive Postgres integration without polling a table.

