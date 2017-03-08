function matchButtonEnableDisable(){
  if(
    ($('.drop-zone').find('.drop').length == 4) &&
    (((($('#redscore').val() == 10) && ($('#blackscore').val() < 10)) ||
      (($('#redscore').val() < 10) && ($('#blackscore').val() == 10))) ||
      ((($('#redscore').val() == "winner") && ($('#blackscore').val() == "")) ||
        (($('#redscore').val() == "") && ($('#blackscore').val() == "winner")))) &&
    ($('#pickadate').val().length > 0)
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
  // http://codepen.io/neagle/pen/fuIqs
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
  $( function(){
    $("#pickadate").on('change keyup paste',matchButtonEnableDisable);
  });

  // $('.input-group.date').datepicker({
  // });
  // $('.input-group.date').datepicker(
  //   'update', new Date()
  // )
  $('#pickadate').pickadate();
  new Darkroom('#target', {
    // Canvas initialization size
    minWidth: 100,
    minHeight: 100,
    maxWidth: 500,
    maxHeight: 500,

    // Plugins options
    plugins: {
      crop: {
        minHeight: 50,
        minWidth: 50,
        ratio: 1
      },
      save: {
        callback: function(){
          console.log('hello');
          console.log(Cookies.get('_csrf'));
          $.ajax({
            type: "POST",
            url: '/account/editedpicture',
            data: {data: this.darkroom.sourceCanvas.toDataURL()},
            headers: {
              'X-CSRF-Token': Cookies.get('_csrf')
            }
          });
        }
      }
    },
  });
  $('#rankings-table').tablesorter({sortList: [[2,1]]});
});
