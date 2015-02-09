Package.describe({
  name: 'numtel:mysql',
  summary: 'MySQL support with Reactive Select Subscriptions',
  version: '0.1.0',
  git: 'https://github.com/numtel/meteor-mysql.git'
});

Npm.depends({
  'mysql': '2.5.4',
  'mysql-live-select': '0.0.13'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use([
    'underscore',
    'ddp',
    'tracker'
  ]);
  api.addFiles([ 'lib/LiveMysql.js' ], 'server');
  api.addFiles([ 'lib/MysqlSubscription.js' ], ['client', 'server']);

  api.export('LiveMysql', 'server');
  api.export('MysqlSubscription');
});

Package.onTest(function(api) {
  api.use([
    'tinytest',
    'templating',
    'underscore',
    'autopublish',
    'insecure',
    'sharlon:6to5',
    'numtel:mysql'
  ]);
  api.use('test-helpers'); // Did not work concatenated above
  api.addFiles([
    'test/helpers/expectResult.js',
    'test/helpers/randomString.js'
  ]);

  api.addFiles([
    'test/fixtures/tpl.html',
    'test/fixtures/tpl.js'
  ], 'client');

  api.addFiles([
    'test/helpers/querySequence.js',
    'test/index.es6'
  ], 'server');

  api.addFiles([
    'test/MysqlSubscription.js'
  ]);
});
