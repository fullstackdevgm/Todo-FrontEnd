import { Component, Input, Output, EventEmitter } from '@angular/core'

import { TCTaskNotification, OffsetTimes } from '../../classes/tc-task-notification'
import { TCTaskNotificationService } from '../../services/tc-task-notification.service'

@Component({
    selector    : 'task-edit-notification-offset-picker',
    templateUrl : 'task-edit-notification-offset-picker.component.html',
    styleUrls   : ['task-edit-notification-offset-picker.component.css']
})
export class TaskEditNotificationOffsetPicker {
    _notification : TCTaskNotification
    @Input() set notification(notification : TCTaskNotification) {
        this._notification = notification
    }
    @Input() set openEditor(open : boolean) {
        this.showPicker = open
    }

    @Input() notificationRows: any[] = []

    @Output() offsetPicked : EventEmitter<TCTaskNotification> = new EventEmitter<TCTaskNotification>()

    showPicker : boolean = true

    pickerOffsets : number[] = OffsetTimes.selectableOffsets

    usedIntervals : number[] = []

    constructor(
        private taskNotificationService : TCTaskNotificationService
    ) {}

    offsetInUse(offset : number) : boolean {
        return this.notificationRows.find(row => {
            return row.notification.triggerOffset == offset
        }) != undefined ? true : false
    }

    labelForOffset(offset : number) : string{
        if (offset == OffsetTimes.none) {
            return 'None'
        }

        if (offset == OffsetTimes.now) {
            return '0 minutes before'
        }

        if (offset < OffsetTimes.hour && this.isMinuteOffset(offset)) {
            const minutes = Math.floor(offset / OffsetTimes.minute)
            return `${minutes} minute${minutes > 1 ? 's' : ''} before`
        }

        if (offset < OffsetTimes.day && this.isHourOffset(offset)) {
            const hours = Math.floor(offset / OffsetTimes.hour)
            return `${hours} hour${hours > 1 ? 's' : ''} before`
        }

        if (offset < OffsetTimes.week) {
            const days = Math.floor(offset / OffsetTimes.day)
            return `${days} day${days > 1 ? 's' : ''} before`
        }

        if (offset < OffsetTimes.month) {
            const weeks = Math.floor(offset / OffsetTimes.week)
            return `${weeks} week${weeks > 1 ? 's' : ''} before`
        }

        if (offset == OffsetTimes.month) {
            return `1 month before`
        }

        return 'Error'
    }

    isHourOffset(offset : number) : boolean {
        return (offset % OffsetTimes.hour) == 0
    }

    isMinuteOffset(offset : number) : boolean {
        return (offset % OffsetTimes.minute) == 0
    }

    onClick(offset : number) {
        if (offset != this._notification.triggerOffset) {
            this._notification.triggerOffset = offset
            this.taskNotificationService.update(this._notification)
        }
        this.offsetPicked.emit(this._notification)
    }
}