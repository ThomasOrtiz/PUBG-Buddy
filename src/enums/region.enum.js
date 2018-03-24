const REGIONS = {
    'na': 'North America',
    'as': 'Asia',
    'krjp': 'Korea / Japan',
    'kakao': 'Korea',
    'sa': 'South America',
    'eu': 'Europe',
    'oc': 'Oceania',
    'sea': 'South-East Asia'
};

function get(key){
    return REGIONS[key];
}

function getKeyFromValue(value) {
    return Object.keys(REGIONS).find(k => REGIONS[k] === value);
}

function getAllValues(){
    return Object.values(REGIONS);
}

function isValue(value) {
    return getKeyFromValue(value) != null;
}

module.exports = { REGIONS, get, getAllValues, getKeyFromValue, isValue };