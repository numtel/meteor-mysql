// numtel:mysql
// MIT License, ben@latenightsketches.com
// test/helper.randomString.js

randomString = function(length){
  var text = "",
      possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";
  for(var i=0; i < length; i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  };
  return text;
};
