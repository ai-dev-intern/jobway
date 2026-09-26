'use strict';

const assert = require('assert');

async function testSandbox() {
  console.log('Running executor integration tests...');
  const port = process.env.PORT || 8080;
  const url = `http://127.0.0.1:${port}/validate`;
  const token = (process.env.EXECUTOR_TOKEN || '').trim();
  assert(token.length >= 32, 'Set EXECUTOR_TOKEN to at least 32 characters before running the integration tests');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const passPayload = {
    language: 'javascript',
    code: "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{const [a,b]=data.trim().split(/\\s+/).map(Number);console.log(a+b)});",
    testCases: [
      { input: '2 3\n', expectedOutput: '5' },
      { input: '10 20\n', expectedOutput: '30' },
      { input: '-5 5\n', expectedOutput: '0' },
    ],
  };
  const res1 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(passPayload) });
  const data1 = await res1.json();
  assert.strictEqual(data1.allPassed, true, `Valid code should pass: ${JSON.stringify(data1)}`);
  assert.strictEqual(data1.passedCount, 3);

  const failPayload = {
    language: 'javascript',
    code: "console.log('wrong');",
    testCases: [{ input: '2 3\n', expectedOutput: '5' }],
  };
  const res2 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(failPayload) });
  const data2 = await res2.json();
  assert.strictEqual(data2.allPassed, false);
  assert.strictEqual(data2.passedCount, 0);

  const timeoutPayload = {
    language: 'javascript',
    code: 'while (true) {}',
    testCases: [{ input: '1\n', expectedOutput: '1' }],
  };
  const started = Date.now();
  const res3 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(timeoutPayload) });
  const duration = Date.now() - started;
  const data3 = await res3.json();
  assert.strictEqual(data3.allPassed, false);
  assert(duration >= 1900 && duration <= 4000, `Execution took ${duration}ms, expected about 2000ms`);

  console.log('All executor integration tests passed.');
}

testSandbox().catch((error) => {
  console.error('Executor integration test failed:', error);
  process.exit(1);
});
