import { Component, Output, Input, EventEmitter } from '@angular/core'
import { TCSmartList } from '../../classes/tc-smart-list'
import { Utils } from '../../tc-utils'

export enum SmartListCreateType {
    Focus = 1,
    Important,
    Someday,
    AssignedToYou,
    NextSevenDays,
    Today,
    Overdue,
    Projects,
    RecentlyModified,
    Custom
}

@Component({
    selector : 'smart-list-create',
    templateUrl : 'smart-list-create.component.html',
    styleUrls : ['../../../assets/css/list-editors.css', 'smart-list-create.component.css']
})

export class SmartListCreateComponent {
    @Input() smartList : TCSmartList

    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() typeSelected : EventEmitter<SmartListCreateType> = new EventEmitter<SmartListCreateType>()

    SmartListCreateType = SmartListCreateType

    smartListTypeSelected(listType : SmartListCreateType) {
        let jsonFilter = "{}"
        let iconName = null
        let listName = "New Smart List"
        let color = null

        switch(listType) {
            case SmartListCreateType.Focus: {
                listName = "Focus"
                jsonFilter = Utils.SmartListFilter.Focus
                iconName = "twf-focus-smart-list"
                color = '#ef6c00'
                break
            }
            case SmartListCreateType.Important: {
                listName = "Important"
                jsonFilter = Utils.SmartListFilter.Important
                iconName = "twf-important-smart-list"
                color = '#ffee58'
                break
            }
            case SmartListCreateType.Someday: {
                listName = "Someday"
                jsonFilter = Utils.SmartListFilter.Someday
                iconName = "twf-someday-smart-list"
                color = '#9e9e9e'
                break
            }
            case SmartListCreateType.AssignedToYou: {
                listName = "Assigned to you"
                jsonFilter = Utils.SmartListFilter.AssignedToYou
                break
            }
            case SmartListCreateType.NextSevenDays: {
                listName = "Next seven days"
                jsonFilter = Utils.SmartListFilter.NextSevenDays
                break
            }
            case SmartListCreateType.Today: {
                listName = "Today"
                jsonFilter = Utils.SmartListFilter.Today
                break
            }
            case SmartListCreateType.Overdue: {
                listName = "Overdue"
                jsonFilter = Utils.SmartListFilter.Overdue
                break
            }
            case SmartListCreateType.Projects: {
                listName = "Projects"
                jsonFilter = Utils.SmartListFilter.Projects
                break
            }
            case SmartListCreateType.RecentlyModified: {
                listName = "Recently modified"
                jsonFilter = Utils.SmartListFilter.RecentlyModified
                break
            }
        }
        
        this.smartList.name = listName
        if (iconName) {
            this.smartList.iconName = iconName
        }
        this.smartList.color = (color) ? color : Utils.randomListColor()
        this.smartList.filter = JSON.parse(jsonFilter)
        if (this.smartList.filter.completedTasks) this.smartList.completedTaskFilter = this.smartList.filter.completedTasks
            
        this.typeSelected.emit(listType)
    }
}