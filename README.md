# pid-stats
----------

Generate process information for statsd, given pid files. Uses and requires [sysstat](http://sebastien.godard.pagesperso-orange.fr/) to be installed. Written in node.js.


### Usage:
```
Usage: node pid-stats <pidfiles>... [options]

pidfiles

Options:
   -host, --host   Statsd host  [localhost]
   -p, --port      Statsd port  [8125]
   -t, --period    Statsd period  [5000]
   -P, --prefix    Statsd prefix  [process.]
   -S, --suffix    Statsd suffix  []
```

pid-stats will sample the target processes for the configured period (5s by default), write the values to statsd and exit. It obtain information over time, setup a cron.

### Installation
```
$ sudo apt-get install sysstat psmisc
$ sudo npm install -g pid-stats
$ pid-stats /var/run/service.pid
```


### Documentation

pid-stats will generate statsd gauge metrics for a given set of pid files.

The generated stats are of the form `[prefix][service][metric][suffix]`, where

* `prefix` configured using the `--prefix` parameter. Defaults to "`process.`"
* `service` is the name of the service and is derived from the pidfile. If the pidfile is `/var/run/web-service.pid`, then the service name will be "`web-service`".
* `suffix` configured using the `--suffix` parameter. Defaults to blank.

The metrics generated are:

* `cpu.user`: Percentage of CPU used by the task while executing at the user level (application), with or without nice priority. Note that this field does NOT include time spent running a virtual processor.
* `cpu.system`: Percentage of CPU used by the task while executing at the system level (kernel).
* `cpu.guest`:  Percentage of CPU spent by the task in virtual machine (running a virtual processor).
* `cpu.percent`: Total percentage of CPU time used by the task.
* `mem.faults.minor`: Total number of minor faults the task has made per second, those which have not required loading a memory page from disk.
* `mem.faults.major`:  Total number of major faults the task has made per second, those which have required loading a memory page from disk.
* `mem.virtual`:  Virtual Size: The virtual memory usage of entire task in kilobytes.
* `mem.resident`: Resident Set Size: The non-swapped physical memory used by the task in kilobytes.
* `mem.percent`:  The tasks's currently used share of available physical memory.
* `io.read`: Number of kilobytes the task has caused to be read from disk per second.
* `io.write`: Number of kilobytes the task has caused, or shall cause to be written to disk per second.
* `io.cancelled`: Number of kilobytes whose writing to disk has been cancelled by the task. This may occur when the task truncates some dirty pagecache. In this case, some IO which another task has been accounted for will not be happening.

(Definitions from [node-monitor-pid](https://github.com/kerphi/node-monitor-pid), on which pid-stats depends.)



### Author

Written by [@suprememoocow](https://twitter.com/suprememoocow) for services at [Gitter](https://gitter.im).

