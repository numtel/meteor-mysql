playersPoll = new MysqlSubscription('playersPoll');
playersUdf = new MysqlSubscription('playersUdf');

/*
TODO: generalize the method descriptions, enable multiple trials per test
{
  run: function(count, done){},
  reset: function() {}
}
*/

Session.setDefault("results", []);

var toggleButtons = function(enabled){
  Array.prototype.forEach.call(document.querySelectorAll('button'),
  function(button){
    if(enabled){
      button.removeAttribute('disabled');
    }else{
      button.setAttribute('disabled', 'disabled');
    }
  });
};

Template.hello.helpers({
  counterPoll: function () {
    return playersPoll.reactive().length;
  },
  counterUdf: function () {
    return playersUdf.reactive().length;
  },
  collectionCounter: function () {
    return MongoPlayers.find().count();
  },
  results: function () {
    return Session.get('results');
  }
});

Template.hello.events({
  'click #insertRowsPoll': function (event, template) {
    toggleButtons(false);
    var startTime = Date.now();
    var methodTime;
    var startCount = playersPoll.length;
    var insCount = parseInt(template.$('#insCount')[0].value, 10);
    var results, result;
    playersPoll.addEventListener('added.insertRows', function(){
      if(playersPoll.length === startCount + insCount){
        playersPoll.removeEventListener(/insertRows/);
        results = Session.get('results');
        result = {
          type: 'MySQL (Poll)',
          index: results.length + 1,
          time: Date.now() - startTime,
          serverTime: methodTime,
          count: insCount,
        };
        result.rate = result.count / (result.time / 1000);
        result.rate = Math.floor(result.rate * 100) / 100;
        results.unshift(result);
        Session.set('results', results);
        toggleButtons(true);
      }
    });
    Meteor.call('insRowsPoll', insCount, function(){
      methodTime = Date.now() - startTime;
    });
  },
  'click #clearTablePoll': function(event){
    if(playersPoll.length === 0) return;
    toggleButtons(false);
    Meteor.call('resetTablePoll');
    playersPoll.addEventListener('removed.resetTable', function(){
      if(playersPoll.length === 0){
        toggleButtons(true);
        playersPoll.removeEventListener(/resetTable/);
      }
    });
  },
  'click #insertRowsUdf': function (event, template) {
    toggleButtons(false);
    var startTime = Date.now();
    var methodTime;
    var startCount = playersUdf.length;
    var insCount = parseInt(template.$('#insCount')[0].value, 10);
    var results, result;
    playersUdf.addEventListener('added.insertRows', function(){
      if(playersUdf.length === startCount + insCount){
        playersUdf.removeEventListener(/insertRows/);
        results = Session.get('results');
        result = {
          type: 'MySQL (UDF)',
          index: results.length + 1,
          time: Date.now() - startTime,
          serverTime: methodTime,
          count: insCount,
        };
        result.rate = result.count / (result.time / 1000);
        result.rate = Math.floor(result.rate * 100) / 100;
        results.unshift(result);
        Session.set('results', results);
        toggleButtons(true);
      }
    });
    Meteor.call('insRowsUdf', insCount, function(){
      methodTime = Date.now() - startTime;
    });
  },
  'click #clearTableUdf': function(event){
    if(playersUdf.length === 0) return;
    toggleButtons(false);
    Meteor.call('resetTableUdf');
    playersUdf.addEventListener('removed.resetTable', function(){
      if(playersUdf.length === 0){
        toggleButtons(true);
        playersUdf.removeEventListener(/resetTable/);
      }
    });
  },
  'click #insertDocs': function (event, template) {
    toggleButtons(false);
    var startTime = Date.now();
    var methodTime;
    var insCount = parseInt(template.$('#insCount')[0].value, 10);
    var results, result;
    var cursor = MongoPlayers.find();
    var startCount = cursor.count();
    var observer = cursor.observe({
      added: function(){
        if(cursor.count() === startCount + insCount){
          observer.stop();
          results = Session.get('results');
          result = {
            type: 'Mongo',
            index: results.length + 1,
            time: Date.now() - startTime,
            serverTime: methodTime,
            count: insCount,
          };
          result.rate = result.count / (result.time / 1000);
          result.rate = Math.floor(result.rate * 100) / 100;
          results.unshift(result);
          Session.set('results', results);
          toggleButtons(true);
        }
      }
    });
    Meteor.call('insDocs', insCount, function(){
      methodTime = Date.now() - startTime;
    });
  },
  'click #insertDocsDirect': function (event, template) {
    toggleButtons(false);
    var startTime = Date.now();
    var methodTime;
    var insCount = parseInt(template.$('#insCount')[0].value, 10);
    var results, result;
    var cursor = MongoPlayers.find();
    var startCount = cursor.count();
    var observer = cursor.observe({
      added: function(){
        if(cursor.count() === startCount + insCount){
          observer.stop();
          results = Session.get('results');
          result = {
            type: 'Mongo Direct',
            index: results.length + 1,
            time: Date.now() - startTime,
            serverTime: methodTime,
            count: insCount,
          };
          result.rate = result.count / (result.time / 1000);
          result.rate = Math.floor(result.rate * 100) / 100;
          results.unshift(result);
          Session.set('results', results);
          toggleButtons(true);
        }
      }
    });
    Meteor.call('insDocsDirect', insCount, function(){
      methodTime = Date.now() - startTime;
    });
  },
  'click #clearCollection': function(event){
    var cursor = MongoPlayers.find();
    if(cursor.count() === 0) return;
    toggleButtons(false);
    var observer = cursor.observe({
      removed: function(){
        if(cursor.count() === 0){
          toggleButtons(true);
          observer.stop();
        }
      }
    });
    Meteor.call('resetCollection');
  }
});

Template.hello.renderedxxx = function(){
  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10, "%");

  var svg = d3.select("#graph").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var data = Session.get('results');
  x.domain(data.map(function(d){ return d.rate; }));
  y.domain([0, d3.max(data, function(d){ return d.rate;})]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Inserts per Second");

  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.rate); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.rate); })
      .attr("height", function(d) { return height - y(d.rate); });


};
