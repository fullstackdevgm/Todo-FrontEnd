import { TCObject } from './tc-object'

export class OffsetTimes {
    static readonly none            : number = 0
    static readonly now             : number = 1
    static readonly minute          : number = 60
    static readonly fiveMinutes     : number = OffsetTimes.minute * 5
    static readonly fifteenMinutes  : number = OffsetTimes.minute * 15
    static readonly thirtyMinutes   : number = OffsetTimes.minute * 30
    static readonly hour            : number = OffsetTimes.minute * 60
    static readonly twoHours        : number = OffsetTimes.hour * 2
    static readonly day             : number = OffsetTimes.hour * 24
    static readonly twoDays         : number = OffsetTimes.day  * 2
    static readonly week            : number = OffsetTimes.day  * 7
    static readonly twoWeeks        : number = OffsetTimes.week * 2
    static readonly month           : number = OffsetTimes.day  * 31    

    // This is the master list of actual offsets that the end
    // user can choose in the task alert picker.
    static readonly selectableOffsets : number[] = [
        OffsetTimes.fiveMinutes,
        OffsetTimes.fifteenMinutes,
        OffsetTimes.thirtyMinutes,
        OffsetTimes.hour,
        OffsetTimes.twoHours,
        OffsetTimes.day,
        OffsetTimes.twoDays,
        OffsetTimes.week,
        OffsetTimes.twoWeeks,
        OffsetTimes.month
    ]
}

export class TCTaskNotification extends TCObject{
    taskId : string
    soundName : string
    triggerDate   : Date
    triggerOffset : number

    get alertDate() : Date {
        return new Date(this.triggerDate.getTime() - (this.triggerOffset * 1000))
    }

    constructor(notificationData? : any) {
        if (!notificationData) {
            super()
            return
        }

        super(notificationData.notificationid, notificationData.timestamp)
        this.assignIfExists(notificationData.taskid, 'taskId')
        this.assignIfExists(notificationData.sound_name, 'soundName')
        this.assignIfExists(notificationData.triggerdate, 'triggerDate', timestamp => this.timestampToDate(timestamp))
        this.assignIfExists(notificationData.triggeroffset, 'triggerOffset')
    }

    requestBody() {
        return this.toJSON()
    }

    toJSON() {
        return {
            notificationid : this.identifier,
            taskid : this.taskId,
            sound_name : this.soundName,
            triggerdate : this.triggerDate.getTime() / 1000,
            triggeroffset : this.triggerOffset
        }
    }
}

