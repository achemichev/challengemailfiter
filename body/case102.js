   var http = require('http');   var request = new http.ClientRequest({       hostname: 'hola.org',       port: 80,       path: '/challenge_mail_filter/reference',       method: 'POST',       headers: {           'Content-Type': 'application/json',           'Content-Length': Buffer.byteLength('{"messages":{"msg1":{"from":"xxxx*zzzzzzzzy*f","to":"a"}},"rules":[{"from":"xxxx*zzy*fffff","action":"false"}]}')       }   });   request.end('{"messages":{"msg1":{"from":"xxxx*zzzzzzzzy*f","to":"a"}},"rules":[{"from":"xxxx*zzy*fffff","action":"false"}]}');   request.on('response', function (response) {       console.log('STATUS: ');       console.log(response.statusCode);       console.log();       response.setEncoding('utf8');       var fs = require('fs');       var f = '../resp/' + 'case102' + '.json';       response.on('data', function (chunk) {           console.log('BODY: ');           console.log(chunk);           console.log();           fs.writeFile(f, chunk, function (err) {               if (err) {                   console.log(err);                   console.log();                   return;               }               console.log(f + ' chunk was saved');               console.log();           });       });   });