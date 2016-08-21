"use strict";

var page = require('webpage').create();
var fs = require('fs');

var system = require('system');
var args = system.args;

var settings = JSON.parse(fs.read(args[1]));
var filename = args[2];

console.log("Rendering", settings.url);

if (settings.cookies) {
    for (var i = 0; i < settings.cookies.length; i++) {
        var cookie = settings.cookies[i];
        phantom.addCookie(cookie);
    }
}

page.viewportSize = settings.viewportSize || {"width": 400, "height": 300};
page.clipRect = settings.clipRect || {"height": 0, "left": 0, "top": 0, "width": 0};
page.open(settings.url, function () {
    setTimeout(function () {
        page.render(filename);
        console.log('Rendered to ' + filename);
        phantom.exit();
    }, 1000);
});