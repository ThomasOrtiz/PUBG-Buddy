class Server {

    constructor(serverId){
        this._serverId = serverId;
    }

    set id(id) { this._id = id; }
    get id() { return this._id; }

    set serverId(serverId) { this._serverId = serverId; }
    get serverId() { return this._serverId; }

    set default_bot_prefix(default_bot_prefix) { this._default_bot_prefix = default_bot_prefix; }
    get default_bot_prefix() { return this._default_bot_prefix; }

    set default_season(default_season) { this._default_season = default_season; }
    get default_season() { return this._default_season; }

    set default_region(default_region) { this._default_region = default_region; }
    get default_region() { return this._default_region; }

    set default_mode(default_mode) { this._default_mode = default_mode; }
    get default_mode() { return this._default_mode; }

    set default_squadSize(default_squadSize) { this._default_squadSize = default_squadSize; }
    get default_squadSize() { return this._default_squadSize; }

    toString() {
        return this.serverId;
    }
}

module.exports = Server;