/**
 * Created by achemichev on 17.12.2015.
 */

'use strict';

var messages = {};
var rules = [];

var nm = 3000;
var nr = 6000;
var i, k;
var nrepeat = 3;

var msgid;
var msgid_s = 'msg';

var from_;
var from_s = 'fromaddr';

var to_;
var to_s = 'toaddr';

var act_;
var act_s = 'act';

var not_match_s = 'NOT_MATCH';

var r = 4;
var mod_n = 4;

function resetInputs() {
    for (k = 0; k < nm; k++) {
        i = k; // i = k % Math.floor(nm/nrepeat);
        msgid = Array(r + 1).join(msgid_s + i);
        from_ = Array(r + 1).join(from_s + i);
        to_ = Array(r + 1).join(to_s + i);
        messages[msgid] = {from: from_, to: to_};
    }
    for (k = 0; k < nr; k++) {
        i = k % Math.floor(nm / nrepeat); // nr?
        from_ = Array(r + 1).join(from_s + i);
        from_ = from_.replace(/\d+/g, '*');
        from_ = from_.replace(/m/g, '?');
        if ((i % mod_n) > 0) from_ = from_ + '' + not_match_s;

        to_ = Array(r + 1).join(to_s + i);
        to_ = to_.replace(/\d+/g, '*');
        to_ = to_.replace(/a/g, '?');
        if ((i % mod_n) > 0) to_ = to_ + '' + not_match_s;

        act_ = Array(r + 1).join(act_s + i);

        rules[k] = {from: from_, to: to_, action: act_};
    }
    var nmsgs = Object.keys(messages).length;
    var nrules = rules.length;
}

/*
 resetInputs();
 console.time('freezeF4');
 var result = require("../achemichevfilter06_freezeF4/achemichevfilter.js").filter(messages, rules);
 console.timeEnd('freezeF4');
 */ /* TRASH */


resetInputs();
console.time('freezeF3');
var result = require("../achemichevfilter05_freezeF3/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF3');

resetInputs();
console.time('freezeF2');
var result = require("../achemichevfilter04_freezeF2/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF2');

resetInputs();
console.time('f08a');
var result = require("../achemichevfilter08/achemichevfilter.js").filter(messages, rules);
console.timeEnd('f08a');

resetInputs();
console.time('freezeF1');
var result = require("../achemichevfilter03_freezeF1/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF1');

resetInputs();
console.time('freezeF0');
var result = require("../achemichevfilter02_freezeF0/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF0');

/*
 resetInputs();
 console.time('f07');
 var result = require("./achemichevfilter.js").filter(messages, rules);
 console.timeEnd('f07'); // f04: 3061.832ms
 */ /* TRASH */

resetInputs();
console.time('relR01');
var result = require("../achemichevfilter12_relR01/achemichevfilter.js").filter(messages, rules);
console.timeEnd('relR01');

resetInputs();
console.time('f14');
var result = require("../achemichevfilter14/achemichevfilter.js").filter(messages, rules);
console.timeEnd('f14'); // f04: 3061.832ms

resetInputs();
console.time('f15r2');
var result = require("./achemichevfilterR2.js").filter(messages, rules);
console.timeEnd('f15r2'); // f04: 3061.832ms

resetInputs();
console.time('f08b');
var result = require("../achemichevfilter08/achemichevfilter.js").filter(messages, rules);
console.timeEnd('f08b');

resetInputs();
console.time('freezeF2');
var result = require("../achemichevfilter04_freezeF2/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF2');

resetInputs();
console.time('freezeF3');
var result = require("../achemichevfilter05_freezeF3/achemichevfilter.js").filter(messages, rules);
console.timeEnd('freezeF3');