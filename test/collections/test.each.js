/* global it */
'use strict';

var assert = require('assert');
var domain = require('domain');

var _ = require('lodash');
var parallel = require('mocha.parallel');

var async = global.async || require('../../');
var delay = require('../config').delay;
var util = require('../util');

function eachIterator(order) {

  return function(value, callback) {

    var self = this;
    var num = _.isArray(value) ? _.last(value) : value;

    setTimeout(function() {
      if (self && self.round) {
        num = self.round(num);
      }
      order.push(value);
      callback();
    }, num * delay);
  };
}

function eachIteratorWithKey(order) {

  return function(value, key, callback) {

    var self = this;
    var num = _.isArray(value) ? _.last(value) : value;

    setTimeout(function() {
      if (self && self.round) {
        num = self.round(num);
      }
      order.push([value, key]);
      callback();
    }, num * delay);
  };
}

parallel('#each', function() {

  it('should execute iterator by collection of array', function(done) {

    var order = [];
    var collection = [1, 3, 2];
    async.each(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should execute iterator by collection of array with passing index', function(done) {

    var order = [];
    var collection = [1, 3, 2];
    async.each(collection, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [2, 2],
        [3, 1]
      ]);
      done();
    });
  });

  it('should execute iterator by collection of object', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 3,
      c: 2
    };
    async.each(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should execute iterator by collection of object with passing key', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 3,
      c: 2
    };
    async.each(collection, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 'a'],
        [2, 'c'],
        [3, 'b']
      ]);
      done();
    });
  });

  it('should execute iterator by collection of Set', function(done) {

    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(3);
    set.add(2);
    async.each(set, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should execute iterator by collection of Set with passing key', function(done) {
    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(3);
    set.add(2);
    async.each(set, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [2, 2],
        [3, 1]
      ]);
      done();
    });
  });

  it('should execute iterator by collection of Map', function(done) {

    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 3);
    map.set('c', 2);
    async.each(map, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        ['a', 1],
        ['c', 2],
        ['b', 3]
      ]);
      done();
    });
  });

  it('should execute iterator by collection of Map with passing key', function(done) {
    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 3);
    map.set('c', 2);
    async.each(map, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [['a', 1], 0],
        [['c', 2], 2],
        [['b', 3], 1]
      ]);
      done();
    });
  });

  it('should execute iterator without binding', function(done) {

    var order = [];
    var collection = {
      a: 1.1,
      b: 3.5,
      c: 2.7
    };

    async.each(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1.1, 2.7, 3.5]);
      done();
    }, Math);
  });

  it('should execute iterator without binding with passing key', function(done) {

    var order = [];
    var collection = {
      a: 1.1,
      b: 3.5,
      c: 2.7
    };

    async.each(collection, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1.1, 'a'],
        [2.7, 'c'],
        [3.5, 'b']
      ]);
      done();
    }, Math);
  });

  it('should throw error', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(num === 3);
      }, num * delay);
    };

    async.each(collection, iterator, function(err) {
      assert.ok(err);
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should throw error if double callback', function(done) {

    var errorCallCount = 0;
    setTimeout(function() {
      assert.strictEqual(errorCallCount, 4);
      done();
    }, delay);

    domain.create()
      .on('error', util.errorChecker)
      .on('error', function() {
        errorCallCount++;
      })
      .run(function() {
        var collection = [1, 3, 2, 4];
        var iterator = function(num, callback) {
          process.nextTick(callback);
          process.nextTick(callback);
        };
        async.each(collection, iterator);
      });
  });

  it('should avoid double callback', function(done) {

    var called = {
      iterator: false,
      callback: false
    };
    async.each([1, 2], function(item, callback) {
      try {
        callback(item);
      } catch (exception) {
        try {
          callback(exception);
        } catch(e) {
          assert.ok(e);
          assert.strictEqual(called.iterator, false);
          util.errorChecker(e);
          called.iterator = true;
        }
      }
    }, function(err) {
      assert.ok(err);
      assert.strictEqual(called.callback, false);
      called.callback = true;
      async.nothing();
    });
    setTimeout(done, delay);
  });

  it('should break if respond equals false', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(null, num !== 3);
      }, num * delay);
    };

    async.each(collection, iterator, function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should return response immediately if array is empty', function(done) {

    var order = [];
    var array = [];
    async.each(array, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if object is empty', function(done) {

    var order = [];
    var object = {};
    async.each(object, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is function', function(done) {

    var order = [];
    async.each(function() {}, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is undefined', function(done) {

    var order = [];
    async.each(undefined, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is null', function(done) {

    var order = [];
    async.each(null, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

});

parallel('#eachSeries', function() {

  it('should execute iterator to series by collection of array', function(done) {

    var order = [];
    var collection = [1, 3, 2];

    async.eachSeries(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 2]);
      done();
    });
  });

  it('should execute iterator to series by collection of array with passing index', function(done) {

    var order = [];
    var collection = [1, 3, 2];

    async.eachSeries(collection, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [3, 1],
        [2, 2]
      ]);
      done();
    });
  });

  it('should execute iterator to series by collection of object', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 3,
      c: 2
    };
    async.eachSeries(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 2]);
      done();
    });
  });

  it('should execute iterator to series by collection of object with passing key', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 3,
      c: 2
    };
    async.eachSeries(collection, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 'a'],
        [3, 'b'],
        [2, 'c']
      ]);
      done();
    });
  });

  it('should execute iterator to series by collection of Set', function(done) {

    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(3);
    set.add(2);
    async.eachSeries(set, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 2]);
      done();
    });
  });

  it('should execute iterator to series by collection of Set with passing key', function(done) {
    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(3);
    set.add(2);
    async.eachSeries(set, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [3, 1],
        [2, 2]
      ]);
      done();
    });
  });

  it('should execute iterator to series by collection of Map', function(done) {

    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 3);
    map.set('c', 2);
    async.eachSeries(map, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        ['a', 1],
        ['b', 3],
        ['c', 2]
      ]);
      done();
    });
  });

  it('should execute iterator to series by collection of Map with passing key', function(done) {
    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 3);
    map.set('c', 2);
    async.eachSeries(map, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [['a', 1], 0],
        [['b', 3], 1],
        [['c', 2], 2]
      ]);
      done();
    });
  });

  it('should execute iterator to series without binding', function(done) {

    var order = [];
    var collection = {
      a: 1.1,
      b: 3.5,
      c: 2.7
    };

    async.eachSeries(collection, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1.1, 3.5, 2.7]);
      done();
    }, Math);
  });

  it('should execute on asynchronous', function(done) {

    var sync = true;
    var collection = {
      a: 1,
      b: 3,
      c: 2
    };
    var iterator = function(n, callback) {
      callback();
    };
    async.eachSeries(collection, iterator, function(err) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(sync, false);
      done();
    });
    sync = false;
  });

  it('should throw error', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(num === 3);
      }, num * delay);
    };

    async.eachSeries(collection, iterator, function(err) {
      assert.ok(err);
      assert.deepEqual(order, [1, 3]);
      done();
    });
  });

  it('should throw error if double callback', function(done) {

    var errorCallCount = 0;
    setTimeout(function() {
      assert.strictEqual(errorCallCount, 4);
      done();
    }, delay);

    domain.create()
      .on('error', util.errorChecker)
      .on('error', function() {
        errorCallCount++;
      })
      .run(function() {
        var collection = [1, 3, 2, 4];
        var iterator = function(num, callback) {
          setImmediate(callback);
          setImmediate(callback);
        };
        async.eachSeries(collection, iterator);
      });
  });

  it('should break if respond equals false', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(null, num !== 3);
      }, num * 10);
    };

    async.eachSeries(collection, iterator, function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3]);
      done();
    });
  });

  it('should return response immediately if array is empty', function(done) {

    var order = [];
    var array = [];
    async.eachSeries(array, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if object is empty', function(done) {

    var order = [];
    var object = {};
    async.eachSeries(object, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is function', function(done) {

    var order = [];
    async.eachSeries(function() {}, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is undefined', function(done) {

    var order = [];
    async.eachSeries(undefined, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is null', function(done) {

    var order = [];
    async.eachSeries(null, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should avoid double callback', function(done) {

    var called = false;
    async.eachSeries([1, 2], function(item, callback) {
      try {
        callback(item);
      } catch (exception) {
        try {
          callback(exception);
        } catch(e) {
          assert.ok(e);
          util.errorChecker(e);
        }
        done();
      }
    }, function(err) {
      assert.ok(err);
      assert.strictEqual(called, false);
      called = true;
      async.nothing();
    });
  });
});

parallel('#eachLimit', function() {

  it('should execute iterator in limited by collection of array', function(done) {

    var order = [];
    var collection = [1, 5, 3, 4, 2];

    async.eachLimit(collection, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 5, 2, 4]);
      done();
    });
  });

  it('should execute iterator in limited by collection of array with passing index', function(done) {

    var order = [];
    var collection = [1, 5, 3, 4, 2];

    async.eachLimit(collection, 2, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [3, 2],
        [5, 1],
        [2, 4],
        [4, 3]
      ]);
      done();
    });
  });

  it('should execute iterator in limited by collection of object', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 5,
      c: 3,
      d: 4,
      e: 2
    };
    async.eachLimit(collection, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 5, 2, 4]);
      done();
    });
  });

  it('should execute iterator in limited by collection of object with passing key', function(done) {

    var order = [];
    var collection = {
      a: 1,
      b: 5,
      c: 3,
      d: 4,
      e: 2
    };
    async.eachLimit(collection, 2, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 'a'],
        [3, 'c'],
        [5, 'b'],
        [2, 'e'],
        [4, 'd']
      ]);
      done();
    });
  });

  it('should execute iterator in limited by collection of Set', function(done) {

    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(5);
    set.add(3);
    set.add(4);
    set.add(2);
    async.eachLimit(set, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 3, 5, 2, 4]);
      done();
    });
  });

  it('should execute iterator in limited by collection of Set with passing key', function(done) {
    var order = [];
    var set = new util.Set();
    set.add(1);
    set.add(5);
    set.add(3);
    set.add(4);
    set.add(2);
    async.eachLimit(set, 2, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [1, 0],
        [3, 2],
        [5, 1],
        [2, 4],
        [4, 3]
      ]);
      done();
    });
  });

  it('should execute iterator in limited by collection of Map', function(done) {

    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 5);
    map.set('c', 3);
    map.set('d', 4);
    map.set('e', 2);
    async.eachLimit(map, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        ['a', 1],
        ['c', 3],
        ['b', 5],
        ['e', 2],
        ['d', 4]
      ]);
      done();
    });
  });

  it('should execute iterator in limited by collection of Map with passing key', function(done) {
    var order = [];
    var map = new util.Map();
    map.set('a', 1);
    map.set('b', 5);
    map.set('c', 3);
    map.set('d', 4);
    map.set('e', 2);
    async.eachLimit(map, 2, eachIteratorWithKey(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [
        [ ['a', 1], 0],
        [ ['c', 3], 2],
        [ ['b', 5], 1],
        [ ['e', 2], 4],
        [ ['d', 4], 3]
      ]);
      done();
    });
  });

  it('should execute iterator in limited without binding', function(done) {

    var order = [];
    var collection = {
      a: 1.1,
      b: 3.5,
      c: 2.7
    };

    async.eachLimit(collection, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1.1, 3.5, 2.7]);
      done();
    }, Math);
  });

  it('should execute like parallel if limit is Infinity', function(done) {

    var order = [];
    var collection = [1, 3, 4, 2, 3];

    async.eachLimit(collection, Infinity, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }

      assert.deepEqual(order, [1, 2, 3, 3, 4]);
      done();
    });
  });

  it('should execute on asynchronous', function(done) {

    var sync = true;
    var collection = [1, 3, 4, 2, 3];
    var iterator = function(n, callback) {
      callback();
    };
    async.eachLimit(collection, 2, iterator, function(err) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(sync, false);
      done();
    });
    sync = false;
  });

  it('should throw error', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(num === 3);
      }, num * delay);
    };

    async.eachLimit(collection, 3, iterator, function(err) {
      assert.ok(err);
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should avoid double callback', function(done) {

    var called = false;
    async.eachLimit([1, 2], 2, function(item, callback) {
      try {
        callback(item);
      } catch (exception) {
        try {
          callback(exception);
        } catch(e) {
          assert.ok(e);
          util.errorChecker(e);
        }
        done();
      }
    }, function(err) {
      assert.ok(err);
      assert.strictEqual(called, false);
      called = true;
      async.nothing();
    });
  });

  it('should break if respond equals false', function(done) {

    var order = [];
    var collection = [1, 3, 2, 4];
    var iterator = function(num, callback) {
      setTimeout(function() {
        order.push(num);
        callback(null, num !== 3);
      }, num * delay);
    };

    async.eachLimit(collection, 3, iterator, function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, [1, 2, 3]);
      done();
    });
  });

  it('should return response immediately if array is empty', function(done) {

    var order = [];
    var array = [];
    async.eachLimit(array, 3, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if object is empty', function(done) {

    var order = [];
    var object = {};
    async.eachLimit(object, 3, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is function', function(done) {

    var order = [];
    async.eachLimit(function() {}, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is undefined', function(done) {

    var order = [];
    async.eachLimit(undefined, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if collection is null', function(done) {

    var order = [];
    async.eachLimit(null, 2, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if limit is zero', function(done) {

    var order = [];
    var collection = [1, 3, 2];
    async.eachLimit(collection, 0, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

  it('should return response immediately if limit is undefined', function(done) {

    var order = [];
    var collection = [1, 3, 2];
    async.eachLimit(collection, undefined, eachIterator(order), function(err) {
      if (err) {
        return done(err);
      }
      assert.deepEqual(order, []);
      done();
    });
  });

});
