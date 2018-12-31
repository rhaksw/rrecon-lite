
function redirect(user) {
    user = user.trim();
    if (user) {
        window.location.href = 'https://revddit.com/user/' + user;
    }
}

function main() {
    $('<p>lookup a reddit username:</p>').appendTo('#main');
    var $input = $(`<input type="text" id="adduser" placeholder="reddit username">`).appendTo("#main");
    $input.focus();
    $(`<button id="rr-go">go</button>`).appendTo("#main");
    $input.bind("enterKey", function () {
        redirect($input.val());
    });
    $('#rr-go').click(function () {
        redirect($input.val());
    });
    $input.keyup(function (e) {
        if (e.keyCode == 13) $(this).trigger("enterKey");
    });
}

main();
