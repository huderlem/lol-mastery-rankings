
// Borrowed from http://stackoverflow.com/a/21903119
function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

$(document).ready(function() {
    // Automatically load the champion specified in the url query string parameter.
    var summonerName = getUrlParameter('name');
    if (summonerName) {
        $('#summoner-input').val(summonerName);
        $('#summoner-lookup').trigger('submit');
    }
});

// Lookup rankings data for summoner when the submit button is clicked.
$('#summoner-lookup').submit(function() {
    var summonerName = $('#summoner-input').val();
    if (!summonerName) {
        return false;
    }

    $('#summoner-ranks').empty();
    $('#summoner-ranks').append(
        '<div class="loading text-center"><p>Looking up champion rankings for ' + summonerName + '...</p>' +
        '<img src="img/loading.gif"></div>'
    );

    // Fetch summoner's ranking data asynchronously.
    $.getJSON('api/summonerranks/' + summonerName, function(data) {
        if ($.isEmptyObject(data)) {
            $('#summoner-ranks').html(
                '<p>Error: No data found for ' + summonerName + '...</p>'
            );
            return;
        }

        // Build table from the rankings data.
        var rows = [];
        var rowHTML;
        $.each(data, function(index, championData) {
            rowHTML = '<tr>' + 
                        '<td class="vert-align"><a href="champions?id=' + championData.champion_id + '"><img width=40 height=40 src="' + championData.champion_icon + '"> ' + championData.champion_name + '</a></td>' +
                        '<td class="vert-align">' + championData.rank + '/' + championData.total + ' (' + Math.round(championData.percentile) + '%)</td>' +
                        '<td>' + championData.score + '</td>' +
                      '</tr>';
            rows.push(rowHTML);
        });

        var tableHTML = '<table id="summoner-rankings-table" class="table table-bordered tablesorter">' +
                          '<thead>' +
                            '<tr>' +
                              '<th>Champion <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                              '<th>Rank <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                              '<th>Mastery Score <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                            '</tr>' +
                          '</thead>' +
                          '<tbody>' +
                            rows.join("") +
                          '</tbody>' +
                        '</table>';
        $('#summoner-ranks').empty();
        $('#summoner-ranks').append('<h2>' + summonerName + ' Champion Ranks</h2>');
        $('#summoner-ranks').append(tableHTML);

        $('#summoner-rankings-table').tablesorter({sortList: [[2,1]]});
    });

    return false;
});
