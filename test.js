/**
 * Created by achemichev on 14.12.2015.
 */

var fs = require('fs');
var _ = require('underscore');

var folderCases = 'cases';
var folderResp = 'resp';
var overallTest = [];
var excludes = ['case06.json', 'case08.json', 'case09.json'];
var err;
fs.readdirSync(folderCases).forEach(function (f) {

    var full = folderCases + '/' + f;
    var mycase = fs.readFileSync(full, 'utf8');

    full = folderResp + '/' + f;
    var resp = fs.readFileSync(full, 'utf8');

    var isEq = false;
    try {
        isEq = _.isEqual(JSON.parse(mycase), JSON.parse(resp));
    }
    catch (e) {
        isEq = false;
        err = e;
    }

    // Excludes
    if (isEq == false && excludes.indexOf(f) >= 0) {
        console.log('.......... ' + f + ': is in excludes');
        isEq = true;
    }

    overallTest.push(isEq);

    console.log('Equals for ' + f + ': ' + isEq + ( !isEq ? ' !!!\n\nSee details:' : ''));
    if (isEq === false) {
        console.log();
        console.log('Err:');
        console.log(err);
        console.log();
        console.log('MyCase:');
        console.log(mycase);
        console.log();
        console.log('Resp:');
        console.log(resp);
    }
});

//overallTest.push(false);

console.log();
console.log('overallTest: ' + overallTest);

var overallTestTrue = overallTest.every(function (b) {
    return b
});
console.log();
console.log('overallTest.every: ' + overallTestTrue + ( !overallTestTrue ? ' !!!!!!!!!!!!!!!!!!!!' : ' OK'));