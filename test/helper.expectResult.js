// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/helper.expectResult.js

// Deep compare variables, allowing regular expressions on expected values
// Accepts array, object and primitives
expectResult = function(result, expected){
  for(var i = 0; i < expected.length; i++){
    if(typeof expected[i] === 'object'){
      if(expected.length !== undefined &&
         result.length !== expected.length) return false;
      if(typeof result[i] !== 'object') return false;
      for(var key in expected[i]){
        if(expected[i].hasOwnProperty(key) &&
           ((expected[i][key] instanceof RegExp && 
              !expected[i][key].test(result))
             || result[i][key] !== expected[i][key])) return false;
      }
    }else if(result[i] !== expected[i]){
      return false;
    }
  }
  return true;
};
