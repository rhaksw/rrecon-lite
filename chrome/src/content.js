import {lookupCommentsByUser,lookupCommentsByID,showError,getToken} from './common.js'

(function () {


    var queried_ids_base10 = [];
    var reddit_data_global_by_id = {};
    var pageSortType = '';
    var pageTimeSpan = '';
    var user_global;
    var previous_id = '';

    var matcher = window.location.href.match(/\/user\/([^/]*)/);
    if (matcher && matcher.length > 1) user_global = matcher[1];

    matcher = window.location.href.match(/\?user=([^&]*)/);
    if (! user_global && matcher && matcher.length > 1) user_global = matcher[1];

    var search_depth = 1;
    var num_retrievals_this_search = 0;
    var clicked_search_previously = false;
    var displayedComments = {};
    var selected_depth_text = '';
    var num_requests_remaining = 0;
    var global_after = {'new': '',
                        'hot': '',
                        'top': '',
                        'controversial': ''};
    var global_num_children_last_search = {'new': 1,
                                           'hot': 1,
                                           'top': 1,
                                           'controversial': 1};
    var ids_to_show = {};

    var chrome_storage = null;

    var total_num_requests = null;
    var bar = null;
    var approved_searched = false;
    var token = '';
    var redesign_parent_class = 's1jtt59r-5';
    var redesign_profile_selector = '.'+redesign_parent_class+' > div:first';
    var redesign_remove_selector = redesign_profile_selector + ' > div:nth-child(2)';
    jQuery(document).ready(function(){
        getChromeStorage(function (result) {
            var redesign_or_new_profile_layout = ( $('.ProfileTemplate').length ||
            $(redesign_profile_selector).length);
            if (redesign_or_new_profile_layout) {
                var redesign_css_file = chrome.runtime.getURL("/src/redesign.css");
                $(`<link type="text/css" rel="stylesheet" href="${redesign_css_file}">`).appendTo('head');
            }
            var $rr_search_page = $('#rr-search-page');
            if (user_global &&
                    (
                        $('body').hasClass('profile-page') ||
                        redesign_or_new_profile_layout
                    ) ||
                $rr_search_page.length) {
                if (result.show_search_bar || $rr_search_page.length) {
                    initRecon();
                }
            }
            getToken(getToken_success);
        });
    });

    function getChromeStorage(onComplete=function(){}) {
        var storage_keys = {'show_search_bar':true};
        chrome.storage.sync.get(storage_keys, function(result) {
            chrome_storage = result;
            onComplete(result);
        });
    }

    function getToken_success(data) {
        token = data.access_token;
    }

    function initRecon() {
        var divs=`<div id="rrecon">
                <div id="rr-menu"></div>
                <div id="rr-meta"></div>
                <div id="rr-results">
                    <div id="rr-results-header"></div></div>
                </div>`;
        $('#rr-search-page').html(divs);
        $('.menuarea').after(divs);
        $('.ProfilePostList__bar').after(divs);
        $(redesign_profile_selector).prepend(divs);

        $('#rr-menu').load(chrome.runtime.getURL('/src/templates/rr-menu.html'), initComplete);
    }
    function initComplete() {
        $('#rr-logo').attr('src',chrome.runtime.getURL('icons/rr-chrome-icon-128.png'));
        $('#rr-search').click(function(e) {showRemovedComments(); e.preventDefault();});
        $('#deep-search').click(function(e) {runDeepSearch(); e.preventDefault();});
        $('#rr-options-link a').click(function() {
            chrome.runtime.sendMessage({action: "open-options"})});

        var show_m = window.location.href.match(/&show=([^&#]*)/);
        if (show_m && show_m.length > 1 && show_m[1]) {
            ids_to_show = show_m[1].split(',').reduce(function(map, val) {
                                                          map[val] = true;
                                                          return map;
                                                      }, {});
            $('#search-depth').val(1);
            $('#search-order').val('new');
            showRemovedComments();
        } else {
            var matcher = window.location.href.match(/\action=([^&]*)/);
            if (matcher && matcher.length > 1 && matcher[1] == 'autosearch') {
                $('#rr-search').click();
            }

        }


    }


    function runDeepSearch() {
        $('#search-depth').val(1000);
        showRemovedComments();
    }

    function showRemovedComments() {
        var $depth_select = $('#search-depth option:selected');
        search_depth = Number($depth_select.val());
        selected_depth_text = $depth_select.text();
        var numRequests = search_depth*2+1;
        if (numRequests > 21) numRequests = 23;
        num_retrievals_this_search = 0;
        approved_searched = false;
        if (! clicked_search_previously) {
            resetResults();
            $('#rr-results-header').load(chrome.runtime.getURL('/src/templates/rr-results.html'), resultsHeaderComplete);
        }
        num_requests_remaining = numRequests;
        total_num_requests = numRequests;
        clicked_search_previously = true;
        pageSortType = $('#search-order').val();
        pageTimeSpan = $('#search-time').val();

        if (! pageSortType) pageSortType = 'new';
        if (! pageTimeSpan) pageTimeSpan = 'all';

        initBar();
        var after = '';
        if (pageTimeSpan == 'all') {
            after = global_after[pageSortType];
        }
        if (global_after[pageSortType] != null && global_num_children_last_search[pageSortType] > 0) {
            disableSearch();
            $('#no-results').remove();
            lookupCommentsByUser_content(user_global, after);
        } else {
            updateProgress100();
            console.log('failed');
            console.log(global_after[pageSortType]);
            console.log(global_num_children_last_search[pageSortType]);
        }
    }
    function initBar() {
        $('.rr-progressbar').replaceWith('<div class="rr-progressbar"></div>');
        bar = new ProgressBar.Circle('.rr-progressbar', {
          color: '#aaa',
          // This has to be the same size as the maximum width to
          // prevent clipping
          strokeWidth: 4,
          trailWidth: 1,
          easing: 'easeInOut',
          duration: 1400,
          text: {
            autoStyleContainer: false
          },
          from: { color: '#78C4FA', width: 1 },
          to: { color: '#3F9ADE', width: 4 },
          // Set default step function for all animate calls
          step: function(state, circle) {
            circle.path.setAttribute('stroke', state.color);
            circle.path.setAttribute('stroke-width', state.width);
          }
        });
        bar.setText('');
        bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
        bar.text.style.fontSize = '1rem';
    }
    function resetResults() {
        $('.sitetable').remove();
        $('.ProfilePostList__postsList').remove();
        $('.ProfilePostList__pagination').remove();
        $(redesign_remove_selector).remove();
        $('#rr-meta').empty();
        $('#rr-results-header').empty();
        $('.thing.comment').remove();
        $('#no-results').remove();
        $('#progressIndicator').remove();
        $('#NREPause').remove();
        $('#NREFloat').remove();
        queried_ids_base10 = [];
        reddit_data_global_by_id = {};
        pageSortType = '';
        pageTimeSpan = '';
        num_retrievals_this_search = 0;
        clicked_search_previously = false;
        displayedComments = {};
        previous_id = '';
        global_after = {'new': '',
                        'hot': '',
                        'top': '',
                        'controversial': ''};
        global_num_children_last_search = {'new': 1,
                                           'hot': 1,
                                           'top': 1,
                                           'controversial': 1};
        total_num_requests = null;
        num_requests_remaining = 0;
        bar = null;
        approved_searched = false;
    }
    function resultsHeaderComplete() {
        $('#clear-results').click(function(e) {
            resetResults();
            e.preventDefault();
            if (Object.keys(ids_to_show).length) {
                window.location.href = window.location.href.replace(/&show=[^&]*/,'');
            }
        });
    }
    function lookupCommentsByUser_content_success(data) {
        num_requests_remaining = num_requests_remaining - 1;
        if (pageTimeSpan == 'all') {
            // if after becomes null, clicking search again searches everything
            // if after is not null, it is hard to know when there are no more results
            global_after[pageSortType] = data.data.after;
        }
        global_num_children_last_search[pageSortType] = data.data.children.length;
        var comments = data.data.children;
        var after = data.data.after;
        var ids = [];
        for (var i = 0, len = comments.length; i < len; i++) {
            comments[i].data.previous_id = previous_id;
            var id = comments[i].data.id;
            previous_id = 't1_' + id;
            ids.push('t1_' + id);
            reddit_data_global_by_id['t1_'+id] = comments[i].data;
            queried_ids_base10.push(parseInt(id,36));
        }
        lookupCommentsByID_content(ids, comments, after);
    }
    function lookupCommentsByID_content(ids, userComments, after) {
        updateProgress(num_requests_remaining, ((total_num_requests - (num_requests_remaining)) / total_num_requests));
        lookupCommentsByID(ids, token, function(data) {
            num_requests_remaining = num_requests_remaining - 1;
            checkRemoved(data, userComments, after);
        });
    }
    function lookupCommentsByUser_content(user, after) {
        num_retrievals_this_search += 1;

        updateProgress(num_requests_remaining, ((total_num_requests - (num_requests_remaining)) / total_num_requests));
        lookupCommentsByUser(user, after, pageSortType, pageTimeSpan, token, lookupCommentsByUser_content_success);
    }


    function checkRemoved(data, userComments, after) {
        var rinfo_comments = data.data.children;
        var last_comment = null;
        for (var i = 0, len = rinfo_comments.length; i < len; i++) {
            if (rinfo_comments[i].data.body.replace(/\\/g,'') == "[removed]" && rinfo_comments[i].data.author=='[deleted]') {
                var c = userComments[i].data;
                displayCommentIfNotAlreadyShown(c);
                last_comment = c;
            }
        }




        var allComments = getAllComments();
        var numComments = allComments.length;
        showRRMeta(finishFindRemovedComments);

        if (after && num_retrievals_this_search < search_depth) {
            lookupCommentsByUser_content(user_global, after);
        } else {
            console.log(`Found ${numComments} removed comments`);
            var ids_base10 = convert_full_to_base10(allComments);
            updateProgress(1, ((total_num_requests - 1) / total_num_requests));
            if (numComments == 0) noResults();

            queryPushshiftES(ids_base10, finishFindRemovedComments);
        }
    }

    function noResults() {
        var $noRes = $(`<div id="no-results">No results found</div>`);
        if (global_after[pageSortType] && global_num_children_last_search[pageSortType] > 0) {
            $noRes.append(`. Click here to search the next ${selected_depth_text} comments, or click 'deep search' above to search maximum search depth.`);
            $noRes.click(function(e) {showRemovedComments(); e.preventDefault();});
        }
        $('#rr-results').append($noRes);
    }
    function getAllComments() {
        return $("div.thing.comment").map(function(){return $(this).attr("data-fullname");}).get();
    }
    function makeLinks(allComments) {
        var pages_html = '<span>pages: </span>';
        var max=95;
        var page_num = 1;
        var message_user_body = `Dear ${user_global},\n\nThe links below show some of your comments that may have been removed by a moderator or automoderator.\n\n`;
        message_user_body += 'pages: ';
        for (var i = 0; i < allComments.length; i+=max) {
            var commentsFoundForLink = allComments.slice(i, i+max);
            if (commentsFoundForLink.length > 0) {

                var link = 'https://www.reddit.com/api/info?id=' + commentsFoundForLink.join(',');

                var link_html = `<a class="rr-color" href="${link}" target="_blank">${page_num}</a>`;
                var link_md = `[${page_num}](${link})`;

                var suffix = ', ';
                if (i+max >= allComments.length) suffix = '';

                pages_html += link_html+suffix;
                message_user_body += link_md+suffix;
                page_num += 1;
            }
        }
        $('#rr-report-pages').append(pages_html);
        message_user_body += '\n\nOpening these links while logged out or in an incognito/private window will show they have been removed.\n\n';
        message_user_body += 'This report was generated by rRecon, a chrome browser extension that shows removed comments.\n\n ';

        var message_user_link = 'https://www.reddit.com/message/compose?to=' + user_global + '&message=' + encodeURIComponent(message_user_body);
        var message_user_html = `<a class="rr-color" href="${message_user_link}" target="_blank">message ${user_global}</a>`;
        $('#rr-message-user').append(message_user_html);

    }
    function convert_full_to_base10(comments_full) {
        var ids_base10 = [];
        for (var z = 0, len = comments_full.length; z < len; z++) {
            var base36 = comments_full[z].slice(3);
            var base10 = parseInt(base36,36);
            ids_base10.push(base10);
        }

        return ids_base10;
    }

    function queryPushshiftES(ids_base10, finishFunc = function() {}) {
        var query = buildCommentQuery(ids_base10);

        jQuery.ajax({
            dataType: "json",
            url: "https://elastic.pushshift.io/rc/comments/_search",
            data: {
                "source": query
            },
            success: function (data) {
                markModOrAutomodES(data, finishFunc);
            },
            complete: function(e) {},
            error: function(jqXHR, textStatus, errorThrown) {
                showError('error accessing pushshift', '#rr-status');
                updateProgress100();
            }
        });
    }

    function buildCommentQuery(ids) {
        var q = {};
        q.size = 5003; // size param must appear in front of ids
        q.query = {};
        q.query.bool = {};
        q.query.bool.filter = [];
        q._source = ['retrieved_on','created_utc', 'author'];
        q.query.bool.filter.push({
            "terms": {
                "_id": ids
            }
        });
        q.query.bool.filter.push({
            "terms": {
                "author": ['[deleted]']
            }
        });

        return JSON.stringify(q);
    }


    function markModOrAutomodES(data, finishFunc) {
        var pushComments = [];

        $.each(data.hits.hits, function (i, v) {
            v._source.id = v._id;
            pushComments.push(v._source);
        });
        markModOrAutomod(pushComments, finishFunc);
    }
    function markModOrAutomod(pushComments, finishFunc) {
        var removedBy = {};


        //console.log('RESULTS:');
        //console.log(pushComments);

        for (var i = 0, len = pushComments.length; i < len; i++) {
            var c = pushComments[i];
            var retrievalLatency = c.retrieved_on-c.created_utc;
            var id = 't1_'+parseInt(c.id).toString(36);
            if (c.author == '[deleted]') {
                if (retrievalLatency <= 5) {
                    removedBy[id] = 'automod';
                } else {
                    removedBy[id] = 'unknown';
                }
            } else {
                console.log('ERROR: Unexpected author: ['+c.author+']');
            }
        }

        $('div.thing.comment').each(function (i, v) {
            var by = removedBy[v.getAttribute('data-fullname')];
            var byDiv = $(v).find('.removedby')[0];
            if (! byDiv.getAttribute('data-removedby')) {
                if (by) {
                    byDiv.setAttribute('data-removedby',by.toLowerCase()+'-rem');
                    byDiv.innerHTML = '[removed] - '+by;
                    delete removedBy[v.getAttribute('data-fullname')];
                } else if (byDiv) {
                    byDiv.setAttribute('data-removedby','mod-rem');
                    byDiv.innerHTML = '[removed] - mod';
                }
            }
        });

        var extra_ids = Object.keys(removedBy);

        for (var i2 = 0, len2 = extra_ids.length; i2 < len2; i2++) {
            var id2 = extra_ids[i2];
            var redditComment = reddit_data_global_by_id[id2];
            //noinspection JSJQueryEfficiency
            var commentNode = $('.thing.comment[data-fullname="'+id2+'"]')[0];
            if (redditComment) {
                if (removedBy[id2] == 'automod' && ! commentNode) {
                    commentNode = displayCommentIfNotAlreadyShown(
                                      redditComment, {'id': 'automod-rem-mod-app',
                                                      'text': '[approved] - automod removed, manually approved'});
                }
            } else {
                console.log('ERROR: Missing reddit comment: '+id2);
            }
        }

        var $wrapper = $('#rr-results');
        // Note: If the prefix to appendTo is a selected element, that element is moved, not cloned
        if (pageSortType == 'new') {
            $wrapper.find('.thing.comment').sort(function(a, b) {
                return +b.getAttribute('data-created_utc') - +a.getAttribute('data-created_utc');
            }).appendTo($wrapper);
        }
        updateProgress100();
        showRRMeta(finishFunc);

        enableSearch();

    }
    function updateProgress(text,percent) {
        bar.setText(text);
        bar.animate(percent);
    }
    function updateProgress100() {
        bar.setText('0');
        bar.animate(1.0);
        $('.rr-progressbar').delay(2400).fadeTo(400, 0);
    }
    function disableSearch() {
        $('#rr-search').attr('disabled',true);
        $('#deep-search').off('click');
    }
    function enableSearch() {
        $('#rr-search').attr('disabled', false);
        $('#deep-search').click(function(e) {runDeepSearch(); e.preventDefault();});
    }
    function showRRMeta(finishFunc) {
        var $rr_meta = $('#rr-meta');
        $rr_meta.empty();
        var metaComplete = function (thisFunc) {
            return function() {
                let id_to_text = {
                    'mod-rem': 'moderator',
                    'automod-rem': 'automoderator',
                    'unknown-rem': 'unknown',
                    'automod-rem-mod-app': 'automoderator - manually approved'
                };
                fillInSelect('#rr-filter-removedby', '.removedby', 'data-removedby', id_to_text);
                fillInSelect('#rr-filter-subreddit', '.thing.comment', 'data-subreddit', {});
                $('.rr-filter').change(selectionChange);
                $('.thing.comment').show();
                thisFunc();
            }
        };
        $rr_meta.load(chrome.runtime.getURL('/src/templates/rr-meta.html'), metaComplete(finishFunc));
    }

    function fillInSelect(select_selector, item_selector, attribute, id_to_text) {
        var types = {};
        if (id_to_text) {
            for (var k in id_to_text) {
                var initCount = '0';
                if (k == 'automod-rem-mod-app' && ! approved_searched) initCount = '?';
                types[k] = {'text': id_to_text[k] + ' ('+initCount+')', 'count': 0, 'id': k};
            }
        }
        $(item_selector).each(function() {
            var id = this.getAttribute(attribute);
            if (id) {
                var exist = types[id];
                var count = 1;
                if (exist) { count = exist.count + 1 }
                var text = id;
                if (! $.isEmptyObject(id_to_text)) {
                    text = id_to_text[id];
                }
                if (! approved_searched && id == 'automod-rem-mod-app') {
                    count = '?';
                }
                types[id] = {text: text + ' ('+count+')',
                             count: count,
                             id: id}
            }
        });
        var $select = $(select_selector);

        $.each(Object.values(types).sort(filterSort), function(index, val) {
            $select.append(
                $('<option></option>').val(val.id).text(val.text)
            );
        });
        return $select;
    }

    function filterSort(a,b) {
        var res = b.count - a.count;
        if (res != 0) return res;
        if (a.id.toLowerCase() > b.id.toLowerCase()) { return 1;}
        else if (a.id.toLowerCase() < b.id.toLowerCase()) {return -1;}
        return 0;
    }
    function selectionChange() {
        var $selected_rem_option = $('#rr-filter-removedby option:selected');
        if ($selected_rem_option.val() == 'automod-rem-mod-app' &&
            $selected_rem_option.text().match(/\?/)) {
            approved_searched = true;
            showApprovedComments();
        } else {
            filterComments();
        }

    }
    function filterComments() {
        var selected_sub_val = $('#rr-filter-subreddit').val();
        var selected_rem_val = $('#rr-filter-removedby').val();

        $('.thing.comment').each(function() {
            var this_sub_val = this.getAttribute('data-subreddit');
            var this_rem_val = 'all';
            var this_removedby = $(this).find('.removedby');
            if (this_removedby && this_removedby[0]) {
                this_rem_val = this_removedby[0].getAttribute('data-removedby');
            }
            if ( (selected_sub_val == 'all' || selected_sub_val == this_sub_val) &&
                 (selected_rem_val == 'all' || selected_rem_val == this_rem_val) ) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    function finishFindRemovedComments() {
        var allComments = getAllComments();
        var numComments = allComments.length;
        if (numComments > 0) {
            makeLinks(allComments);
        }
    }

    function showApprovedComments() {
        bar.set(0.5);
        $('.rr-progressbar').css('opacity', 1);
        console.log('querying pushshift '+queried_ids_base10.length+' ids');
        queryPushshiftES(queried_ids_base10, finishShowApprovedComments);
    }
    function finishShowApprovedComments() {
        queried_ids_base10.length = 0;
        var numFound = $('[data-removedby="automod-rem-mod-app"]').length;
        var cText = 'comment';
        if (numFound != 1) cText += 's';
        console.log(`${numFound} reapproved ${cText} found`);
        makeLinks(getAllComments());
        if (numFound > 0) {
            var $removed_filter = $('#rr-filter-removedby');
            $removed_filter.val('automod-rem-mod-app');
            $removed_filter.change();
        }
        updateProgress100();
    }
    function nthIndex(str, pat, n){
        var L= str.length, i= -1;
        while(n-- && i++<L){
            i= str.indexOf(pat, i);
            if (i < 0) break;
        }
        return i;
    }

    function displayCommentIfNotAlreadyShown(c, removedBy={'text': '[removed]', 'id': ''}) {
        if (displayedComments[c.id]) return displayedComments[c.id];
        var reddit = 'https://www.reddit.com';
        var mods_message_body = reddit+c.permalink+'\n\n';
        var mods_link = reddit+'/message/compose?to='+c.subreddit+'&message='+encodeURI(mods_message_body);
        var createdTimeAgo = convertSecondsToReadableTime(Math.floor((new Date).getTime()/1000)-c.created_utc)+' ago';
        var createdDate = new Date(0);
        createdDate.setUTCSeconds(c.created_utc);
        var parent_link = '';
        var slash_index = nthIndex(c.permalink,'/',6);
        var permalink_front = c.permalink.slice(0,slash_index+1);
        var submitter = '';
        if (c.link_author == c.author) {
            submitter='submitter';
        }

        if (c.parent_id != c.link_id) {
            var parent_id = c.parent_id.slice(3);
            parent_link = permalink_front+parent_id+'/';
        } else {
            parent_link = permalink_front;
        }
        var comment_html = `
<div class="thing comment rr-removed noncollapsed id-${c.name}" data-fullname="${c.name}" data-created_utc="${c.created_utc}" data-author="${c.author}" data-subreddit="${c.subreddit}">
<p class="parent">
    <a href="${c.link_url}" class="title" rel="nofollow">${c.link_title}</a>
    by  <a href="${reddit}/user/${c.link_author}" class="sub-author ">${c.link_author}</a>
    in  <a href="${reddit}/r/${c.subreddit}/" class="subreddit">${c.subreddit}</a><br>
</p>
<div class="entry" data-subreddit="${c.subreddit}">
    <p class="tagline">
        <a href="${reddit}/user/${c.author}" class="author ${submitter} may-blank">${c.author}</a>
        <span class="userattrs">
        </span>
        <span class="score">${c.score} points</span>
        <time title="${createdDate}" datetime="${createdDate}" class="live-timestamp timeago">${createdTimeAgo}</time>
        <span class="removedby" data-removedby="${removedBy.id}">${removedBy.text}</span>
    </p>
    <form class="usertext">
        <div class="usertext-body">
        `+$.parseHTML(c.body_html)[0].textContent+`
        </div>
    </form>
    <ul class="flat-list buttons">
        <li class="first">
            <a href="${reddit}${c.permalink}" class="bylink" rel="nofollow" target="_blank">permalink</a>
        </li>
        <li>
            <a href="https://old.reddit.com/user/${c.author}/comments?after=${c.previous_id}&limit=1" class="bylink" rel="nofollow" target="_blank">sharelink</a>
        </li>
        <li>
            <a href="${reddit}${parent_link}" class="bylink" rel="nofollow"  target="_blank">parent</a>
        </li>
        <li>
            <a href="${reddit}${c.permalink}?context=3" class="bylink" rel="nofollow"  target="_blank">context</a>
        </li>
        <li>
            <a href="${c.link_permalink}" class="bylink" rel="nofollow"  target="_blank">full comments (${c.num_comments})</a>
        </li>
        <li>
            <a href="${mods_link}" class="bylink" rel="nofollow"  target="_blank">message mods</a>
        </li>
    </ul>
</div>
</div>
`;
        var $thisComment;

        if (Object.keys(ids_to_show).length) {
            if (ids_to_show['t1_'+c.id]) {
                $thisComment = $(comment_html).appendTo('#rr-results');
            }
        } else {
            $thisComment = $(comment_html).appendTo('#rr-results');
        }
        displayedComments[c.id] = $thisComment;
        return $thisComment;
    }

    function convertSecondsToReadableTime(seconds) {
        var thresholds = [[60, 'second', 'seconds'], [60, 'minute', 'minutes'], [24, 'hour', 'hours'], [7, 'day', 'days'],
                         [365/12/7, 'week', 'weeks'], [12, 'month', 'months'], [10, 'year', 'years'],
                         [10, 'decade', 'decades'], [10, 'century', 'centuries'], [10, 'millenium', 'millenia']];
        if (seconds < 60) return seconds + ' seconds';
        var time = seconds;
        for (var i=0; i<thresholds.length; i++) {
            var divisor = thresholds[i][0];
            var text = thresholds[i][1];
            var textPlural = thresholds[i][2];
            if (time < divisor) {
                var extra = (time - Math.floor(time));
                var prevUnitTime = Math.round(extra*thresholds[i-1][0]);
                if (Math.floor(time) > 1 || Math.floor(time) == 0) {
                    text = textPlural;
                }
                if (i > 1 && prevUnitTime > 0) {
                    var remainText = thresholds[i-1][1];
                    if (prevUnitTime > 1) {
                        remainText = thresholds[i-1][2];
                    }
                    text += ', ' + String(prevUnitTime) + ' ' + remainText;
                }
                return String(Math.floor(time)) + ' ' + text;
            }
            time = time / divisor;
        }
    }



})();
