import * as Mixpanel from 'mixpanel';
import { CommonService as cs } from './common.service';

const apiKey = cs.getEnvironmentVariable('mixpanel_api_key');
const mixpanel: Mixpanel.Mixpanel = Mixpanel.init(apiKey, {
    protocol: 'https'
});
const isDev = cs.getEnvironmentVariable('isDev') === 'true';

export class AnalyticsService {

    static track(eventName: string, properties: any) {
        if (!isDev) {
            mixpanel.track(eventName, properties);
        }

    }

    static setPerson(distinctId: string, body: any) {
        mixpanel.people.set(distinctId, body);
    }
}
