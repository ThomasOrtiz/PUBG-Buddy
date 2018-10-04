require('dotenv').config();


export class CommonService {

    /**
     * Returns index of position of a string if it exists as a
     * substring in any of the elements in the array.
     * @param {string} s string to search for
     * @param {string[]} arr array of string
     */
    static isSubstringOfElement(s: string, arr: string[]): number {
        for(let i = 0; i < arr.length; i++) {
            if(arr[i].indexOf(s) >= 0) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Returns the value of the key=value pair.
     * @param {string} search parameter to search for
     * @param {array} params array of parameters to search through
     * @param {string} defaultParam default return value if search does not exist
     */
    static getParamValue(search: string, params: Array<any>, defaultParam: any): string {
        let index = this.isSubstringOfElement(search, params);
        if(index >= 0) {
            return params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
        } else {
            return defaultParam;
        }
    }

    /**
     * Attempts to get an .env value.
     * @param {string} varName in an .env file
     * @returns value if exists, errors out otherwise.
     */
    static getEnvironmentVariable(varName: string): string {
        if(process.env[varName]) {
            return process.env[varName];
        } else {
            process.exit(-1);
        }
    }

    //////////////////////////////
    // Strings and Math
    //////////////////////////////

    /**
     * Sees if a string is inside of another string
     * @param {string} str
     * @param {string} searchStr
     * @param {boolean} ignoreCase
     */
    static stringContains(str: string, searchStr: string, ignoreCase: boolean = false): boolean {
        if(ignoreCase) {
            return str.toLowerCase().indexOf(searchStr.toLowerCase()) >= 0;
        }
        return str.indexOf(searchStr) >= 0;
    }

    /**
     * Given a fraction it will return the equivalent % with '%' tacked on
     * @param {number} num
     * @param {number} den
     * @param {number} precision
     */
    static getPercentFromFraction(num: number, den: number, precision: number = 2): string {
        if(num === 0 || den === 0) return '0%';
        return this.round((num/den)*100, precision) + '%';
        //Math.round((num/den)*100 * 100) / 100 + '%';
    }

    /**
     * Given a number it will round it to the nearest 100th place by default
     * @param {number} num
     * @param {number} precision
     */
    static round(num: number, precision: number = 2): string {
        const castedNum: number = Number(num);

        if(isNaN(castedNum)) { return ''; }

        //return Math.round(num * 100) / 100;
        return num.toFixed(precision);
    }
}
