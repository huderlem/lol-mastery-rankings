var config = require('config');
var riotAPI = require('riot-api-client')(config.get('riot-api-client'));
var mysql = require('mysql');
var cron = require('cron').CronJob;
var express = require('express');
var app = express();
app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));

// Riot API urls
var DDRAGON_STATIC_DATA_URL  = 'http://ddragon.leagueoflegends.com/cdn/{0}/';
var VERSIONS_ENDPOINT        = 'https://global.api.pvp.net/api/lol/static-data/na/v1.2/versions';
var CHAMPION_ENDPOINT        = 'https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion';
var CHAMPIONMASTERY_ENDPOINT = 'https://na.api.pvp.net/championmastery/location/na1/player/{0}/champions';
var SUMMONER_ENDPOINT        = 'https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/{0}';
var champions = {};
var sortedChampions = [];

var connectionPool = mysql.createPool(config.get('mysql'));
initializeApp();

// We need to periodically initialize the app, in case a new League patch comes out, for example.
// This cron pattern means "run at the start of every hour".
var initializeJob = new cron({
    cronTime: '0 * * * *',
    onTick: function() {
        console.log('Re-initializing app...');
        initializeApp();
    },
    start: true
});
initializeJob.start();

// Express endpoints
app.get('/', function(req, res) {
    res.render('index');
});

app.get('/champions', function(req, res) {
    res.render('champions', {'champions': sortedChampions});
});

app.get('/about', function(req, res) {
    res.render('about');
});

app.get('/api/summonerranks/:name', function(req, res) {
    saveChampionMasteriesForSummonerName(res, [req.params.name], function() {
        getChampionRanksForSummonerName(res, req.params.name);
    });
});

app.get('/api/populatesummonerbyname/:name', function(req, res) {
    saveChampionMasteriesForSummonerName(res, req.params.name, function() {
        res.send({
            success: true
        })
    });
});

app.get('/api/populatesummonerbyid/:id', function(req, res) {
    saveChampionMasteriesForSummonerId(res, req.params.id, function() {
        res.send({
            success: true
        });
    });
});

app.get('/api/championranks/:id', function(req, res) {
    getChampionRanksById(res, req.params.id);
});

app.listen(3000, function() {
    console.log('App listening...');
});

String.format = function() {
    // The string containing the format items (e.g. "{0}")
    // will and always has to be the first argument.
    var theString = arguments[0];

    // start with the second argument (i = 1)
    for (var i = 1; i < arguments.length; i++) {
        // "gm" = RegEx options for Global search (more than one instance)
        // and for Multiline search
        var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
        theString = theString.replace(regEx, arguments[i]);
    }

    return theString;
}

function initializeApp() {
    // Get LoL's current patch version.
    riotAPI.get(VERSIONS_ENDPOINT, function(err, versionData) {
        if (err) {
            console.log(err);
            return;
        }

        var version = versionData[0];

        // Get champion data for the current patch.
        var championUrl = String.format(CHAMPION_ENDPOINT + '?version={0}&dataById=true', version);
        riotAPI.get(championUrl, function(err, championData) {
            if (err) {
                console.log(err);
                return;
            }

            champions = championData.data;
            sortedChampions = [];

            // Save the urls for the champion images.
            for (var championId in champions) {
                var iconUrl = DDRAGON_STATIC_DATA_URL + 'img/champion/' + champions[championId].key + '.png';
                champions[championId].champIconUrl = String.format(iconUrl, version);

                sortedChampions.push(champions[championId]);
            }

            sortedChampions.sort(function(a, b) {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });
        });
    });
};

/**
 * Gets the champion mastery rankings for the given summoner name.
 * Responds with json.
 * @param int summonerId
 */
function getChampionRanksForSummonerName(res, summonerName) {
    connectionPool.getConnection(function(err, connection) {
        if (err) {
            console.log(err);
            connection.release();
            res.send({});
            return;
        }

        var query = "SELECT summoners.id FROM summoners WHERE summoners.name LIKE '" + summonerName + "'";
        connection.query(query, function(err, result) {
            connection.release();
            if (err) {
                console.log(err);
                console.log('Error getting champion ranks for summoner\nQuery:\n' + query);
                res.send({});
                return;
            }

            if (result.length < 1) {
                res.send({});
                return;
            }

            var summonerId = result[0].id;
            getChampionRanksForSummonerId(res, summonerId);
       })
    });
}

/**
 * Gets the champion mastery rankings for the given summoner id.
 * Responds with json.
 * @param int summonerId
 */
