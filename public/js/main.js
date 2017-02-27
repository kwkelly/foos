function matchButtonEnableDisable(){
  if(
    ($('.drop-zone').find('.drop').length == 4) &&
    (((($('#redscore').val() == 10) && ($('#blackscore').val() < 10)) ||
      (($('#redscore').val() < 10) && ($('#blackscore').val() == 10))) ||
    ((($('#redscore').val() == "winner") && ($('#blackscore').val() == "")) ||
      (($('#redscore').val() == "") && ($('#blackscore').val() == "winner"))))
  ){
    $('#matchsubmit').prop('disabled', false);
  }
  else {
    $('#matchsubmit').prop('disabled', true);
  }
}

function updateMatchFormVals() {
  $("input[name='red1']").val(function(){
    return $('.red1').find('.caption').text()
  });
  $("input[name='red2']").val(function(){
    return $('.red2').find('.caption').text()
  });
  $("input[name='black1']").val(function(){
    return $('.black1').find('.caption').text()
  });
  $("input[name='black2']").val(function(){
    return $('.black2').find('.caption').text()
  });
}

$(document).ready(function() {
  // cards and matches and stuff
  $( function(){
    $("#drag-zone").sortable({
      connectWith: '.drop-zone',
      stop: function(event, ui) {
        matchButtonEnableDisable();
        updateMatchFormVals();
      }
    });
    $('.drop-zone').sortable({
      appendTo: document.body,
      items: '.drop',
      connectWith: '#drag-zone, .drop-zone',
      stop: function(event, ui) {
        matchButtonEnableDisable();
        updateMatchFormVals();
      }
    });
    // Only one per drop-zone
    // http://jsfiddle.net/P9bS8/
    // http://stackoverflow.com/questions/8025062/jquery-ui-sortable-limit-max-to-1-item
    $('.drop').mousedown(function() {
      $('.drop-zone').not($(this).parent()).each(function() {
        if ($(this).find('span').length >= 1) {
          $(this).sortable('disable');
        }
      });
    });
    $('.drop').mouseup(function() {
      $('.drop-zone').each(function() {
        $(this).sortable('enable');
      });
    });
  });
  
  // enable the submit button on the match page based on editing the score boxes
  $( function(){
    $(".score").on('change keyup paste',matchButtonEnableDisable);
  });

  $('.input-group.date').datepicker({
  });
  $('.input-group.date').datepicker(
    'update', new Date()
  )

  // $(document).ready(function() {
  //   if($(window).width() > 515) {
  //     $(".hero").attr("src", "/public/images/foosball-white.png");
  //   } else {
  //     $("#img").attr("src", "small.png");
  //   }
  // }); 


});
