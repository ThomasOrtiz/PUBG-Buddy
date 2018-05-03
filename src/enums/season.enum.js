const SEASONS = {
    '2018-01': 'Season 1',
    '2018-02': 'Season 2',
    '2018-03': 'Season 3',
    '2018-04': 'Season 4',
    '2018-05': 'Season 5'
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

function isValue(value) {
    return getKeyFromValue(value) != null;
}

module.exports = { SEASONS, get, getAllValues, getKeyFromValue, isValue };