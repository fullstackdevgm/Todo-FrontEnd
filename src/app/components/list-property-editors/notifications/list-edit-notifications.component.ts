import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCListService } from '../../../services/tc-list.service'
import { TCList } from '../../../classes/tc-list'
import { ListEmailNotificationChangeModel, ListEmailNotificationModel } from '../../../tc-types'

@Component({
    selector : 'list-edit-notifications',
    templateUrl : 'list-edit-notifications.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-edit-notifications.component.css']
})
export class ListEditNotificationsComponent {
    oldListNotifications : ListEmailNotificationModel

    public _list : TCList
    @Input() set list(list : TCList) {
        this._list = list
        this.oldListNotifications = Object.assign({}, list.emailNotifications)
    }

    @Output() done   : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<any> = new EventEmitter<any>()

    constructor(
        private readonly listService : TCListService
    ) {}

    onChange(changeModel : ListEmailNotificationChangeModel) {
        this.listService.update(this._list).first().subscribe((savedList:TCList) => {
            this.oldListNotifications = Object.assign({}, savedList.emailNotifications)
            changeModel.callback(savedList.emailNotifications)
        }, err => {
            changeModel.callback(this.oldListNotifications, err)
            this.list.emailNotifications = this.oldListNotifications
        })
    }
}
