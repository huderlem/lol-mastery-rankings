
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
    var championId = getUrlParameter('id');
    if (championId) {
        $('#champion-select').val(championId);
        $('#champion-select').trigger('change');
    }
});

// Lookup rankings data for champion when the selected champion changes.
$('#champion-select').change(function() {
    var championId = $(this).val();
    var championName =  $("#champion-select option:selected").text();
    if (championId < 1) return;

    $('#summoner-ranks').empty();
    $('#summoner-ranks').append(
        '<p>Looking up top champion rankings for ' + championName + '...</p>'
    );

    // Fetch summoner's ranking data asynchronously.
    $.getJSON('api/championranks/' + $(this).val(), function(data) {
        if ($.isEmptyObject(data)) {
            $('#summoner-ranks').html(
                '<p>Error: No data found for ' + championName + '...</p>'
            );
            return;
        }

        // Build table from the top champion scores data.
        var rows = [];
        var rowHTML;
        var iconUrl;
        $.each(data, function(index, summonerScore) {
            rowHTML = '<tr>' + 
                        '<td class="vert-align">' + (index + 1) + '.</td>' +
                        '<td class="vert-align"><a href="/?name=' + summonerScore.name + '">' + summonerScore.name + '</a></td>' +
                        '<td class="vert-align">' + summonerScore.score + '</td>' +
                      '</tr>';
            rows.push(rowHTML);
            iconUrl = summonerScore.champion_icon;
        });

        var tableHTML = '<table id="summoner-rankings-table" class="table table-bordered tablesorter">' +
                          '<thead>' +
                            '<tr>' +
                              '<th>Rank <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                              '<th>Summoner <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                              '<th>Mastery Score <i class="fa fa-sort" aria-hidden="true"></i></th>' +
                            '</tr>' +
                          '</thead>' +
                          '<tbody>' +
                            rows.join("") +
                          '</tbody>' +
                        '</table>';
        $('#summoner-ranks').empty();
        $('#summoner-ranks').append('<h2><img src="' + iconUrl + '"> ' + championName + ' Top Mastery Scores</h2>');
        $('#summoner-ranks').append(tableHTML);

        $('#summoner-rankings-table').tablesorter({sortList: [[0,0]]});
    });
});
