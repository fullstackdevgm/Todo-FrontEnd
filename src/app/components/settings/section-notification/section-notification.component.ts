import { Component, OnInit, OnDestroy, ChangeDetectorRef }  from '@angular/core'
import { TCList } from '../../../classes/tc-list'
import { TCListService } from '../../../services/tc-list.service'
import { TCUserSettings } from '../../../classes/tc-user-settings'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'
import { Subscription } from 'rxjs'

import { ListEmailNotificationChangeModel, SettingsListEmailNotificationChangeModel , ListEmailNotificationModel } from '../../../tc-types'

@Component({
    selector: 'section-notification',
    templateUrl: 'section-notification.component.html',
    styleUrls: [
        '../../task-edit/task-edit-list-select.component.css',
        '../../../../assets/css/settings.css',
        'section-notification.component.css'
    ]
})
export class SettingsNotificationComponent implements OnInit, OnDestroy {
    lists : TCList[] = []
    userSettings : TCUserSettings = null

    private oldListNotifications : ListEmailNotificationModel
    private oldDefaultNotifications : ListEmailNotificationModel

    private listSub : Subscription
    private settingsSub : Subscription

    savingProcess : string[] = []

    constructor(
        private readonly listService : TCListService,
        private readonly settingsService : TCUserSettingsService,
        private readonly changeDetector : ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.listSub = this.listService.lists.subscribe(pub => {
            this.settingsService.settings.first().subscribe(settings => {
                this.lists = pub.lists.filter(e => e.identifier != settings.userInbox)
                this.changeDetector.detectChanges()
            })
        })
        this.settingsSub = this.settingsService.settings.subscribe(settings => {
            this.userSettings = settings
            this.changeDetector.detectChanges()
        })
    }

    ngOnDestroy() {
        this.listSub.unsubscribe()
        this.settingsSub.unsubscribe()
    }

    deleteSpinner(id : string) {
        let index : number = this.savingProcess.indexOf(id);
        if (index !== -1) {
            this.savingProcess.splice(index, 1);
        }
    }

    onEditedListChange(changeModel : SettingsListEmailNotificationChangeModel ) {
        this.listService.update(changeModel.list).first().subscribe((savedList:TCList) => {
            this.oldListNotifications = Object.assign({}, savedList.emailNotifications)
            changeModel.callback(savedList.emailNotifications)
        }, err => {
            changeModel.callback(this.oldListNotifications, err)
            changeModel.list.emailNotifications = this.oldListNotifications
        })
    }
    onEmailDefaultsChange(changeModel : ListEmailNotificationChangeModel) {
        this.settingsService.update(this.userSettings).first().subscribe((savedSettings:TCUserSettings) => {
            this.oldDefaultNotifications = Object.assign({}, savedSettings.emailNotificationDefaults)
            changeModel.callback(savedSettings.emailNotificationDefaults)
        }, err => {
            changeModel.callback(this.oldDefaultNotifications, err)
            this.userSettings.emailNotificationDefaults = this.oldDefaultNotifications
        })
    }

    toggleTaskNotifications(list : TCList) {
        list.emailNotifications.taskNotifications = !list.emailNotifications.taskNotifications
        let spinnerId = 'task-' + list.identifier
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEditedListChange({
            list: list,
            model : list.emailNotifications,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                list.emailNotifications.taskNotifications = updatedModel.taskNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleCommentNotifications(list : TCList) {
        list.emailNotifications.commentNotifications = !list.emailNotifications.commentNotifications
        let spinnerId = 'comment-' + list.identifier
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEditedListChange({
            list: list,
            model : list.emailNotifications,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                list.emailNotifications.commentNotifications = updatedModel.commentNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleMemberNotifications(list : TCList) {
        list.emailNotifications.userNotifications = !list.emailNotifications.userNotifications
        let spinnerId = 'member-' + list.identifier
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEditedListChange({
            list : list,
            model : list.emailNotifications,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                list.emailNotifications.userNotifications = updatedModel.userNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleAssignedOnly(list : TCList) {
        list.emailNotifications.notifyAssignedOnly = !list.emailNotifications.notifyAssignedOnly
        let spinnerId = 'assigned-' + list.identifier
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEditedListChange({
            list : list,
            model : list.emailNotifications,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                list.emailNotifications.notifyAssignedOnly = updatedModel.notifyAssignedOnly
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleTaskNotificationsDefaults(settings : TCUserSettings) {
        settings.emailNotificationDefaults.taskNotifications = !settings.emailNotificationDefaults.taskNotifications
        let spinnerId = 'task'
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEmailDefaultsChange({
            model : settings.emailNotificationDefaults,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                settings.emailNotificationDefaults.taskNotifications = updatedModel.taskNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleCommentNotificationsDefaults(settings : TCUserSettings) {
        settings.emailNotificationDefaults.commentNotifications = !settings.emailNotificationDefaults.commentNotifications
        let spinnerId = 'comment'
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEmailDefaultsChange({
            model : settings.emailNotificationDefaults,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                settings.emailNotificationDefaults.commentNotifications = updatedModel.commentNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleMemberNotificationsDefaults(settings : TCUserSettings) {
        settings.emailNotificationDefaults.userNotifications = !settings.emailNotificationDefaults.userNotifications
        let spinnerId = 'member'
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEmailDefaultsChange({
            model : settings.emailNotificationDefaults,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                settings.emailNotificationDefaults.userNotifications = updatedModel.userNotifications
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }

    toggleAssignedOnlyDefaults(settings : TCUserSettings) {
        settings.emailNotificationDefaults.notifyAssignedOnly = !settings.emailNotificationDefaults.notifyAssignedOnly
        let spinnerId = 'assigned'
        this.savingProcess.push(spinnerId)
        this.deleteSpinner('error-' + spinnerId)
        this.onEmailDefaultsChange({
            model : settings.emailNotificationDefaults,
            callback : (updatedModel : ListEmailNotificationModel, err? : Error) => {
                settings.emailNotificationDefaults.notifyAssignedOnly = updatedModel.notifyAssignedOnly
                this.deleteSpinner(spinnerId)
                if (err != undefined) {
                    this.savingProcess.push('error-' + spinnerId)
                }
            }
        })
    }
}
