const SEASONS = {
    'Season 1': '2018-01',
    'Season 2': '2018-02',
    'Season 3': '2018-03',
};

function get(key){
    return SEASONS[key];
}

function getKeyFromValue(value) {
    return Object.keys(SEASONS).find(k => SEASONS[k] === value);
}

function getAllValues(){
    return Object.values(SEASONS);
}

module.exports = { SEASONS, get, getAllValues, getKeyFromValue
};