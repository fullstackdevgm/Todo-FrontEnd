import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'

@Component({
    selector : 'list-edit-sort-type',
    templateUrl : 'list-edit-sort-type.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-edit-sort-type.component.css']
})
export class ListEditSortTypeComponent {
    @Input() list : TCList | TCSmartList
    @Input() types: string[]

    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<number> = new EventEmitter<number>()

    public appDefault = -1

    public appDefaultSortTypeText = ''

    constructor(
        private readonly userSettingsService : TCUserSettingsService
    ){}

    ngOnInit() {
        this.userSettingsService.settings.subscribe(settings => {
            this.appDefaultSortTypeText = this.types[settings.taskSortOrder]
        })
    }

    sortTypeSelected(sortType : number) {
        this.list.sortType = sortType
        this.change.emit(sortType)
        this.done.emit()
    }
}
