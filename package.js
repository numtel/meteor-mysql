Package.describe({
  name: 'numtel:mysql',
  summary: 'MySQL support with Reactive Select Subscriptions',
  version: '0.0.7',
  git: 'https://github.com/numtel/meteor-mysql.git'
});

Npm.depends({
  mysql: '2.5.3'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use([
    'underscore',
    'ddp',
    'tracker'
  ]);
  api.addFiles([
    'dist/murmurhash3_gc.js',
    'lib/initTriggers.js',
    'lib/syncSelect.js',
    'lib/mysql.js'
  ], 'server');
  api.addFiles([
    'lib/MysqlSubscription.js'
  ], ['client', 'server']);
  api.export('mysql', 'server'); // node-mysql with extra methods
  api.export('MysqlSubscription');
});

Package.onTest(function(api) {
  api.use([
    'tinytest',
    'underscore',
    'numtel:mysql'
  ]);
  api.use('test-helpers'); // Did not work concatenated above
  api.addFiles([
    'test/helper.expectResult.js',
    'test/helper.randomString.js'
  ]);
  api.addFiles([
    'test/mock.connection.query.js',
    'test/mysql.js'
  ], 'server');
  api.addFiles([
    'test/MysqlSubscription.js'
  ]);
});
