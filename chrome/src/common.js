

function clientID() {
    return 'SEw1uvRd6kxFEw';
}

export function lookupCommentsByUser(user, after, sortType, timeSpan, this_token, success) {
    jQuery.ajax({
        dataType: "json",
        url: "https://oauth.reddit.com/user/"+user+"/comments.json",
        headers: {Authorization: `bearer ${this_token}`},
        data: {limit:100, after:after, sort: sortType, t:timeSpan},
        success: success,
        complete: function(e) {},
        error: function(jqXHR, textStatus, errorThrown) {console.log(textStatus + ': '+errorThrown)}
    });
}

export function lookupCommentsByID(ids, this_token, success) {
    var query = {id: ids.join(',')};
    jQuery.ajax({
        dataType: "json",
        url: "https://oauth.reddit.com/api/info.json",
        data: query,
        headers: {Authorization: `bearer ${this_token}`},

        success: success,
        complete: function(e) {},
        error: function(jqXHR, textStatus, errorThrown) {console.log(textStatus + ': '+errorThrown)}
    });
}



export function alphaLowerSort (a, b) {
    var textA = a.toLowerCase();
    var textB = b.toLowerCase();

    if (textA < textB) return -1;
    if (textA > textB) return 1;
    return 0;
}

// can only be used by background/popup scripts, not content script
export function goToOptions () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
}


export function showError(message, selector) {
    $('<div class="rr-error">'+message+'</div>').appendTo(selector).delay(2400).fadeTo(400, 0, function() {$(this).remove();});
}

//noinspection JSUnusedLocalSymbols
export function pprint(obj) {
    console.log(JSON.stringify(obj, null, '\t'));
}

export function getToken(successFunction) {
    chrome.storage.sync.get('custom_clientid', function(result) {
        var use_this_client_id = clientID();
        if (result.custom_clientid) {
            use_this_client_id = result.custom_clientid;
        }
        jQuery.ajax({
            dataType: "json",
            url: "https://www.reddit.com/api/v1/access_token",
            data: {
                grant_type: "https://oauth.reddit.com/grants/installed_client",
                device_id: "DO_NOT_TRACK_THIS_DEVICE"
            },
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(`${use_this_client_id}:`)}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            success: successFunction,
            complete: function (e) {
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus + ': ' + errorThrown)
            }
        });
    });
}
