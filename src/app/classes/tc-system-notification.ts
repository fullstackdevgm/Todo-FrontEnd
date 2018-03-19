import { TCObject } from './tc-object'
import { Utils }    from '../tc-utils'

export class TCSystemNotification extends TCObject {
    message  : string = ''
    learnMoreUrl : string = ''
    timestamp : Date = null

    get learnMoreLink() : string {
        return Utils.toAbsoluteLink(this.learnMoreUrl)
    }

    constructor(data? : any) {
        super(data != null ? data.notificationid : null)

        if (data) {
            this.assignIfExists(data.message, 'message')
            this.assignIfExists(data.learn_more_url, 'learnMoreUrl')
            this.assignIfExists(data.timestamp, 'timestamp', (timestamp : number) => this.timestampToDate(timestamp))
        }
    }

    requestBody() {
        return this.toJSON()
    }

    toJSON() {
        return {
            notificationid : this.identifier,
            learn_more_url : this.learnMoreUrl,
            message : this.message,
            timestamp : this.timestamp.getTime() / 1000
        }
    }

}