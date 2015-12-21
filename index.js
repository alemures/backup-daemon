'use strict';

var chokidar = require('chokidar');
var Rsync = require('rsync');
var Delayer = require('taskerjs').Delayer;
var yargs = require('yargs');

var argv = yargs
  .usage('Usage: $0 source destination')
  .demand(2)
  .help('h')
  .alias('h', 'help')
  .epilog('https://github.com/alemures/backup-daemon')
  .strict()
  .argv;

var source = argv._[0];
var destination = argv._[1];

var running = false;
var delayer = new Delayer();
var rsync = new Rsync()
  .flags('CavzP')
  .source(source)
  .destination(destination);

chokidar.watch(source).on('all', onChanges);

function onChanges(event, path) {
  if (!running && !delayer.isDelayed('doBackup')) {
    console.log('Changes detected, running backup in 5 seconds');
    delayer.add('doBackup', doBackup, 5000);
  }
}

function doBackup() {
  running = true;
  rsync.execute(function onExecute(err, code, cmd) {
    running = false;

    if (err) {
      return console.error(err);
    }

    console.log('Backup completed!');
    console.log('Waiting for changes...');
  },

  function stdoutHandler(data) {
    process.stdout.write(data);
  },

  function stderrHandler(data) {
    process.stdout.write(data);
  });
}
