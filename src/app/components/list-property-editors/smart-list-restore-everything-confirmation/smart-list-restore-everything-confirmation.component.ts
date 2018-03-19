import { Component, Input, Output, EventEmitter} from '@angular/core'

import { TCSmartList } from '../../../classes/tc-smart-list'

@Component({
    selector : 'smart-list-restore-everything-confirmation',
    templateUrl : 'smart-list-restore-everything-confirmation.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-restore-everything-confirmation.component.css']
})
export class SmartListRestoreEverythingConfirmationComponent {
    @Input() smartList : TCSmartList

    @Output() done      : EventEmitter<any> = new EventEmitter<any>()
    @Output() restore   : EventEmitter<any> = new EventEmitter<any>()
}
