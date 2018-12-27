import { PubgRankBreakPoints, PubgRankImageLocation } from '../../shared/constants';


export class PubgRatingService {

    /**
     * Calculates the character's rating with following formula:
     *      overall_rating = win_rating + (kill_rating / 5)
     * @param {number} winRating
     * @param {number} killRating
     * @returns {number} overall rating
     */
    static calculateOverallRating(winRating: number, killRating: number): number {
        return winRating + (killRating / 5);
    }

    static getRankBadgeImageFromRanking(ranking: number): PubgRankImageLocation {
        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return PubgRankImageLocation.UNRANKED_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_BRONZE) {
            return PubgRankImageLocation.BRONZE_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_SILVER) {
            return PubgRankImageLocation.SILVER_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_GOLD) {
            return PubgRankImageLocation.GOLD_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_PLATINUM) {
            return PubgRankImageLocation.PLATINUM_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_DIAMOND) {
            return PubgRankImageLocation.DIAMOND_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_ELITE) {
            return PubgRankImageLocation.ELITE_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_MASTER) {
            return PubgRankImageLocation.MASTER_BADGE;
        } else {
            return PubgRankImageLocation.GRANDMASTER_BADGE;
        }
    }

    static getRankRibbionImageFromRanking(ranking: number): PubgRankImageLocation {
        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return PubgRankImageLocation.UNRANKED_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_BRONZE) {
            return PubgRankImageLocation.BRONZE_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_SILVER) {
            return PubgRankImageLocation.SILVER_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_GOLD) {
            return PubgRankImageLocation.GOLD_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_PLATINUM) {
            return PubgRankImageLocation.PLATINUM_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_DIAMOND) {
            return PubgRankImageLocation.DIAMOND_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_ELITE) {
            return PubgRankImageLocation.ELITE_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_MASTER) {
            return PubgRankImageLocation.MASTER_RIBBON;
        } else {
            return PubgRankImageLocation.GRANDMASTER_RIBBON;
        }
    }

    static getRankTitleFromRanking(ranking: number): string {
        let rank = 'Unranked';

        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return rank;
        } else if (ranking < PubgRankBreakPoints.MAX_BRONZE) {
            return 'Bronze';
        } else if (ranking < PubgRankBreakPoints.MAX_SILVER) {
            return 'Silver';
        } else if (ranking < PubgRankBreakPoints.MAX_GOLD) {
            return 'Gold';
        } else if (ranking < PubgRankBreakPoints.MAX_PLATINUM) {
            return 'Platinum';
        } else if (ranking < PubgRankBreakPoints.MAX_DIAMOND) {
            return 'Diamond';
        } else if (ranking < PubgRankBreakPoints.MAX_ELITE) {
            return 'Elite';
        } else if (ranking < PubgRankBreakPoints.MAX_MASTER) {
            return 'Master';
        } else {
            return 'GrandMaster';
        }
    }

    static getSurivivalTitle(rankPointsTitle: string): string {
        const titleComponents: string[] = rankPointsTitle.split('-');
        const title: number = +titleComponents[0];
        const level: number = +titleComponents[1];

        let titleStr: string = '';
        if (title === 0) {
            titleStr = "Unknown";
        } else if (title === 1) {
            titleStr = "Beginner";
        } else if (title === 2) {
            titleStr = "Novice";
        } else if (title === 3) {
            titleStr = "Experienced";
        } else if (title === 4) {
            titleStr = "Skilled";
        } else if (title === 5) {
            titleStr = "Specialist";
        } else if (title === 6) {
            titleStr = "Expert";
        } else if (title === 7) {
            titleStr = "Survivor";
        }

        titleStr += ` ${this.romanizeNumber(level)}`;

        return titleStr;
    }

    private static romanizeNumber(num: number): string {
        let roman: string = '';

        if (num === 5) { return 'V' }

        for(let i = 1; i <= num; i++) {
            roman += 'I';
        }

        return roman;
    }
}
