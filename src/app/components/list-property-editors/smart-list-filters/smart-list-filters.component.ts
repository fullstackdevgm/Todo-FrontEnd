import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCSmartList } from '../../../classes/tc-smart-list'
import { 
    TCSmartListFilterGroup,
    SmartListFilterLabels,
    SmartListFilter,
    TCSmartListStarredFilter, 
    TCSmartListPriorityFilter,
    TCSmartListTagsFilter,
    TCSmartListActionTypeFilter,
    TCSmartListTaskTypeFilter,
    SmartListStubFilter
} from '../../../classes/tc-smart-list-filters'

export enum FilterScreens {
    Tags,
    DueDate,
    CompletedDate,
    ModifiedDate,
    StartDate,
    Priority,
    Starred,
    TaskName,
    Note,
    TaskType,
    TaskAction,
    AssignedTo,
    Main = -1
}

interface FilterRow {
    screen : FilterScreens,
    key : string,
    filter : () => SmartListFilter
}

@Component({
    selector : 'smart-list-filters',
    templateUrl : 'smart-list-filters.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-filters.component.css']
})
export class SmartListFiltersComponent {
    public filterGroup : TCSmartListFilterGroup
    private _smartList : TCSmartList
    @Input() set smartList(smartList : TCSmartList) {
        const filterGroups = smartList.filter.filterGroups
        if (!filterGroups || filterGroups.length == 0) {
            smartList.filter.filterGroups = [ new TCSmartListFilterGroup() ]
        }

        this._smartList = smartList
        this.filterGroup = this._smartList.filter.filterGroups[0]
    }

    @Input() set showFilter(key : string) {
        const row = this.filterRows.find((e) => e.key == key)
        this.currentScreen = row ? row.screen : FilterScreens.Main
    }
    
    @Output() done   : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<any> = new EventEmitter<any>()

    public FilterScreens = FilterScreens
    public currentScreen : FilterScreens = FilterScreens.Main
    public SmartListFilterLabels = SmartListFilterLabels

    public readonly filterRows : FilterRow[] = [
        { screen: FilterScreens.Tags,           key: "tags",          filter: () => new TCSmartListTagsFilter(this.filterGroup["tags"]) },
        { screen: FilterScreens.DueDate,        key: "dueDate",       filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.CompletedDate,  key: "completedDate", filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.ModifiedDate,   key: "modifiedDate",  filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.StartDate,      key: "startDate",     filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.Starred,        key: "starred",       filter: () => new TCSmartListStarredFilter(this.filterGroup) },
        { screen: FilterScreens.Priority,       key: "priority",      filter: () => new TCSmartListPriorityFilter(this.filterGroup) },
        { screen: FilterScreens.TaskName,       key: "name",          filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.Note,           key: "note",          filter: () => new SmartListStubFilter() },
        { screen: FilterScreens.TaskType,       key: "taskType",      filter: () => new TCSmartListTaskTypeFilter(this.filterGroup) },
        { screen: FilterScreens.TaskAction,     key: "actionType",    filter: () => new TCSmartListActionTypeFilter(this.filterGroup) },
        { screen: FilterScreens.AssignedTo,     key: "assignment",    filter: () => new SmartListStubFilter() }
    ]

    public get showDateFilterScreen() : boolean {
        return  this.currentScreen == FilterScreens.DueDate       ||
                this.currentScreen == FilterScreens.CompletedDate ||
                this.currentScreen == FilterScreens.ModifiedDate  ||
                this.currentScreen == FilterScreens.StartDate
    }

    show(screen : FilterScreens) {
        this.currentScreen = screen
    }

    private filterGroupHasKey(key : string) : boolean {
        const filter = this._smartList.filter
        const filterGroups = filter.filterGroups
        if (!filterGroups || filterGroups.length == 0) return false

        return (filterGroups[0][key]) ? true : false
    }

    private selectSmartListFilter(filterRow) {
        if (this.filterGroupHasKey(filterRow.key)) return
        
        if (filterRow.screen == FilterScreens.Starred || filterRow.screen == FilterScreens.Priority) {
            const filter = filterRow.filter()
            if (filterRow.screen == FilterScreens.Starred) {
                filter.starred = true
            }

            filter.setInFilterGroup(this.filterGroup)
            this.done.emit()

            return 
        }
        
        this.show(filterRow.screen)
    }
}
