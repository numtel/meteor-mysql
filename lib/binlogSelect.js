// numtel:mysql
// MIT License, ben@latenightsketches.com
// lib/binlogSelect.js

binlogSelect = function(subscription, query, triggers){
  var self = this;
  var select = self._binlog.select(query, triggers);
  var initLength;

  // Send reset message (for code pushes)
  subscription._session.send({
    msg: 'added',
    collection: subscription._name,
    id: subscription._subscriptionId,
    fields: { reset: true }
  });

  select.on('update', function(rows){
    if(subscription._ready === false){
      initLength = rows.length;
    }
  });

  function selectHandler(eventName, fieldArgument, indexArgument, customAfter){
    // Events from mysql-live-select are the same names as the DDP msg types
    select.on(eventName, function(/* row, [newRow,] index */){
      subscription._session.send({
        msg: eventName,
        collection: subscription._name,
        id: subscription._subscriptionId + ':' + arguments[indexArgument],
        fields: fieldArgument !== null ? arguments[fieldArgument] : undefined
      });
      if(customAfter) customAfter();
    });
  }

  selectHandler('added', 0, 1, function(){
    if(subscription._ready === false && 
       select.data.length === initLength - 1){
      subscription.ready();
    }
  });
  selectHandler('changed', 1, 2);
  selectHandler('removed', null, 1);

};
