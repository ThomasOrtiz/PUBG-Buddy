import * as Mixpanel from 'mixpanel';
import { CommonService } from './common.service';

const apiKey = CommonService.getEnvironmentVariable('mixpanel_api_key');
const mixpanel: Mixpanel.Mixpanel = Mixpanel.init(apiKey, {
    protocol: 'https'
});
const isDev = CommonService.getEnvironmentVariable('isDev') === 'true';

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
