// Ensure Node 22 compatibility for dependencies expecting `global`
// eslint-disable-next-line no-undef
if (typeof global === 'undefined') {
  // eslint-disable-next-line no-undef
  globalThis.global = globalThis;
}

// CommonJS require ensures polyfill executes before loading newman
// eslint-disable-next-line @typescript-eslint/no-var-requires
const newman = require('newman');
const path = require('node:path');

const collectionArg = process.argv[2] || './postman/express-task-api-tests.postman_collection.json';
const collectionPath = path.resolve(process.cwd(), collectionArg);

newman.run(
  {
    collection: collectionPath,
    reporters: 'cli',
    timeoutRequest: 30000,
  },
  (err, summary) => {
    if (err) {
      console.error('Newman run failed:', err);
      process.exit(1);
    }
    if (summary.run.failures && summary.run.failures.length > 0) {
      console.error('Newman tests failed:', summary.run.failures);
      process.exit(1);
    }
    console.log('Newman tests passed');
    process.exit(0);
  }
);
