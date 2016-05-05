/**
 * Created by achemichev on 23.12.2015.
 */

/**
 *
 * main.js
 * for testin ./achemichevfilterR2.js filter
 *
 * Created by achemichev on 11.12.2015.
 */

'use strict';

var messages;
var rules;

var fs = require('fs');
var folderCases = 'cases';
var folderResp = 'resp';

var caseResult;

fs.readdirSync(folderCases).forEach(function (f) {

    var full = folderCases + '/' + f;
    try {
        fs.unlinkSync(full);
    } catch (err) {
    }

    full = folderResp + '/' + f;
    try {
        fs.unlinkSync(full);
    } catch (err) {
    }

});


function post(caseName) {
    var http = require('http');

    var body = JSON.stringify({
        messages: messages,
        rules: rules
    });

    var request = new http.ClientRequest({
        hostname: "hola.org",
        port: 80,
        path: "/challenge_mail_filter/reference",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
        }
    });

    request.end(body);

    request.on('response', function (response) {
        console.log('STATUS: ');
        console.log(response.statusCode);
        console.log();
        //console.log('HEADERS: ' + JSON.stringify(response.headers));
        response.setEncoding('utf8');
        var fs = require('fs');
        var f = '../resp/' + caseName + '.json';
        response.on('data', function (chunk) {
            console.log('BODY: ');
            console.log(chunk);
            console.log();
            fs.writeFile(f, chunk, function (err) {
                if (err) {
                    console.log(err);
                    console.log();
                    return;
                }
                console.log(f + ' chunk was saved');
                console.log();
            });
        });
    });

} // post()

function runTestCase(caseName) {
    console.log((new Array(80).join('-')));
    console.log();
    console.log(caseName + ':');
    console.log();

    console.log('Messages:');
    console.log(messages);
    console.log();

    console.log('Rules:');
    console.log(rules);
    console.log();

    /*
     post(caseName);

     for (var n = 0; n < 200000; n++)
     for (var m = 0; m < 200000; m++)
     ;
     */

    var messages_clone = JSON.parse(JSON.stringify(messages));
    var rules_clone = JSON.parse(JSON.stringify(rules));
    caseResult = require("./achemichevfilterR2.js").filter(messages_clone, rules_clone);
    console.log('Filter:');
    console.log(caseResult);
    console.log();

    var fs = require('fs');
    var f = 'cases/' + caseName + '.json';
    fs.writeFile(f, JSON.stringify(caseResult), function (err) {
        if (err) {
            console.log(err);
            console.log();
            return;
        }
        console.log(f + ' was saved');
        console.log();
    });

    var body = JSON.stringify({
        messages: messages,
        rules: rules
    });

    var f = 'body/' + caseName + '.js';
    fs.writeFile(f,"   var http = require('http');"+
"   var request = new http.ClientRequest({"+
"       hostname: 'hola.org',"+
"       port: 80,"+
"       path: '/challenge_mail_filter/reference',"+
"       method: 'POST',"+
"       headers: {"+
"           'Content-Type': 'application/json',"+
"           'Content-Length': Buffer.byteLength('"+body+"')"+
"       }"+
"   });"+
"   request.end('"+
        body
        +"');"+
"   request.on('response', function (response) {"+
"       console.log('STATUS: ');"+
"       console.log(response.statusCode);"+
"       console.log();"+
"       response.setEncoding('utf8');"+
"       var fs = require('fs');"+
"       var f = '../resp/' + '"+caseName+"' + '.json';"+
"       response.on('data', function (chunk) {"+
"           console.log('BODY: ');"+
"           console.log(chunk);"+
"           console.log();"+
"           fs.writeFile(f, chunk, function (err) {"+
"               if (err) {"+
"                   console.log(err);"+
"                   console.log();"+
"                   return;"+
"               }"+
"               console.log(f + ' chunk was saved');"+
"               console.log();"+
"           });"+
"       });"+
"   });", function (err) {
        if (err) {
            console.log(err);
            console.log();
            return;
        }
        console.log(f + ' was saved');
        console.log();
    });


    console.log('RulesModified?:');
    console.log(rules);
    console.log();

} // runTestCase()

