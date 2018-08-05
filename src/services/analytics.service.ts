import * as Mixpanel from 'mixpanel';
import { CommonService as cs } from './common.service';

const apiKey = cs.getEnvironmentVariable('mixpanel_api_key');
const mixpanel: Mixpanel.Mixpanel = Mixpanel.init(apiKey, {
    protocol: 'https'
});

export = mixpanel;
