import * as NodeCache from 'node-cache';


/**
 * A caching service wrapper
 */
export default class CacheService {

    cache: NodeCache;

    constructor(ttlSeconds) {
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false
        });
    }

    /**
     * Gets / Sets the cache
     * @param {string} key
     * @param {Function} storeFunction
     * @returns {Promise<T>}
     */
    get<T>(key: string, storeFunction: Function, ttl?: number): Promise<T> {
        const value: T = this.cache.get<T>(key);
        if (value) {
            console.log(`CACHED: ${key}`);
            return Promise.resolve(value);
        }

        return this.put<T>(key, storeFunction, ttl);
    }

    /**
     * Sets the cache with a key/value pair
     * @param key
     * @param storeFunction
     * @returns {Promise<T>}
     */
    put<T>(key, storeFunction, ttl?: number): Promise<T> {
        return storeFunction().then((result) => {
            console.log(`CACHING: ${key}`);
            this.cache.set<T>(key, result, ttl);
            return result;
        });
    }

    del(keys) {
        this.cache.del(keys);
    }

    delStartWith(startStr = '') {
        if (!startStr) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.del(key);
            }
        }
    }

    /**
     * Flushes the entire cache
     */
    flush() {
        this.cache.flushAll();
    }
}
