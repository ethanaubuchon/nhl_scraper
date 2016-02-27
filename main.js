var scraper = require('./scraper');

var action = process.argv[2];

var args = process.argv.slice(3);
var outfileIndex = args.indexOf('-o');
outfileIndex = (outfileIndex < 0) ? args.indexOf('--outfile') : outfileIndex;

if (outfileIndex >= 0) {
    var outfile = args[outfileIndex + 1];
}

var paramIndex = args.indexOf('-p');
paramIndex = (paramIndex < 0) ? args.indexOf('--param') : paramIndex;
if (paramIndex >= 0)
    var extraParam = args[paramIndex + 1];

switch (action) {
case 'teams':
    if (outfile) {
        scraper.getTeams(outfile);
    } else {
        scraper.getTeams().then(JSON.stringify).then(console.log);
    }
    break;
case 'schedule':
    if (outfile) {
        scraper.getGames(outfile, 0);
    } else {
        scraper.getGames(null, 0).then(JSON.stringify).then(console.log);
    }
    break;
case 'unplayed':
    if (outfile) {
        scraper.getGames(outfile, 1);
    } else {
        scraper.getGames(null, 1).then(JSON.stringify).then(console.log);
    }
    break;
case 'scores':
    if (outfile) {
        scraper.getGames(outfile, 2);
    } else {
        scraper.getGames(null, 2).then(JSON.stringify).then(console.log);
    }
    break;
case 'playerlog':
    if (outfile && extraParam) {
        scraper.getPlayerGameLog(outfile, extraParam);
    } else if (extraParam) {
        scraper.getPlayerGameLog(null, extraParam).then(JSON.stringify).then(console.log);
    }
    break;
case 'teamlog':
    if (outfile) {
        scraper.getTeamLog(outfile, extraParam);
    } else {
        scraper.getTeamLog(null, extraParam).then(JSON.stringify).then(console.log);
    }
    break;
default:
    console.log('Invalid command');
}