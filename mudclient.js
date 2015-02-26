/*
 * The client player object.
 */
function MudClient(socket) {
	this.socket = socket;
	this.text = '';
	this.name = '';
	this.room = '';
}

MudClient.prototype.write = function(data) {
	this.socket.write(data);
};

MudClient.prototype.writeline = function(data) {
	this.socket.write(data + "\r\n");
};

MudClient.prototype.prompt = function() {
	this.socket.write("\r\n-> ");
};

MudClient.prototype.end = function() {
	this.socket.end();
};

MudClient.prototype.destroy = function() {
	this.socket.destroy();
};

module.exports = MudClient;
