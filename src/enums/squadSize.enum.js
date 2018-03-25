const SQUADSIZE = {
    1: 'Solo',
    2: 'Duo',
    4: 'Squad'
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