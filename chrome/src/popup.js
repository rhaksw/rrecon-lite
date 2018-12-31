import {goToOptions} from './common.js'


document.querySelector('#go-to-options').addEventListener('click', goToOptions);


var $input = $('#user');
$input.focus();
$input.bind("enterKey",function() {
    goUser();
});
$input.keyup(function(e) {
    if(e.keyCode == 13) $(this).trigger("enterKey");
});

$('#rr-go').click(function() {
    goUser();
});

function goUser() {
    var user = $input.val().trim();
    if (user) {
        chrome.tabs.create({url: 'https://revddit.com/user/' + user});
    }
}
