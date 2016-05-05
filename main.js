/**
 *
 * main.js
 * for testin ./achemichevfilter.js filter
 *
 * Created by achemichev on 11.12.2015.
 */

'use strict';

var messages;
var rules;

var fs = require('fs');
var folderCases = 'cases';
var folderResp = 'resp';

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
        var f = 'resp/' + caseName + '.json';
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

    post(caseName);

    for (var n = 0; n < 100000; n++)
        for (var m = 0; m < 100000; m++)
            ;

    var result = require("./achemichevfilter.js").filter(messages, rules);
    console.log('Filter:');
    console.log(result);
    console.log();

    var fs = require('fs');
    var f = 'cases/' + caseName + '.json';
    fs.writeFile(f, JSON.stringify(result), function (err) {
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

/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'},
    msg2: {from: 'noreply@spam.com', to: 'jill@example.org'},
    msg3: {from: 'boss@work.com', to: 'jack@example.com'}
};
rules = [
    {from: '*@work.com', action: 'tag work'},
    {from: '*@spam.com', action: 'tag spam'},
    {from: 'jack@example.com', to: 'jill@example.org', action: 'folder jack'},
    {to: 'jill@example.org', action: 'forward to jill@elsewhere.com'}
];
runTestCase('case01');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'},
    msg2: {from: 'noreply@spam.com', to: 'jill@example.org'},
    msg3: {from: 'boss@work.com', to: 'jack@example.com'},
    msg4: {from: 'jill@example.org', to: 'jack@example.com'}
};
rules = [
    {from: '*@work.c?str', action: 'tag work'},
    {from: '*@spam.com', action: 'tag spam'},
    {from: 'jack@example.com', to: 'jill@example.org', action: 'folder jack'},
    {from: 'jill@example.org', to: 'jack@example.com', action: 'folder jill'},
    {to: 'jill@example.org', action: 'forward to jill@elsewhere.com'}
];
runTestCase('case02');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: 'j*k@e*le.com', to: 'ji?l@e?amp?e?org', action: 'multiple asterisk and question mark'}
];
runTestCase('case03');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: 'jack@example.com', to: 'jill@example.org', action: 'case sensitive ok'},
    {from: 'jack@exaMPLe.com', to: 'jill@ExampLe.org', action: 'case sensitive err'}
];
runTestCase('case04');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {action: 'rule from/to omitted 1'},
    {action: 'rule from/to omitted 2'}
];
runTestCase('case05');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com'},
    msg2: {to: 'jill@example.org'}
};
rules = [
    {action: 'msg from/to omitted 1'},
    {action: 'msg from/to omitted 2'}
];
// runTestCase('case06'); // fails ok
/******************************************************************************/
//^$.*+?=!:|\/()[]{}
messages = {
    msg1: {from: 'j^a$c.k+@!e:x\\a/s(t)r[p]l{e}.com', to: 'j{i}ll@exa(str)ple.or.g'}
};
rules = [
    {from: 'j^a$c.k+@!e:x\\a/s(t)r[p]l{e}.com', to: 'j{i}ll@exa(str)ple.or.g', action: 'special chars case'}
];
runTestCase('case07');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: '', to: 'jill@example.org', action: 'empty string emu'}
];
runTestCase('case08');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: "", to: 'jill@example.org', action: 'empty string emu 2'}
];
runTestCase('case09');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: '*', to: 'jill@example.org', action: 'empty string emu 2'}
];
runTestCase('case10');
//runTestCase('case10B');
/******************************************************************************/
messages = {
    msg1: {from: 'multi1@mail.to;jack@example.com;multi2@mail.to', to: 'multi3@mail.to;jill@example.org;multi4@mail.to'}
};
rules = [
    {from: 'jack@example.com', to: 'jill@example.org', action: 'multiple from to'}
];
runTestCase('case11');
/******************************************************************************/
messages = {
    msg1: {from: 'ja*ABCck@example.com', to: 'ji?ll@example.org'}
};
rules = [
    {from: 'ja*ck@example.com', to: 'ji?ll@example.org', action: 'asterisk and question mark in msg ALLOWED!'}
];
runTestCase('case12');
/******************************************************************************/
messages = {
    msg1: {from: 'jack@example.com', to: 'jill@example.org'}
};
rules = [
    {from: 'jack@example.com', to: 'jill@example.org', action: 'trivial'}
];
runTestCase('case99');
/******************************************************************************/