#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fs         = require('fs');
var async      = require('async');
var StatsD     = require('node-statsd').StatsD;
var path       = require('path');
var MonitorPid = require('monitor-pid');
var procfs     = require('procfs-stats');

var opts = require("nomnom")
  .option('pidfiles', {
    position: 0,
    required: true,
    list: true
  })
  .option('host', {
    abbr: 'host',
    required: false,
    default: 'localhost',
    help: 'Statsd host'
  })
  .option('port', {
    abbr: 'p',
    required: false,
    default: '8125',
    help: 'Statsd port'
  })
  .option('period', {
    abbr: 't',
    required: false,
    default: 5000,
    help: 'Statsd prefix'
  })
  .option('prefix', {
    abbr: 'P',
    required: false,
    default: 'process.',
    help: 'Statsd prefix'
  })
  .option('suffix', {
    abbr: 'S',
    required: false,
    default: '',
    help: 'Statsd suffix'
  })
  .parse();

var statsClient = new StatsD({
  host: opts.host,
  port: opts.port,
  prefix: opts.prefix,
  suffix: opts.suffix
});

function stat(name, value, callback) {
  statsClient.gauge(name, value, 1, callback);
}

async.parallelLimit(opts.pidfiles.map(function(pidfile) {

  return function(callback) {
    fs.readFile(pidfile, { encoding: 'utf8' }, function(err, contents) {
      if(err) return callback(err);
      var pid = parseInt(contents.trim(), 10);

      var baseName = path.basename(pidfile).replace(/\.pid$/, '');

      /* Proceed no further */
      if(isNaN(pid) || pid <= 0) {
        callback();
      }

      async.parallel([
        /* Monitor PID */
        function(callback) {
          function done(err) {
            if(callback) {
              callback(err);
              callback = null;
            }
          }

          var mp = new MonitorPid(pid, { period: opts.period });

          // received each time the pid tree has been monitored
          mp.once('monitored', function (pid, stats) {
            async.parallel([
              ['cpu.user',        '%usr'],
              ['cpu.system',      '%system'],
              ['cpu.guest',       '%guest'],
              ['cpu.percent',     '%CPU'],
              ['mem.faults.minor','minflt/s'],
              ['mem.faults.major','majflt/s'],
              ['mem.virtual',     'VSZ'],
              ['mem.resident',    'RSS'],
              ['mem.percent',     '%MEM'],
              ['io.read',         'kB_rd/s'],
              ['io.write',        'kB_wr/s'],
              ['io.cancelled',    'kB_ccwr/s']
              ].map(function(statItem) {
              var name = baseName + '.' + statItem[0];
              var value = stats[statItem[1]];

              return function(callback) {
                stat(name, value, callback);
              };

            }), function(err) {
              done(err);
              try { mp.stop(); } catch(e) { }
            });

          });

          mp.on('error', function (err) {
            /* Don't throw the error, just swallow it */
            console.error('pid-stats: Unable to read pid for ' + pidfile + ': ' + err);
            done();
            try { mp.stop(); } catch(e) { }
          });

          mp.start();
        },
        /* procfs stats */
        function(callback) {
          var procStats = procfs(pid);
          procStats.fds(function(err, fds) {
            if(err) {
              /* Don't throw the error, just swallow it */
              console.error('pid-stats: Unable to read pid for ' + pidfile + ': ' + err);
              callback();
            }

            var name = baseName + '.fds';
            stat(name, fds.length, callback);
          });
        }
      ], callback);
    });

  };

}), 3, function(err) {
  if(err) {
    console.error(err.message || err);
    process.exit(1);
  }

  setTimeout(function() {
    process.exit(0);
  }, 5000).unref();
});


