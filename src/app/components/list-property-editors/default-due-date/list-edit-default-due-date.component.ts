import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'

@Component({
    selector : 'list-edit-default-due-date',
    templateUrl : 'list-edit-default-due-date.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-edit-default-due-date.component.css']
})
export class ListEditDefaultDueDateComponent implements OnInit {
    @Input() list : TCList | TCSmartList
    @Input() dueDates : string[]
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<number> = new EventEmitter<number>()

    public readonly DefaultDueDate = {
        AppDefault : -1,
        None       : 0,
        Today      : 1,
        Tomorrow   : 2,
        InTwoDays  : 3,
        InThreeDays: 4,
        InFourDays : 5,
        InFiveDays : 6,
        InSixDays  : 7,
        InOneWeek  : 8,
    }

    public appDefaultDueDateText = ''

    constructor(
        private readonly userSettingsService : TCUserSettingsService
    ){}

    ngOnInit() {
        this.userSettingsService.settings.subscribe(settings => {
            this.appDefaultDueDateText = this.dueDates[settings.defaultDueDate]
        })
    }

    defaultDueDateSelected(dueDate : number) {
        this.list.defaultDueDate = dueDate
        this.change.emit(dueDate)
        this.done.emit()
    }
}
