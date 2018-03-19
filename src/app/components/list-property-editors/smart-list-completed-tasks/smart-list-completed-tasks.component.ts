import { Component, Input, Output, EventEmitter} from '@angular/core'

import { TCSmartList } from '../../../classes/tc-smart-list'
import { Utils } from '../../../tc-utils'


@Component({
    selector : 'smart-list-completed-tasks',
    templateUrl : 'smart-list-completed-tasks.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-completed-tasks.component.css']
})
export class SmartListCompletedTasksComponent {
    private static readonly kSmartListTypeKey   : string = "type"
    private static readonly kSmartListPeriodKey : string = "period"

    public _smartList : TCSmartList
    @Input() set smartList (sl : TCSmartList) {
        this._smartList = sl
        this.determineShowPeriodTable()
        let period = this._smartList.completedTaskFilter[SmartListCompletedTasksComponent.kSmartListPeriodKey]
        if (!(this.completedTasksPeriod[period])) { // default period to two weeks if it's not in the map
            this._smartList.completedTaskFilter[SmartListCompletedTasksComponent.kSmartListPeriodKey] = "2weeks"
        }
    }
    
    @Output() done   : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<any> = new EventEmitter<any>()

    public showPeriodTable = true
    
    public readonly completedTasksType = Utils.CompletedTasksType
    public readonly completedTasksPeriod = {
        "none"  : "Today",
        "1day"  : "Yesterday",
        "2days" : "2 days ago",
        "3days" : "3 days ago",
        "1week" : "1 week ago",
        "2weeks": "2 weeks ago"
    }

    public keys(object : any) {
        return Object.keys(object)
    }

    public determineShowPeriodTable() {
        this.showPeriodTable = this._smartList.completedTaskFilter[SmartListCompletedTasksComponent.kSmartListTypeKey] != 'active'
    }

    selectCompletedTasksType(type : string) {
        if (this.completedTasksType[type] == undefined) return
        this._smartList.completedTaskFilter[SmartListCompletedTasksComponent.kSmartListTypeKey] = type
        this.determineShowPeriodTable()
        this.change.emit()
    }

    selectCompletedTasksPeriod(period : string) {
        if (this.completedTasksPeriod[period] == undefined) return
        this._smartList.completedTaskFilter[SmartListCompletedTasksComponent.kSmartListPeriodKey] = period
        this.change.emit()
    }
}
