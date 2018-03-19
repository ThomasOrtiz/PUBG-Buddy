class ServerRegistery {

    set id(id) { this._id = id; }
    get id() { return this._id; }

    set playerId(playerId) { this._playerId = playerId; }
    get playerId() { return this._playerId; }

    set serverId(serverId) { this._serverId = serverId; }
    get serverId() { return this._serverId; }

    toString() {
        return this.id + ' - ' + this.playerId + ' - ' + this.serverId;
    }
}

module.exports = ServerRegistery;