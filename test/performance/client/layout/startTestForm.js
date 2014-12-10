
Template.startTestForm.helpers({
  methods: function(){
    return _.keys(insertManyTest.methods).map(function(key){
      return {key: key};
    });
  }
});

Template.startTestForm.events({
  'submit form': function(e){
    e.preventDefault();
    var qs = e.target.querySelector.bind(e.target);
    var intVal = function(sel){ return parseInt(qs(sel).value, 10); };
    var submitButton = qs('button');

    var options = {
      count: intVal('#insCount'),
      sampleSize: intVal('#sampleSize'),
      methods: _.map(
        e.target.querySelectorAll('input[type=checkbox]:checked'),
        function(box){ return box.name; })
    };

    check(options.count, Match.Integer);
    check(options.sampleSize, Match.Integer);

    submitButton.setAttribute('disabled', 'disabled');
    runTest(insertManyTest, options).then(function(results){
      console.log(results);
      createGraph(results);
      submitButton.removeAttribute('disabled');
    });
  }
});
