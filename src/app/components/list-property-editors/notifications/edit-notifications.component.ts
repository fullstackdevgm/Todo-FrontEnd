import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCListService } from '../../../services/tc-list.service'
import { ListEmailNotificationModel, ListEmailNotificationChangeModel } from '../../../tc-types'

@Component({
    selector : 'edit-notifications',
    templateUrl : 'edit-notifications.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-edit-notifications.component.css']
})
export class EditNotificationsComponent {
    updatingTaskNotifications    : boolean = false
    updatingCommentNotifications : boolean = false
    updatingMemberNotifications  : boolean = false
    updatingAssignedOnly         : boolean = false

    updatingTaskNotificationsError    : boolean = false
    updatingCommentNotificationsError : boolean = false
    updatingMemberNotificationsError  : boolean = false
    updatingAssignedOnlyError         : boolean = false

    @Input() notificationModel : ListEmailNotificationModel
    @Output() change : EventEmitter<ListEmailNotificationChangeModel> = new EventEmitter<ListEmailNotificationChangeModel>()

    constructor(
        private listService : TCListService
    ) {}

    toggleTaskNotifications() {
        this.notificationModel.taskNotifications = !this.notificationModel.taskNotifications
        this.updatingTaskNotifications = true
        this.change.emit({
            model : this.notificationModel,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                this.notificationModel.taskNotifications = updatedModel.taskNotifications
                this.updatingTaskNotifications = false
                this.updatingTaskNotificationsError = err != undefined
            }
        })
    }

    toggleCommentNotifications() {
        this.notificationModel.commentNotifications = !this.notificationModel.commentNotifications
        this.updatingCommentNotifications = true
        this.change.emit({
            model : this.notificationModel,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                this.notificationModel.commentNotifications = updatedModel.commentNotifications
                this.updatingCommentNotifications = false
                this.updatingCommentNotificationsError = err != undefined
            }
        })
    }

    toggleMemberNotifications() {
        this.notificationModel.userNotifications = !this.notificationModel.userNotifications
        this.updatingMemberNotifications = true
        this.change.emit({
            model : this.notificationModel,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                this.notificationModel.userNotifications = updatedModel.userNotifications
                this.updatingMemberNotifications = false
                this.updatingAssignedOnlyError = err != undefined
            }
        })
    }

    toggleAssignedOnly() {
        this.notificationModel.notifyAssignedOnly = !this.notificationModel.notifyAssignedOnly
        this.updatingAssignedOnly = true
        this.change.emit({
            model : this.notificationModel,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                this.notificationModel.notifyAssignedOnly = updatedModel.notifyAssignedOnly
                this.updatingAssignedOnly = false
                this.updatingAssignedOnlyError = err != undefined
            }
        })
    }
}