var Dobbs = [
// Cases with repeating character sequences.
    ["abcccd", "*ccd", true],
    ["mississipissippi", "*issip*ss*", true],
    ["xxxx*zzzzzzzzy*f", "xxxx*zzy*fffff", false],
    ["xxxx*zzzzzzzzy*f", "xxx*zzy*f", true],
    ["xxxxzzzzzzzzyf", "xxxx*zzy*fffff", false],
    ["xxxxzzzzzzzzyf", "xxxx*zzy*f", true],
    ["xyxyxyzyxyz", "xy*z*xyz", true],
    ["mississippi", "*sip*", true],
    ["xyxyxyxyz", "xy*xyz", true],
    ["mississippi", "mi*sip*", true],
    ["ababac", "*abac*", true],
    ["ababac", "*abac*", true],
    ["aaazz", "a*zz*", true],
    ["a12b12", "*12*23", false],
    ["a12b12", "a12b", false],
    ["a12b12", "*12*12*", true],

    // Additional cases where the '*' char appears in the tame string.
    ["*", "*", true],
    ["a*abab", "a*b", true],
    ["a*r", "a*", true],
    ["a*ar", "a*aar", false],

    // More double wildcard scenarios.
    ["XYXYXYZYXYz", "XY*Z*XYz", true],
    ["missisSIPpi", "*SIP*", true],
    ["mississipPI", "*issip*PI", true],
    ["xyxyxyxyz", "xy*xyz", true],
    ["miSsissippi", "mi*sip*", true],
    ["miSsissippi", "mi*Sip*", false],
    ["abAbac", "*Abac*", true],
    ["abAbac", "*Abac*", true],
    ["aAazz", "a*zz*", true],
    ["A12b12", "*12*23", false],
    ["a12B12", "*12*12*", true],
    ["oWn", "*oWn*", true],

    // Completely tame [no wildcards] cases.
    ["bLah", "bLah", true],
    ["bLah", "bLaH", false],

    // Simple mixed wildcard tests suggested by IBMer Marlin Deckert.
    ["a", "*?", true],
    ["ab", "*?", true],
    ["abc", "*?", true],

    // More mixed wildcard tests including coverage for false positives.
    ["a", "??", false],
    ["ab", "?*?", true],
    ["ab", "*?*?*", true],
    ["abc", "?**?*?", true],
    ["abc", "?**?*&?", false],
    ["abcd", "?b*??", true],
    ["abcd", "?a*??", false],
    ["abcd", "?**?c?", true],
    ["abcd", "?**?d?", false],
    ["abcde", "?*b*?*d*?", true],

    // Single-character-match cases.
    ["bLah", "bL?h", true],
    ["bLaaa", "bLa?", false],
    ["bLah", "bLa?", true],
    ["bLaH", "?Lah", false],
    ["bLaH", "?LaH", true],

    // Many-wildcard scenarios.
    ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab",
        "a*a*a*a*a*a*aa*aaa*a*a*b", true],
    ["abababababababababababababababababababaacacacacacacacadaeafagahaiajakalaaaaaaaaaaaaaaaaaffafagaagggagaaaaaaaab",
        "*a*b*ba*ca*a*aa*aaa*fa*ga*b*", true],
    ["abababababababababababababababababababaacacacacacacacadaeafagahaiajakalaaaaaaaaaaaaaaaaaffafagaagggagaaaaaaaab",
        "*a*b*ba*ca*a*x*aaa*fa*ga*b*", false],
    ["abababababababababababababababababababaacacacacacacacadaeafagahaiajakalaaaaaaaaaaaaaaaaaffafagaagggagaaaaaaaab",
        "*a*b*ba*ca*aaaa*fa*ga*gggg*b*", false],
    ["abababababababababababababababababababaacacacacacacacadaeafagahaiajakalaaaaaaaaaaaaaaaaaffafagaagggagaaaaaaaab",
        "*a*b*ba*ca*aaaa*fa*ga*ggg*b*", true],
    ["aaabbaabbaab", "*aabbaa*a*", true],
    ["a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*",
        "a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*", true],
    ["aaaaaaaaaaaaaaaaa",
        "*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*", true],
    ["aaaaaaaaaaaaaaaa",
        "*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*", false],
    ["abc*abcd*abcde*abcdef*abcdefg*abcdefgh*abcdefghi*abcdefghij*abcdefghijk*abcdefghijkl*abcdefghijklm*abcdefghijklmn",
        "abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*a            bc*", false],
    ["abc*abcd*abcde*abcdef*abcdefg*abcdefgh*abcdefghi*abcdefghij*abcdefghijk*abcdefghijkl*abcdefghijklm*abcdefghijklmn",
        "abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*", true],
    ["abc*abcd*abcd*abc*abcd", "abc*abc*abc*abc*abc",
        false],
    ["abc*abcd*abcd*abc*abcd*abcd*abc*abcd*abc*abc*abcd", "abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abcd", true],
    ["abc", "********a********b********c********", true],
    ["********a********b********c********", "abc",
        false],
    ["abc", "********a********b********b********",
        false],
    ["*abc*", "***a*b*c***", true],
    ["abc", "abcdef", false],
    ["abcdef", "abc", false]

];


/******************************************************************************/
for (var i = 0; i < Dobbs.length; i++) {
    messages = {
        msg1: {from: Dobbs[i][0], to: 'a'}
    };
    rules = [
        {from: Dobbs[i][1], action: Dobbs[i][2].toString()}
    ];
    if (i === 2)
        var stopdubughere = 1;
    runTestCase('case' + (100 + i));
    var returned = caseResult.msg1[0];
    if (returned === "false") // !!!
        throw 'Dobbs failed (true/false)'
    if (returned === undefined) returned = "false";
    var expected = Dobbs[i][2].toString();
    if (returned !== expected)
        throw 'Dobbs failed';
}
/******************************************************************************/
