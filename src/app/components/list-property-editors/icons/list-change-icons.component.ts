import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCSmartList } from '../../../classes/tc-smart-list'
import { Utils } from '../../../tc-utils'

@Component({
    selector : 'list-change-icon',
    templateUrl : 'list-change-icons.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-change-icons.component.css']
})
export class ListEditIconComponent {
    @Input() list : TCList | TCSmartList
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<string> = new EventEmitter<string>()

    public readonly listsIcons = Utils.allIconNamesAsCss()

    changeIcon(icon:string) {
        this.list.iconName = icon
        this.change.emit(icon)
        this.done.emit()
    }
}
