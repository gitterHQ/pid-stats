#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fs         = require('fs');
var async      = require('async');
var StatsD     = require('node-statsd').StatsD;
var path       = require('path');
var MonitorPid = require('monitor-pid');

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
    default: '',
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

function stat(name, value) {
  statsClient.gauge(name, value);
}

async.parallelLimit(opts.pidfiles.map(function(pidfile) {
  var pid = fs.readFileSync(pidfile, { encoding: 'utf8' }).trim();
  var baseName = path.basename(pidfile).replace(/\.pid$/, '');

  return function(callback) {
    var mp = new MonitorPid(pid, { period: opts.period });

    // received each time the pid tree has been monitored
    mp.once('monitored', function (pid, stats) {
      mp.stop();

      stat(baseName + '.cpu.user', stats['%usr']);
      stat(baseName + '.cpu.system', stats['%system']);
      stat(baseName + '.cpu.guest', stats['%guest']);
      stat(baseName + '.cpu.percent', stats['%CPU']);
      stat(baseName + '.mem.faults.minor', stats['minflt/s']);
      stat(baseName + '.mem.faults.major', stats['majflt/s']);
      stat(baseName + '.mem.virtual', stats['VSZ']);
      stat(baseName + '.mem.resident', stats['RSS']);
      stat(baseName + '.mem.percent', stats['%MEM']);
      stat(baseName + '.io.read', stats['kB_rd/s']);
      stat(baseName + '.io.write', stats['kB_wr/s']);
      stat(baseName + '.io.cancelled', stats['kB_ccwr/s']);
    });

    mp.on('end', function () {
      if(callback) {
        callback();
        callback = null;
      }
    });

    mp.on('error', function (err) {
      if(callback) {
        callback(err);
        callback = null;
      }
      try { mp.stop(); } catch(e) { }
    });

    mp.start();

  };

}), 3, function(err) {
  if(err) {
    console.error(err.message || err);
    process.exit(1);
  }

  process.exit(0);
});


