var mosca = require('mosca');

var moscaSettings = {
    port: 1883,			//mosca (mqtt) port
    backend: {}	//pubsubsettings is the object we created above 
};


// HTTP
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("../web");
var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});
server.listen(8000);

// MQTT

var server = new mosca.Server(moscaSettings);	//here we start mosca
server.on('ready', setup);	//on init it fires up setup()

// fired when the mqtt server is ready
function setup() {
    console.log('Mosca server is up and running')
}

// fired when a message is published
server.on('published', function (packet, client) {
    if(packet.topic == "dev/data") {
        console.log(`received data ${JSON.parse(packet.payload)} from ${client.id}`);
    }
});
// fired when a client connects
server.on('clientConnected', function (client) {
    console.log('Client Connected:', client.id);
});

// fired when a client disconnects
server.on('clientDisconnected', function (client) {
    console.log('Client Disconnected:', client.id);
});