import chokidar from 'chokidar';
import Rsync from 'rsync';
import { Delayer } from 'taskerjs';
import yargs from 'yargs/yargs';
import winston from 'winston';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

const argv = yargs(process.argv.slice(2))
  .usage('Usage: $0 source destination [options]')
  .demand(2)
  .options({
    w: {
      alias: 'wait',
      nargs: 1,
      default: 5000,
      describe: 'Delay to do the backup in milliseconds after changes',
    },
    d: {
      alias: 'delete',
      nargs: 0,
      type: 'boolean',
      describe: 'Deletes will be replicated in backup',
    },
    q: {
      alias: 'quiet',
      nargs: 0,
      type: 'boolean',
      describe: 'Disable rsync logs',
    },
    i: {
      alias: 'ignore',
      type: 'array',
      describe: 'Exclude a pattern from transfer',
    },
    l: {
      alias: 'log',
      type: 'string',
      choices: LOG_LEVELS,
      default: LOG_LEVELS[1],
      describe: 'Log level',
    },
  })
  .epilog('https://github.com/alemures/backup-daemon')
  .strict()
  .parseSync();

const source = String(argv._[0]);
const destination = String(argv._[1]);
const logger = winston.createLogger({
  level: argv.l,
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      ({ timestamp, level, message, stack }) =>
        `${timestamp as string} [${level.toUpperCase().padEnd(5)}] ${
          stack !== undefined ? (stack as string) : (message as string)
        }`
    )
  ),
});

function stringifyItems(items: (string | number)[]) {
  return items.map((item) => String(item));
}

let running = false;
const delayer = new Delayer();
const rsync = new Rsync()
  .flags('CavzP')
  .source(source)
  .destination(destination);

if (argv.d === true) {
  rsync.delete();
}

if (argv.q === true) {
  rsync.quiet();
}

if (argv.i) {
  rsync.exclude(stringifyItems(argv.i));
}

function doBackup() {
  running = true;
  rsync.execute(
    (err) => {
      running = false;

      if (err) {
        logger.error(err);
        return;
      }

      logger.info('Backup completed!');
      logger.info('Waiting for changes...');
    },

    (data: string) => {
      process.stdout.write(data);
    },

    (data: string) => {
      process.stdout.write(data);
    }
  );
}

function onChanges(event: string, path: string) {
  logger.debug(`Change: ${event} ${path}`);
  if (!running && !delayer.isDelayed('doBackup')) {
    logger.info(`Changes detected, running backup in ${argv.w} ms`);
    delayer.add('doBackup', doBackup, argv.w);
  }
}

// Makes the ignore patters compatible with chokidar
function ignoreToChokidar(ignore: string[]) {
  return ignore.map((e) => {
    const element = e.endsWith('/') ? e.substring(0, e.length - 1) : e;
    return `**/${element}`;
  });
}

const chokidarConfig: chokidar.WatchOptions = {};

if (argv.i) {
  logger.debug('Ignored:', argv.i);
  chokidarConfig.ignored = ignoreToChokidar(stringifyItems(argv.i));
}

chokidar.watch(source, chokidarConfig).on('all', onChanges);
