
var storage_keys = {'custom_clientid':'', 'show_search_bar': true};

chrome.storage.sync.get(storage_keys, displaySettings);

$('#rr-opt-save').click(saveAndCloseOptions);
$('#reset').click(resetDefaults);

function resetDefaults() {
    $('#show-search-bar').prop('checked', true);
}

function saveAndCloseOptions() {
    var show_search_bar = $('#show-search-bar').prop('checked');
    var newStorage = {};
    newStorage.show_search_bar = show_search_bar;
    chrome.storage.sync.set(newStorage, function () {
        window.close();
    });

}

function displaySettings(result) {
    $('#show-search-bar').prop('checked', result.show_search_bar);
}
