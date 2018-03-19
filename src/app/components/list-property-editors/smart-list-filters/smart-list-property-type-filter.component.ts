import { Component, Input, Output, EventEmitter} from '@angular/core'
import { 
    TCSmartListFilterGroup,
    SmartListFilter,
    TCSmartListActionTypeFilter,
    TCSmartListTaskTypeFilter
} from '../../../classes/tc-smart-list-filters'
import { FilterScreens } from './smart-list-filters.component'

interface PropertyTypeFilterRow {
    label : string,
    type  : string
}

export abstract class PropertyTypeFilterModule {
    protected abstract get filter() : SmartListFilter
    protected abstract get filterPropertyKey() : string

    abstract get title() : string
    abstract get rows() : PropertyTypeFilterRow[]
    abstract set filterGroup(group : TCSmartListFilterGroup)

    select(row : PropertyTypeFilterRow, group : TCSmartListFilterGroup) {
        if (this.filter[this.filterPropertyKey].includes(row.type)) {
            this.filter[this.filterPropertyKey] = this.filter[this.filterPropertyKey].filter((val) => val != row.type )
        }
        else { 
            this.filter[this.filterPropertyKey].push(row.type)
        }

        this.filter.setInFilterGroup(group)

        if (this.filter[this.filterPropertyKey].length == 0) {
            delete group[this.filterPropertyKey]
        }
    }

    includes(property : string) : boolean {
        return this.filter[this.filterPropertyKey].includes(property)
    }
}

class TaskTypeFilterModule extends PropertyTypeFilterModule {
    protected filter : TCSmartListTaskTypeFilter = new TCSmartListTaskTypeFilter()
    protected filterPropertyKey = 'taskType'

    get title() { return "Task Type" }

    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListTaskTypeFilter(group)
    }

    private readonly _rows : PropertyTypeFilterRow[] = [
        { label : "Normal Task", type : TCSmartListTaskTypeFilter.TypeNormal    },
        { label : "Project",     type : TCSmartListTaskTypeFilter.TypeProject   },
        { label : "Checklist",   type : TCSmartListTaskTypeFilter.TypeChecklist }
    ]
    get rows() : PropertyTypeFilterRow[] {
        return this._rows
    }
}

class ActionTypeFilterModule extends PropertyTypeFilterModule {
    protected filter : TCSmartListActionTypeFilter = new TCSmartListActionTypeFilter()
    protected filterPropertyKey = 'actionType'

    get title() { return "Task Action" }

    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListActionTypeFilter(group)
    }

    private readonly _rows : PropertyTypeFilterRow[] = [
        { label : "None",     type : TCSmartListActionTypeFilter.TypeNone     },
        { label : "URL",      type : TCSmartListActionTypeFilter.TypeURL      },
        { label : "Contact",  type : TCSmartListActionTypeFilter.TypeContact  },
        { label : "Location", type : TCSmartListActionTypeFilter.TypeLocation }
    ]
    get rows() : PropertyTypeFilterRow[] {
        return this._rows    
    }
}

@Component({
    selector : 'smart-list-property-type-filter',
    templateUrl : 'smart-list-property-type-filter.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-property-type-filter.component.css']
})
export class SmartListPropertyTypeFilterComponent  {
    @Output() done : EventEmitter<any> = new EventEmitter<any>()

    private _filterGroup : TCSmartListFilterGroup
    @Input() set filterGroup(group : TCSmartListFilterGroup) {
        this._filterGroup = group

        if(this.propertyTypeModule) {
            this.propertyTypeModule.filterGroup = group
        }
    }

    public propertyTypeModule : PropertyTypeFilterModule = null
    @Input() set screen(screen : FilterScreens) {
        if (screen == FilterScreens.TaskAction) {
            this.propertyTypeModule = new ActionTypeFilterModule()
        }
        if (screen == FilterScreens.TaskType) {
            this.propertyTypeModule = new TaskTypeFilterModule()
        }

        if (this.propertyTypeModule && this._filterGroup) {
            this.propertyTypeModule.filterGroup = this._filterGroup
        }
    }
    
    select(row : PropertyTypeFilterRow) {
        if (!this.propertyTypeModule) return

        this.propertyTypeModule.select(row, this._filterGroup)
    }

    filterIncludes(property : string) : boolean {
        if (!this.propertyTypeModule) return false
        return this.propertyTypeModule.includes(property)
    }
}
