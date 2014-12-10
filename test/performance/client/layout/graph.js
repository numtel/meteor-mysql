createGraph = function(results){
  var counter = 0;
  var data = [{ key: 'Results', values: [] }];
  _.each(results, function(instances, key){
    _.each(instances, function(result, index){
      data[0].values.push({
        label: key + ' #' + (index + 1),
        value: result.rate
      });
    });
  });
  console.log(data);

  nv.addGraph(function() {
    var chart = nv.models.discreteBarChart()
      .x(function(d) { return d.label })    //Specify the data accessors.
      .y(function(d) { return d.value })
      .tooltips(false)        //Don't show tooltips
      .showValues(true)       //...instead, show the bar value right on top of each bar.
      .transitionDuration(350)
      .margin({top: 80, left: 100})
      ;

    chart.yAxis.axisLabel('Inserts Published to Client per Second');

    d3.select('#graph svg')
      .datum(data)
      .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
};


