const MODES = {
    fpp: 'First Person Perspective',
    tpp: 'Third Person Perspective'
};

function get(key){
    return MODES[key];
}

function getKeyFromValue(value) {
    return Object.keys(MODES).find(k => MODES[k] === value);
}

function getAllValues(){
    return Object.values(MODES);
}

function isValue(value) {
    return getKeyFromValue(value) != null;
}

module.exports = { MODES, get, getAllValues, getKeyFromValue, isValue };