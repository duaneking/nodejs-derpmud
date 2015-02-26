var net = require('net');
var MudClient = require("./mudclient.js");
var MudServer = require("./mudserver.js");

var server = MudServer.Create(7379);

