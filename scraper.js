var cheerio = require("cheerio");
var qioHttp = require('q-io/http');
var fs = require('fs');

var game_url = "http://www.nhl.com/ice/schedulebyseason.htm";
var team_url = "http://www.nhl.com/ice/teams.htm";

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

var gamesToJSON = function ($) {
    var games = [];
    $('#fullPage .contentBlock table.schedTbl tbody').find('tr').each(function(i, r) {
        var cols = $(r).find('td');
        if (cols.length > 1) {
            games.push({
                date: $(cols[0]).find('.skedStartDateSite').text().trim(),
                away_team: $(cols[1]).find('.teamName a')[0].attribs.rel.toLowerCase(),
                home_team: $(cols[2]).find('.teamName a')[0].attribs.rel.toLowerCase(),
                time: $(cols[3]).find('.skedStartTimeEST').text().trim()
            });
        }
    });

    return games;
};

fetchData(game_url)
    .then(objToString)
    .then(cheerio.load)
    .then(gamesToJSON)
    .then(function (data) { writeToFile('games.json', data); })
    .then(null, console.error)
    .done();

fetchData(team_url)
    .then(objToString)
    .then(cheerio.load)
    .then(teamsToJSON)
    .then(function (data) { writeToFile('teams.json', data); })
    .then(null, console.error)
    .done();
