const SQUADSIZE = {
    'Solo': 1,
    'Duo': 2,
    'Squad': 4
};

function get(key){
    return SQUADSIZE[key];
}

function getKeyFromValue(value) {
    return Object.keys(SQUADSIZE).find(k => SQUADSIZE[k] === value);
}

function getAllValues(){
    return Object.values(SQUADSIZE);
}

function isValue(value) {
    return getKeyFromValue(value) != null;
}

module.exports = { SQUADSIZE, get, getAllValues, getKeyFromValue, isValue };