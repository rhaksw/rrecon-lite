import {goToOptions} from './common.js'

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action == "open-options") {
            goToOptions();
            sendResponse({response: "done"});
        }
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install') {
        ext_on_install();
    }
});


function ext_on_install() {
    getLoggedinUser(function(user) {
        if (user) {
            chrome.tabs.create({url: 'https://revddit.com/user/' + user});
        } else {
            chrome.tabs.create({url: chrome.runtime.getURL('/src/user-prompt.html')});
        }
    });
}

function getLoggedinUser(onComplete=function(){}) {
    $.ajax({
        url: 'https://www.reddit.com/api/me.json',
        success: function (data) {
            var user = data.data.name;
            onComplete(user);
        }
    });
}
