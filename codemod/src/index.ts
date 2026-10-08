import { run } from './cli';

run(process.argv.slice(2), { log: (line) => console.log(line), error: (line) => console.error(line) }).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exit(1);
  },
);
