function MudRoom(description, exits) {
	this.description = description;
	this.exits = exits;
}

MudRoom.prototype.isDoor = function(door) {
	for (i = 0; i < this.exits.length; i++) {
		if(this.exits[i] == door){
			return true;
		}
	}

	return false;
};

module.exports = MudRoom;
