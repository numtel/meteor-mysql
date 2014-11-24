// numtel:mysql
// MIT License, ben@latenightsketches.com

MysqlSubscribe = function(name /* arguments */){
  var self = this;

  self.dep = new Tracker.Dependency;
  self._events = { update: [], added: [], changed: [], removed: [] };

  if(Meteor.isClient){
    Meteor.subscribe.apply(this, arguments);
  }else if(Meteor.isServer){
    // TODO: serve!!!!
    return;
  }

  if(!(self instanceof MysqlSubscribe)){
    throw new Error('use "new" to construct a MysqlSelect');
  }
  options = _.defaults(options || {}, {
  });
  
  if(options.ddpConnection)
    self._ddp = options.ddpConnection;
  else if(Meteor.isClient)
    self._ddp = Meteor.connection;
  else
    self._ddp = Meteor.server;

  if(self._ddp && self._ddp.registerStore){
    self._ddp.registerStore(name, {
      beginUpdate: function(batchSize, reset){},
      update: function(msg){
        var index = parseInt(msg.id.substr(1), 10);
        var oldRow;
        self.dispatchEvent('update', index, msg);
        switch(msg.msg){
          case 'added':
            self.splice(index, 0, msg.fields);
            self.dispatchEvent(msg.msg, index, msg.fields);
            break;
          case 'changed':
            oldRow = _.clone(self[index]);
            self[index] = _.extend(self[index], msg.fields);
            self.dispatchEvent(msg.msg, index, oldRow, self[index]);
            break;
          case 'removed':
            oldRow = _.clone(self[index]);
            self.splice(index, 1);
            self.dispatchEvent(msg.msg, index, oldRow);
            break;
        }
        self.dep.changed();
      },
      endUpdate: function(){},
      saveOriginals: function(){},
      retrieveOriginals: function(){}
    });
  }
};

MysqlSubscribe.prototype = new Array();

MysqlSubscribe.prototype.on = function(eventName, handler){
  var self = this;
  // Register event handler
  if(!(eventName in self._events))
    throw new Error('invalid-event ' + eventName);
  if(typeof handler !== 'function')
    throw new Error('invalid-handler');
  var handlers = self._events[eventName];
  var index = handlers.length;
  handlers.push(handler);
  return self;
};

MysqlSubscribe.prototype.removeHandler = function(eventName, handler){
  var self = this;
  if(!(eventName in self._events))
    throw new Error('invalid-event ' + eventName);
  var handlers = self._events[eventName];
  var index;
  while(true){
    index = handlers.indexOf(handler);
    if(index !== -1) handlers.splice(index, 1);
    else break;
  }
  return self;
};

MysqlSubscribe.prototype.dispatchEvent = function(eventName /* arguments */){
  var self = this;
  if(!(eventName in self._events))
    throw new Error('invalid-event ' + eventName);
  var handlerArgs = Array.prototype.slice.call(arguments, 1);
  var handlers = self._events[eventName];
  // Newest to oldest
  for(var i = handlers.length - 1; i >= 0; i--){
    // Return false to stop further handling
    if(handlers[i].apply(self, handlerArgs) === false) break;
  }
  return self;
};

