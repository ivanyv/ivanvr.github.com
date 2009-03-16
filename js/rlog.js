function relative_time(time_value) {
  var values = time_value.split(" ");
  time_value = values[1] + " " + values[2] + ", " + values[5] + " " + values[3];
  var parsed_date = Date.parse(time_value);
  var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
  var delta = parseInt((relative_to.getTime() - parsed_date) / 1000);
  delta = delta + (relative_to.getTimezoneOffset() * 60);

  if (delta < 60) {
    return 'hace menos de un minuto';
  } else if (delta < 120) {
    return 'about a minute ago';
  } else if (delta < (45*60)) {
    return ('hace ' + parseInt(delta / 60)).toString() + ' minutos';
  } else if (delta < (90*60)) {
    return 'about an hour ago';
  } else if(delta < (24*60*60)) {
    return 'hace como ' + (parseInt(delta / 3600)).toString() + ' horas';
  } else if (delta < (48*60*60)) {
    return 'hace un día';
  } else {
    return ('hace ' + parseInt(delta / 86400)).toString() + ' días';
  }
}
function twitterCallback(obj) {
  var id = obj[0].user.id;
  statuses = '<li>' + obj[0].text + ' &mdash; <span>' + relative_time(obj[0].created_at) + '</span></li>';
  statuses += '<li>' + obj[1].text + ' &mdash; <span>' + relative_time(obj[1].created_at) + '</span></li>';
  statuses += '<li>' + obj[2].text + ' &mdash; <span>' + relative_time(obj[2].created_at) + '</span></li>';
  document.getElementById('my_twitter_status').innerHTML = statuses;
}
