const REGIONS = {
    NA: 'na',
    AS: 'as',
    'KR/JP': 'krjp',
    KAKAO: 'kakao',
    SA: 'sa',
    EU: 'eu',
    OC: 'oc',
    SEA: 'sea'
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

module.exports = { REGIONS, get, getAllValues, getKeyFromValue };