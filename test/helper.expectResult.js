// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/helper.expectResult.js

var checkMismatch = function(result, expected){
  return ((expected instanceof RegExp && !expected.test(result)) ||
          (!(expected instanceof RegExp) && result !== expected));
};

// Deep compare variables, allowing regular expressions on expected values
// Accepts array, object and primitives
expectResult = function(result, expected){
  for(var i = 0; i < expected.length; i++){
    if(typeof expected[i] === 'object' && !(expected[i] instanceof RegExp)){
      if(expected.length !== undefined &&
         result.length !== expected.length) return 'Mismatched lengths';
      if(typeof result[i] !== 'object') return 'Result not object';
      for(var key in expected[i]){
        if(expected[i].hasOwnProperty(key) &&
           checkMismatch(result[i][key], expected[i][key]))
          return 'Value mismatch';
      }
    }else if(checkMismatch(result[i], expected[i])){
      return 'Primitive mismatch';
    }
  }
  return true;
};

