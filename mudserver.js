/*
 * Include everything.
 */

var net = require('net');
var MudClient = require("./mudclient.js");
var MudRooms = require("./mudrooms.js");

/*
 * I wanted to make this a field on a MudServer class and node decided it wanted to monkeypatch my scope and break that idea.
 */
var clients = []

/*
 * As much as I feel this should be 'bigger' and 'better', functional is better than perfect ad I only have a few hours to work on this.
 *
 * I would love for this to be a graph loaded from a database.
 */
var rooms = {
    "Cafe": {
        "description": "You're in a cozy cafe warmed by an open fire.",
        "exits": {"outside": "Outside"},
    },
    "Outside": {
        "description": "You're standing outside a cafe. It's raining.",
        "exits": {"inside": "Cafe"},
    }
}

/*
 * Send text to all clients.
 * 
 * I envisioned this as being a method on a server class but nodejs didnt co-operate in the limited time I had.
 */
function sendToAllClients(data) {
	for(var i = 0; i < clients.length; i++) {
		clients[i].writeline(data);
		clients[i].prompt();
	}
};

/*
 * Send text to all fully logged in clients except the one.
 * 
 * I envisioned this as being a method on a server class but nodejs didnt co-operate in the limited time I had.
 */
function sendToAllOtherClients(socket, data) {
	for(var i = 0; i< clients.length; i++) {
		if( clients[i].socket !== socket && clients[i].name !== '') {
			clients[i].writeline(data);
			clients[i].prompt();
		}
	}
};

/*
 * Send text and client sending it to the command system.
 *
 * I envisioned this as being a method on a dedicated command controller class but nodejs didnt co-operate in the limited time I had.
 * 
 * Also: NodeJS/NPM hates the low memory of the RasberryPi I'm using to host node so while I would love to use the Command pattern here
 * NPM can not even read its own index without crashing so if a lib exists that can do this, I'm not aware of it.
 */
function sendToCommandSystem(client, data) {
	if(data == 'quit' || data == 'exit'){
		client.socket.end('Goodbye!\r\n');
		return;
	}

	if(data.indexOf('look') == 0){
		client.writeline("Location: " + client.location );
		client.writeline(rooms[client.location].description);
		client.writeline("Exits:");

		var doors = Object.keys(rooms[client.location].exits);

		for(var i = 0; i < doors.length; i++) {
			client.writeline(" " + doors[i]);
		}
		
		var here = [];
		for(var i = 0; i < clients.length; i++) {
			if(client.location == clients[i].location && clients[i].socket !== client.socket){
				here.push(clients[i].name);
			}
		}

		if(here.length > 0){
			client.write("You see ");

			var useTheAndWord = false;

			while( here.length > 1 ) {
				useTheAndWord = true;

				var user = here.pop();

				client.write(user + ", ");
			}

			if(useTheAndWord){
				client.write("and " + here[0] + " here.");
			}else{
				client.write(here[0] + " here.");
			}		
		}

		client.prompt();
		return;
	}

	if(data.indexOf('go') == 0){
		if(data == 'go'){
			client.writeline("Go where?");
			client.prompt();
			return;		
		}

		var doors = Object.keys(rooms[client.location].exits);

		var words = data.split(' ');

		if(words.length == 2 && words[1] in rooms[client.location].exits){
			client.writeline("You go " + words[1]);

			for(var i = 0; i < clients.length; i++) {
				if(client.location == clients[i].location && clients[i].socket !== client.socket){
					clients[i].writeline(client.name + " went " + words[1] );
					clients[i].prompt()
				}
			}

			var roomDestination = rooms[client.location].exits[words[1]];

			for(var i = 0; i < clients.length; i++) {
				if(roomDestination == clients[i].location && clients[i].socket !== client.socket){
					clients[i].writeline(client.name + " arrived from " + client.location );
					clients[i].prompt()
				}
			}
			
			client.location = roomDestination;

		}else{
			if( words.length > 1){
				client.writeline("I do not see the exit " + words[1] + ".");
			}

			client.writeline("Valid Exits:");

			for(var i = 0; i < doors.length; i++) {
				client.writeline(" "+ doors[i]);
			}
		}

		client.prompt();
		return;
	}

	if(data.indexOf('say') == 0){
		try{
			data = data.slice(3).trim();
			
			if(data.length == 0){
				throw 'No data to send after removing prefix.';
			}			

			sendToAllOtherClients(client.socket, "\r\n" + client.name + " says: " + data)

			client.prompt();

			return;
		}
		catch(e){
			client.writeline("What?");
			client.prompt();
			return;		
		}
	}

	client.write("The Command '" + data + "' is not supported yet.\r\n");
	client.prompt();
};

/*
 * Disconnect the clients socket and remove them from the client list.
 *
 * I envisioned this as being a method on a server class but nodejs didnt co-operate in the limited time I had.
 */
function disconnectClient(client) {
	var index = clients.indexOf(client);

	if (index != -1) {
		clients.splice(index, 1);
	}
};

/*
 * Accept the new connection.
 * I envisioned this as being a method on a server class but nodejs didnt co-operate in the limited hours I had.
 */
function newClientConnection(socket) 
{
	var client = new MudClient(socket)

	client.writeline('Welcome to A Simple Node-JS Based MUD!');

	client.writeline('What is your name?');

	client.socket.on('data', function(data) {

		// Broken windows clients will write newlines after every character.
		// This does not fix that client bug nor is it indended to.
		// This deals with telnet codes and newlines in the most expediant way given my limited time.
		data = data.toString().trim().replace(/(\r\n|\n|\r)/gm, '').replace(/ /g, '_').replace(/\W/g, '').replace(/_/g, ' ').trim();

		if( data == ''){
			client.prompt();
			return;
		}

		if (client.name == ''){
			client.name = data;
			client.location = 'Cafe';

			sendToAllOtherClients(client.socket, "\r\n" + client.name + " has joined the server.")

			client.prompt();
		}else{
			sendToCommandSystem(client, data);
		}
	});

	client.socket.on('end', function() {
		sendToAllOtherClients(client.socket, "\r\n" + client.name + " has left the server.");

		disconnectClient(client);
	});

	clients.push(client);
}

module.exports = {

	/*
	 * Run the server on the port specified when it was constructed
	 *
	 * Nothing else we have defined needs to be public.
	 */
	Create: function(port) {
		var server = net.createServer(newClientConnection);

		server.listen(port);

		return server;
	}
};


