import * as pool from '../config/sql.config';
import { QueryResult } from 'pg';
import { IPlayer } from '../interfaces';
import { PubgPlayerService, PubgPlatformService } from '../services';
import { PlatformRegion, Player, PubgAPI } from '../pubg-typescript-api';

let maxRequests = 95;

const res: Promise<QueryResult> = pool.query(`select * from players where platform = 'steam' and username = 'TrapWaifuPerShe';`);
res.then((res: QueryResult) => {
    console.log(res.rowCount);

    const xbox: IPlayer[] = [];
    const pc: IPlayer[] = [];

    for(let i = 0; i < res.rowCount; i++) {
        const player: IPlayer = res.rows[i] as IPlayer;
        if(player.platform === 'xbox') {
            xbox.push(player);
        } else if (player.platform === 'steam') {
            pc.push(player)
        }
    }

    fix(PubgPlatformService.getApi(PlatformRegion.XBOX), xbox);
    fix(PubgPlatformService.getApi(PlatformRegion.STEAM), pc);
}, () => {
    console.log('failed');
});

function fix(api: PubgAPI, players: IPlayer[]) {
    let currBatch = players.splice(0, 6);
    while(currBatch.length > 0 && maxRequests > 0) {
        const ids: string[] = currBatch.map((p: IPlayer) => p.pubg_id);
        maxRequests--;

        PubgPlayerService.getPlayersById(api, ids).then((apiPlayers: Player[]) => {
            for(let apiPlayer of apiPlayers) {
                const player: IPlayer = currBatch.find((p: IPlayer) => p.pubg_id === apiPlayer.id);
                player.username = apiPlayer.name;
            }

            const sql: string = createTransaction(currBatch);
            pool.query(sql);
        });

        currBatch = players.splice(0, 6);
    }
}

function createTransaction(players: IPlayer[]): string {
    let updates: string = '';

    for(let player of players) {
        const updateSql: string = `
        update players
            set username = '${player.username}'
        where
            id = '${player.id}' and
            pubg_id = '${player.pubg_id}' and
            platform = '${player.platform}';`;

        updates += updateSql;
    }

    //console.log(`BEGIN; ${updates} COMMIT;`);
    return `BEGIN; ${updates} COMMIT;`
}

