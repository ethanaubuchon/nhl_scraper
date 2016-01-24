var cheerio = require("cheerio");
var qioHttp = require('q-io/http');
var fs = require('fs');
var Q = require('q');

var GAME_URL = "http://www.nhl.com/ice/schedulebyseason.htm";
var TEAM_URL = "http://www.nhl.com/ice/teams.htm";

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

var gamesToJSON = function ($, mode) {
    mode = (mode) ? mode : 0;
    var games = [];
    $('#fullPage .contentBlock table.schedTbl tbody').find('tr').each(function(i, r) {
        var cols = $(r).find('td');
        if (cols.length >= 5 && $(cols[1]).find('.teamName a')[0]) {

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

module.exports.getGames = function(outputFile, mode) {
    return getDataFromURL(GAME_URL, function($) {
        return gamesToJSON($, mode);
    }, outputFile);
};