function getChampionRanksForSummonerId(res, summonerId) {
    connectionPool.getConnection(function(err, connection) {
        if (err) {
            console.log(err);
            connection.release();
            res.send({});
            return;
        }

        var sproc = 'CALL get_summoner_champion_ranks(' + summonerId + ')';
        connection.query(sproc, function(err, result) {
            connection.release();
            if (err) {
                console.log(err);
                console.log('Error getting champion ranks for summoner\nQuery:\n' + sproc);
                res.send({});
                return;
            }

            // Augment the raw data with the human-friendly static champion content.
            var rankingsData = result[0];
            for (var i = 0; i < rankingsData.length; i++) {
                var data = rankingsData[i];
                data.champion_name = champions[data.champion_id].name;
                data.champion_icon = champions[data.champion_id].champIconUrl;
            }

            res.send(rankingsData);
       })
    });
}

/**
 * Gets the top champion mastery scores for the given champion.
 * Responds with json.
 * @param int championId
 */
function getChampionRanksById(res, championId) {
    connectionPool.getConnection(function(err, connection) {
        if (err) {
            console.log(err);
            connection.release();
            res.send({});
            return;
        }

        var sproc = 'CALL get_top_champion_scores(' + championId + ', 20)';
        connection.query(sproc, function(err, result) {
            connection.release();
            if (err) {
                console.log(err);
                console.log('Error getting top champion scores for champion ' + championId + '\nQuery:\n' + sproc);
                res.send({});
                return;
            }

             // Augment the raw data with the human-friendly static champion content.
            var rankingsData = result[0];
            for (var i = 0; i < rankingsData.length; i++) {
                var data = rankingsData[i];
                data.champion_name = champions[championId].name;
                data.champion_icon = champions[championId].champIconUrl;
            }

            res.send(rankingsData);
       })
    });
}

/**
 * Queries Riot API for summoner information, then saves champion mastery data.
 * @param array summonerNames
 */
function saveChampionMasteriesForSummonerName(res, summonerName, callback)
{
    var url = String.format(SUMMONER_ENDPOINT, summonerName);
    riotAPI.get(url, function(err, data) {
        if (err) {
            console.log(err);
            res.send({});
            return;
        }

        var summonerId;

        // Build a query to insert or update the summoner data into the database.
        var insertQuery = 'INSERT INTO summoners (id, name)\n' + 
                    'VALUES\n';
        for (var key in data) {
            var summonerData = data[key];
            summonerId = summonerData.id;
            insertQuery += String.format("    ({0}, '{1}'),\n", summonerData.id, summonerData.name);
        }

        // Strip the trailing comma and newline, since that's invalid mysql syntax.
        insertQuery = insertQuery.slice(0, -2);

        // We want to update existing summoner entries in the database, rather than insert a new row.
        insertQuery += '\nON DUPLICATE KEY UPDATE\n';
        insertQuery += '    name=VALUES(name)';

        // Execute the query against the database to update the data.
        connectionPool.getConnection(function(err, connection) {
            if (err) {
                connection.release();
                console.log(err);
                res.send({});
                return;
            }

            connection.query(insertQuery, function(err, result) {
                connection.release();
                if (err) {
                    console.log(err);
                    console.log('Error inserting summoner data\nQuery:\n' + insertQuery);
                    res.send({});
                    return;
                }

                saveChampionMasteriesForSummonerId(res, summonerId, callback);
           })
        });
    });
}

/**
 * Queries Riot API for summoner champion mastery data.
 * Saves the results into the database.
 * @param int summonerId
 */
function saveChampionMasteriesForSummonerId(res, summonerId, callback) {
    var url = String.format(CHAMPIONMASTERY_ENDPOINT, summonerId);
    riotAPI.get(url, function(err, data) {
        if (err) {
            console.log(err);
            res.send({});
            return;
        }

        insertChampionMasteries(res, data, callback);
    });
}

/**
 * Inserts/updates the champion mastery data into the database.
 * @param data json data for champion mastery data
 */
function insertChampionMasteries(res, data, callback) {
    if (data.length < 1) {
        console.log("No champion mastery data provided to insert...");
        res.send({});
        return;
    }

    // Build a query to insert or update the mastery data into the database.
    var insertQuery = 'INSERT INTO mastery (summoner_id, champion_id, score)\n' + 
                'VALUES\n';
    for (var i = 0; i < data.length; i++) {
        var masteryData = data[i];
        insertQuery += String.format('    ({0}, {1}, {2}),\n', masteryData.playerId, masteryData.championId, masteryData.championPoints);
    }

    // Strip the trailing comma and newline, since that's invalid mysql syntax.
    insertQuery = insertQuery.slice(0, -2);

    // We want to update existing summoner/champion entries in the database, rather than insert a new row.
    insertQuery += '\nON DUPLICATE KEY UPDATE\n';
    insertQuery += '    score=VALUES(score)';

    // Execute the query against the database to update the data.
    connectionPool.getConnection(function(err, connection) {
        if (err) {
            connection.release();
            console.log(err);
            res.send({});
            return;
        }

        connection.query(insertQuery, function(err, result) {
            connection.release();
            if (err) {
                console.log(err);
                console.log('Error inserting champion masteries\nQuery:\n' + insertQuery);
                res.send({});
                return;
            }

            callback();
        })
    });
}