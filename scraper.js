var cheerio = require("cheerio");
var qioHttp = require('q-io/http');
var fs = require('fs');
var Q = require('q');

var GAME_URL = "http://www.nhl.com/ice/schedulebyseason.htm";
var TEAM_URL = "http://www.nhl.com/ice/teams.htm";
var PLAYER_LOG_URL_BASE = "http://www.nhl.com/ice/player.htm?view=log&id=";

// Fetch Game Modes
var ALL_GAMES = 0;
var UNPLAYED_GAMES = 1;
var PLAYED_GAMES = 2;

var fetchData = function (url) {
    return qioHttp.read(url);
};

var objToString = function(obj) {
    return obj.toString();
};

var writeToFile = function (file, data) {
    fs.writeFile(file, JSON.stringify(data), function (err) {
        if (err) return console.log(err);
        console.log(file, "written");
    });
};

var teamsToJSON = function ($) {
    var teams = [];
    $("#realignmentPage .teamContainer").find('.teamCard').each(function (i, card) {
        teams.push({
            short: card.attribs.class.split(' ')[1],
            logo: $(card).find('img.team-logo')[0].attribs.src,
            city: $(card).find('.teamPlace').text().trim().toLowerCase(),
            name: $(card).find('.teamCommon').text().trim().toLowerCase()
        });
    });
    return teams;
};

var playerLogToJSON = function ($) {
    var games = [];
	$('#wideCol .contentBlock table.playerStats').find('tr').each(function (i, r) {
		var cols = $(r).find('td');
		if (cols.length > 1) {
			
			var game = {};
			game.date = $(cols[0]).find('.undMe').text().trim();
			var teams = $(cols[0]).text().trim().split('\n')[2].split(' @ ');
			game.away_team = teams[0];
		    game.home_team = teams[1];
			game.decision = $(cols[1]).text().trim();
			game.goals_against = $(cols[2]).text().trim();
			game.shots_against = $(cols[3]).text().trim();
			game.saves = $(cols[4]).text().trim();
			game.save_percent = $(cols[5]).text().trim();
			game.shutout = $(cols[6]).text().trim();
			game.pim = $(cols[7]).text().trim();
			game.time_on_ice = $(cols[8]).text().trim();
			game.even_strength_goals_against = $(cols[9]).text().trim();
			game.powerplayer_goals_against = $(cols[10]).text().trim();
			game.shorthanded_goals_against = $(cols[11]).text().trim();
		    games.push(game);
		}
	});
	
	return games;  
};

var gamesToJSON = function ($, mode) {
    mode = (mode) ? mode : 0;
    var games = [];
    $('#fullPage .contentBlock table.schedTbl tbody').find('tr').each(function(i, r) {
        var cols = $(r).find('td');
        if (cols.length > 1) {

            var game = {};
            game.date = $(cols[0]).find('.skedStartDateSite').text().trim();
            game.away_team = $(cols[1]).find('.teamName a')[0].attribs.rel.toLowerCase();
            game.home_team = $(cols[2]).find('.teamName a')[0].attribs.rel.toLowerCase();
            game.time = $(cols[3]).find('.skedStartTimeEST').text().trim();

            var tvInfo = $(cols[4]).text().trim().split('\n');

            if (tvInfo.length > 1 && tvInfo[0] == 'FINAL: ' && (mode === 0 || mode === 2)) {
                game.away_score = parseInt(tvInfo[2].match(/(([1-9][0-9]+)|([0-9]))/)[1]);
                game.home_score = parseInt(tvInfo[3].match(/(([1-9][0-9]+)|([0-9]))/)[1]);
                games.push(game);
            } else if (mode === 0 || mode === 1) {
                games.push(game);
            }
        }
    });

    return games;
};

var getDataFromURL = function(url, parseFunction, outputFile) {
    var q = Q.defer();
    fetchData(url)
        .then(objToString)
        .then(cheerio.load)
        .then(parseFunction)
        .then(function (data) {
            if (outputFile) {
                writeToFile(outputFile, data);
            } else {
                return data;
            }
        })
        .then(null, console.error)
        .done(q.resolve, q.reject);
    return q.promise;
}


module.exports.getTeams = function(outputFile) {
    return getDataFromURL(TEAM_URL, teamsToJSON, outputFile);
};

module.exports.getPlayerGameLog = function(outputFile, playerId) {
    return getDataFromURL(PLAYER_LOG_URL_BASE + playerId, function($) {
        return playerLogToJSON($);
    }, outputFile);
};
module.exports.getGames = function(outputFile, mode) {
    return getDataFromURL(GAME_URL, function($) {
        return gamesToJSON($, mode);
    }, outputFile);
};
