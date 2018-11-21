import { AxiosPromise } from "axios";

import { IStatus } from "..";

import axios, { AxiosInstance } from 'axios';

export class StatusPubgAPI {
    private _axios: AxiosInstance;

    constructor() {
        this._axios = axios.create({
            baseURL: `https://api.playbattlegrounds.com/`,
        });
    }

    get(): AxiosPromise<IStatus> {
        return this._axios.get(`/status`);
    }
}
