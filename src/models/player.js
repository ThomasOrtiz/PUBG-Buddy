class Player {

    constructor(id, username){
        this._id = id;
        this._username = username;
    }

    set id(id) { this._id = id; }
    get id() { return this._id; }

    set username(username) { this._username = username; }
    get username() { return this._username; }

    set rank(rank) { this._rank = rank; }
    get rank() { return this._rank; }

    set rating(rating) { this._rating = rating; }
    get rating() { return this._rating; }

    set grade(grade) { this._grade = grade; }
    get grade() { return this._grade; }

    set headshot_kills(headshot_kills) { this._headshot_kills = headshot_kills; }
    get headshot_kills() { return this._headshot_kills; }

    set longest_kill(longest_kill) { this._longest_kill = longest_kill; }
    get longest_kill() { return this._longest_kill; }

    set average_damage_dealt(average_damage_dealt) { this._average_damage_dealt = average_damage_dealt; }
    get average_damage_dealt() { return this._average_damage_dealt; }

    set topPercent(topPercent) { this._topPercent = topPercent; }
    get topPercent() { return this._topPercent; }

    set winPercent(winPercent) { this._winPercent = winPercent; }
    get winPercent() { return this._winPercent; }

    set topTenPercent(topTenPercent) { this._topTenPercent = topTenPercent; }
    get topTenPercent() { return this._topTenPercent; }

    set kda(kda) { this._kda = kda; }
    get kda() { return this._kda; }

    set kd(kd) { this._kd = kd; }
    get kd() { return this._kd; }

    toString() {
        return this.username + ' - ' + this.id; 
    }
}

module.exports = Player;