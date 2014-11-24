Package.describe({
  name: 'numtel:mysql',
  summary: 'MySQL support with Reactive Select Subscriptions',
  version: '0.0.1',
  git: 'https://github.com/numtel/meteor-mysql.git'
});

Npm.depends({
  mysql: '2.5.3'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use([
    'underscore',
    'ddp'
  ]);
  api.addFiles([
    'murmurhash3_gc.js',
    'initTriggers.js',
    'syncSelect.js',
    'mysql.js'
  ], 'server');
  api.addFiles([
    'MysqlSubscribe.js'
  ], ['client', 'server']);
  api.export('mysql', 'server'); // node-mysql with extra methods
  api.export('MysqlSubscribe');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('numtel:mysql-select');
});
