'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getPost = getPost;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('babel/polyfill');

var _spooky = require('spooky');

var _spooky2 = _interopRequireDefault(_spooky);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var params = {
  host: 'http://sfbay.craigslist.org',
  path: '/sby/cto/5205352863.html',
  userAgent: 'Mozilla/5.0 (Windows NT 6.0) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.41 Safari/535.1'
};

// Serialized helper functions
var helpers = {
  name: serialize(nameExists)
};

// Kick it off
getPost(_lodash2['default'].extend(params, helpers));

function getPost($scope) {
  var _this = this;

  var postUrl = $scope.host + $scope.path;
  var spooky = new _spooky2['default']({
    casper: {
      logLevel: 'debug',
      verbose: true
    }
  }, function (err) {
    if (err) {
      e = new Error('Failed to initialize SpookyJS');
      e.details = err;
      throw e;
    }
    spooky.start(postUrl);
    spooky.userAgent($scope.userAgent);
    // .then accepts a function twople:
    // twople[0] = global variables from the node ctx to be passed into casper contex
    // twople[1] = function invoked during appropriate step in the .then chain
    spooky.then([$scope, checkIfRemoved]); // Ejects without returning a post
    spooky.then([$scope, getPostDetails]);
    spooky.then([$scope, checkCaptcha]); // Ejects with no contact info found
    spooky.then([$scope, getContactDetails]);
    spooky.then([$scope, returnPost]);
    spooky.run();
  });

  /******NODE LISTENERS******/
  spooky.on('navigation.requested', function (url, navigationType, navigationLocked, isMainFrame) {
    console.log('––––––––––Navigation Requested–––––––––', 'navtype', navigationType);
  });

  spooky.on('error', function (e, stack) {
    console.error(e);
    if (stack) {
      console.log(stack);
    }
  });

  spooky.on('console', function (line) {
    console.log(line);
  });

  spooky.on('log', function (log) {
    if (log.space === 'remote') {
      console.log(log.message.replace(/ \- .*/, ''));
    }
  });

  spooky.on('got post', function (post) {
    // This is where the post object will live
    console.log('post received in node context', post);
  });

  spooky.on('remote.message', function (msg) {
    _this.log('remote message caught: ' + msg, 'info');
    console.log('remote message caught: ' + msg);
  });

  spooky.on('page.error', function (msg, trace) {
    console.log('Error: ' + msg);
    _this.log('Error: ' + msg, 'ERROR');
  });
}

/******CASPER FUNCTIONS******/

function getPostDetails() {
  // TODO: FILTER DUPLICATES
  // Create the post object accumulator as a casper global
  window.post = {};

  // Add main page attributes (if they exist);
  window.post.body = this.fetchText('#postingbody');
  window.post.images = this.getElementsAttribute('#thumbs a', 'href');
  window.post.title = this.fetchText('title');
  window.post.url = this.getCurrentUrl();
  window.post.price = this.fetchText('.price');

  // Add location attributes (if they exist);
  var location = window.post.location = {};
  location.region = this.fetchText('.postingtitletext small');
  location.lat = this.getElementAttribute('#map', 'data-latitude');
  location.long = this.getElementAttribute('#map', 'data-longitude');

  // Grab link and open contact info page. Host is injected on $scope
  var replyInfo = host + this.getElementAttribute('#replylink', 'href');
  this.open(replyInfo);
}

function getContactDetails() {
  // Still has access to window.post defined in previous step
  var nameExists = new Function(name.body).bind(this);
  var contact = window.post.contact = {};

  contact.name = nameExists() ? this.getElementInfo('.reply_options li').text : null;
  contact.email = this.fetchText('.anonemail');
  contact.phone = this.getElementAttribute('.replytellink', 'href');
}

function returnPost() {
  this.emit('got post', window.post);
}

function checkCaptcha() {
  if (this.exists('form#standalone_captcha')) {
    window.post.contact = null;
    this.log('CAPTCHA ALERT: Error receiving post contact info', 'error');
    this.bypass(1);
  } else {
    this.log('No CAPTCHA found, getting contact details...', 'info');
  }
}

function checkIfRemoved() {
  if (this.exists('#has_been_removed')) {
    window.post = null;
    this.log('Error: Post Removed --- popping the Eject', 'error');
    this.bypass(3);
  }
}

function nameExists() {
  return this.fetchText('.reply_options > b:first-child') === 'contact name:';
}

// Need to serialize functions before passing them into casper
function serialize(fn) {
  return {
    arguments: arguments,
    body: fn.toString().match(/function[^{]+\{([\s\S]*)\}$/)[1]
  };
}