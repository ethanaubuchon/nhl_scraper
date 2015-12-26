var cheerio = require("cheerio");
var qioHttp = require('q-io/http');
var util = require('util');
var fs = require('fs');
var Q = require('q');

var GAME_URL = "http://www.nhl.com/ice/schedulebyseason.htm";
var TEAM_URL = "http://www.nhl.com/ice/teams.htm";
var PLAYER_LOG_URL_BASE = "http://www.nhl.com/ice/player.htm?view=log&season=20142015&id=";
var TEAM_LOG_TOKENIZED_URL = "http://%s.nhl.com/club/gamelog.htm?season=20142015&gameType=2";
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

var populateGoalieFromLog = function($, game, cols) {
    game.decision = $(cols[1]).text().trim();
    game.goals_against = $(cols[2]).text().trim();
    game.shots_against = $(cols[3]).text().trim();
    game.saves = $(cols[4]).text().trim();
    game.save_percent = $(cols[5]).text().trim();
    game.shutout = $(cols[6]).text().trim();
    game.pim = $(cols[7]).text().trim();
    game.time_on_ice = $(cols[8]).text().trim();
    game.even_strength_goals_against = $(cols[9]).text().trim();
    game.powerplay_goals_against = $(cols[10]).text().trim();
    game.shorthanded_goals_against = $(cols[11]).text().trim();
};

var populateSkaterFromLog = function($, game, cols) {
    game.goals = $(cols[1]).text().trim();
    game.assists = $(cols[2]).text().trim();
    game.points = $(cols[3]).text().trim();
    game.plus_minus = $(cols[4]).text().trim();
    game.penalty_minutes = $(cols[5]).text().trim();
    game.powerplay_goals = $(cols[6]).text().trim();
    game.shorthanded_goals = $(cols[7]).text().trim();
    game.shots = $(cols[8]).text().trim();
    game.shooting_percent = $(cols[9]).text().trim();
    game.shifts = $(cols[10]).text().trim();
    game.time_on_ice = $(cols[11]).text().trim();
    game.faceoff_percent = $(cols[12]).text().trim();
};
var playerLogToJSON = function ($) {
    var games = [];
    var table = $('#wideCol .contentBlock table.playerStats');
    var firstDataColumnHeader = $($(table.find('thead').find('tr')[0]).find('th')[1]).text().trim();

    table.find('tr').each(function (i, r) {
		var cols = $(r).find('td');
		if (cols.length > 1) {
			
			var game = {};
			game.date = $(cols[0]).find('.undMe').text().trim();
			var teams = $(cols[0]).text().trim().split('\n')[2].split(' @ ');
			game.away_team = teams[0];
		    game.home_team = teams[1];
		    if (firstDataColumnHeader == 'G') {
		        populateSkaterFromLog($, game, cols);
		    } else {
		        populateGoalieFromLog($, game, cols);
		    }
		    games.push(game);
		}
	});
	
	return games;  
};

var teamLogToJSON = function ($) {
    var games = [];
    $('#twoColSpan .tieUpWrap .tieUp table.data').find('tr.rwEven,.rwOdd').each(function (i, r) {
        var cols = $(r).find('td');
        if (cols.length > 1) {
            
            var game = {};
            var index = 0;
            var dateColumn = $(cols[index++]);
            game.date = dateColumn.find('.undMe').text().trim();
            game.recap_url = dateColumn.find('a')[0].attribs.href;
            index++; //Video link
            game.isHome = $(cols[index++]).text().trim() === "H";
            game.decision = $(cols[index++]).text().trim();
            index++; //OT decision
            game.opponent = $(cols[index++]).text().trim();
            game.record = $(cols[index++]).text().trim();
            game.goals = $(cols[index++]).text().trim();
            game.goals_against = $(cols[index++]).text().trim();
            game.powerplay_goals = $(cols[index++]).text().trim();
            game.powerplay_opportunities = $(cols[index++]).text().trim();
            game.powerplay_goals_against = $(cols[index++]).text().trim();
            game.powerplay_opportunities_against = $(cols[index++]).text().trim();
            game.shorthanded_goals = $(cols[index++]).text().trim();
            game.shorthanded_goals_against = $(cols[index++]).text().trim();
            game.shots = $(cols[index++]).text().trim();
            game.shots_against = $(cols[index++]).text().trim();
           
      
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

module.exports.getTeamLog = function (outputFile, team) {
    if (team) {
        return getDataFromURL(util.format(TEAM_LOG_TOKENIZED_URL, team), function($) { return teamLogToJSON($); }, outputFile);
    } else {
        var teamPromise = module.exports.getTeams(null);
        var results = [];
        teamPromise.then(function(teams) {
            Q.all(teams.map(function(team) {
                    return getDataFromURL(util.format(TEAM_LOG_TOKENIZED_URL, team.name.replace(/\s+/g, "")), function($) {
                        var log = teamLogToJSON($);
                        results.push({ team: team, gameLog: log });
                    }, null);
                }))
                .then(function() {
                    if (outputFile) {
                        writeToFile(outputFile, results);
                    } else {
                        return results;
                    }
                });
        });                              
        return teamPromise;
    }
};

module.exports.getGames = function(outputFile, mode) {
    return getDataFromURL(GAME_URL, function($) {
        return gamesToJSON($, mode);
    }, outputFile);
};
