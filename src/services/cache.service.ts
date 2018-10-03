import * as NodeCache from 'node-cache';
import * as logger from '../config/logger.config';
import { TimeInSeconds } from '../shared/constants';


/**
 * A caching service wrapper
 */
export class CacheService {

    cache: NodeCache;

    /**
     * Creates a node-cache object
     * @param {number} ttlSeconds time in seconds until cache is invalid - defaults to 1 hour
     */
    constructor(ttlSeconds?: number) {
        const ttl = ttlSeconds ? ttlSeconds : TimeInSeconds.ONE_HOUR;

        this.cache = new NodeCache({
            stdTTL: ttl,
            checkperiod: ttl * 0.2,
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
            logger.info(`CACHED: ${key}`);
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
            logger.info(`CACHING: ${key}`);
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
