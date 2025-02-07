// Flags: --expose-gc
'use strict';
const common = require('../common');
const onGC = require('../common/ongc');
const { createServer } = require('http');
const { connect } = require('net');

if (common.isWindows) {
  // TODO(addaleax): Investigate why and remove the skip.
  common.skip('This test is flaky on Windows.');
}

// Make sure that for HTTP keepalive requests, the req object can be
// garbage collected once the request is finished.
// Refs: https://github.com/nodejs/node/issues/9668

let client;
const server = createServer(common.mustCall((req, res) => {
  onGC(req, { ongc: common.mustCall(() => { server.close(); }) });
  req.resume();
  req.on('end', common.mustCall(() => {
    setImmediate(() => {
      client.end();
      global.gc();
    });
  }));
  res.end('hello world');
}));

server.listen(0, common.mustCall(() => {
  client = connect(server.address().port);

  const req = [
    'POST / HTTP/1.1',
    `Host: localhost:${server.address().port}`,
    'Connection: keep-alive',
    'Content-Length: 11',
    '',
    'hello world',
    ''
  ].join('\r\n');

  client.write(req);
  client.unref();
}));
