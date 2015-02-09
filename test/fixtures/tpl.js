Template.mysqlTest.helpers({
  myScore: function(){
    var data = myScore.reactive();
    return data.length === 1 && data[0].score;
  }
});
