import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCSmartList } from '../../../classes/tc-smart-list'
import { Utils } from '../../../tc-utils'

@Component({
    selector : 'list-change-color',
    templateUrl : 'list-change-color.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-change-color.component.css']
})
export class ListEditColorComponent {
    @Input() list : TCList | TCSmartList
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<string> = new EventEmitter<string>()

    public readonly availableColors = Utils.TodoColors

    changeColor(color:string) {
        this.list.color = color
        this.change.emit(color)
        this.done.emit()
    }
}
