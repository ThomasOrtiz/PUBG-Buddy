const MODES = {
    FPP: 'fpp',
    TPP: 'tpp'
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

module.exports = { MODES, get, getAllValues, getKeyFromValue };