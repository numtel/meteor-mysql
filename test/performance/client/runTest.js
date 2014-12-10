Session.setDefault('testProgress', 0);
var progress = 0, progressMajor = 0, majorSize;
var setProgress = function(value, isMajor){
  if(isMajor){
    progress = progressMajor = value;
  } else{
    progress = progressMajor + (majorSize * value / 100);
  }
  Session.set('testProgress', progress);
}

// @return Promise
// @param {object} test - Description of test case
// @param {[string]} options.methods - Which methods to run (Default: all)
// @param {int} options.count - number of rows/docs to insert (Default: 1000)
// @param {int} options.sampleSize - how many times to run each method (Default: 1)
runTest = function(test, options){
  var results = {};
  options = _.clone(options) || {};
  options.methods = options.methods instanceof Array ? 
                      options.methods : _.keys(test.methods);
  options.count = options.count || 1000;
  options.sampleSize = options.sampleSize || 1;

  var runMethods = [], methodCount, doneCount = 0;
  while(options.sampleSize--){
    runMethods = runMethods.concat(_.clone(options.methods));
  }
  methodCount = runMethods.length;
  majorSize = (1 / methodCount) * 100;
  
  return new Promise(function(fulfill, reject){
    var nextMethod = function(result){
      if(result){
        if(!(result.name in results)) results[result.name] = [];
        results[result.name].push(result);
      }

      if(runMethods.length === 0){
        setProgress(100, true);
        return fulfill(results);
      }
      var methodName = runMethods.shift();
      setProgress(Math.round(doneCount / methodCount * 100), true);
      doneCount++;
      executeMethod(test.methods[methodName], methodName, options, nextMethod);
    };
    nextMethod();
  });
}


var executeMethod = function(method, methodName, options, fulfill){
  var startTime = Date.now();
  var serverTime;
  var doneTime;
  var initDone = function(){
    // After initial reset, run test
    method.run(options.count, serverDone, allDone);
  };
  var serverDone = function(){
    // Record server method duration
    serverTime = Date.now() - startTime;
  };
  var allDone = function(){
    // Record duration of test
    doneTime = Date.now();
    result = {
      name: methodName,
      time: doneTime - startTime,
      serverTime: serverTime,
      count: options.count
    };
    result.rate = result.count / (result.time / 1000);
    result.rate = Math.floor(result.rate * 100) / 100;
    setProgress(50);
    method.reset(resetDone);
  };
  var resetDone = function(){
    // Record duration of cleanup
    result.resetTime = Date.now() - doneTime;
    fulfill(result)
  };
  // Begin by resetting the data
  method.reset(initDone);
};

