var user = '';
var matcher = window.location.href.match(/\?user=([^&]*)/);
if (matcher && matcher.length > 1) {
    user=matcher[1];
    setUser(matcher[1]);
}

function setUser(user) {
    $(`<h1>${user}</h1>`).appendTo('#rr-user-header');
}
