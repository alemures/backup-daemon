'use strict';

var chokidar = require('chokidar');
var Rsync = require('rsync');
var Delayer = require('taskerjs').Delayer;
var ut = require('utjs');
var logger = ut.logger;
var yargs = require('yargs');

var LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

var argv = yargs
  .usage('Usage: $0 source destination [options]')
  .demand(2)

  .alias('w', 'wait')
  .nargs('w', 1)
  .default('w', 5000)
  .describe('w', 'Delay to do the backup in milliseconds after changes')

  .alias('d', 'delete')
  .nargs('d', 0)
  .boolean('d')
  .describe('d', 'Deletes will be replicated in backup')

  .alias('q', 'quiet')
  .nargs('q', 0)
  .boolean('q')
  .describe('q', 'Disable rsync logs')

  .alias('i', 'ignore')
  .array('i')
  .describe('i', 'Exclude a pattern from transfer')

  .alias('l', 'log')
  .string('l')
  .choices('l', LOG_LEVELS)
  .default('l', LOG_LEVELS[1])
  .describe('l', 'Log level')

  .help('h')
  .alias('h', 'help')
  .epilog('https://github.com/alemures/backup-daemon')
  .strict()
  .argv;

var source = argv._[0];
var destination = argv._[1];
logger.setLogLevel(LOG_LEVELS.indexOf(argv.log) + 1);

var running = false;
var delayer = new Delayer();
var rsync = new Rsync()
  .flags('CavzP')
  .source(source)
  .destination(destination);

if (argv.delete) {
  rsync.delete();
}

if (argv.quiet) {
  rsync.quiet();
}

if (argv.ignore) {
  rsync.exclude(argv.ignore);
}

var chokidarConfig = {};

if (argv.ignore) {
  logger.debug('Ignored:', argv.ignore);
  chokidarConfig.ignored = ignoreToChokidar(argv.ignore);
}

chokidar.watch(source, chokidarConfig).on('all', onChanges);

function onChanges(event, path) {
  logger.debug('Change:', event, path);
  if (!running && !delayer.isDelayed('doBackup')) {
    logger.info('Changes detected, running backup in ' + argv.wait + ' ms');
    delayer.add('doBackup', doBackup, argv.wait);
  }
}

function doBackup() {
  running = true;
  rsync.execute(function onExecute(err, code, cmd) {
    running = false;

    if (err) {
      return logger.error(err);
    }

    logger.info('Backup completed!');
    logger.info('Waiting for changes...');
  },

  function stdoutHandler(data) {
    process.stdout.write(data);
  },

  function stderrHandler(data) {
    process.stdout.write(data);
  });
}

// Makes the ignore patters compatible with chokidar
function ignoreToChokidar(ignore) {
  return ignore.map(function(e) {
    e = ut.endsWith(e, '/') ? e.substring(0, e.length - 1) : e;
    return '**/' + e;
  });
}
