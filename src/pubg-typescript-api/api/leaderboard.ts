import { AxiosPromise } from 'axios';

import { IPlayer } from '..';

import { PubgAPIEndpoint } from './base';
import { GameMode } from '../shared';


export class LeaderboardPubgAPI extends PubgAPIEndpoint {

  get(gameMode: GameMode): AxiosPromise<IPlayer> {
    return this.api.axios.get(`/leaderboards/${gameMode}`);
  }

}
