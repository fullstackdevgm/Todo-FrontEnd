import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'
import {
    TCSmartListFilterGroup,
    SmartListFilterLabels,
    TCSmartListPriorityFilter,
    TCSmartListDateFilter,
    TCSmartListActionTypeFilter,
    TCSmartListTaskTypeFilter,
    SmartListDateFilter
}
from '../../classes/tc-smart-list-filters'
import { TCAccount } from '../../classes/tc-account'
import { TCAccountService } from '../../services/tc-account.service'
import { TCListMembershipService } from '../../services/tc-list-membership.service'
import { Utils } from '../../tc-utils'
import { PropertyTypeFilterModule } from '../list-property-editors/smart-list-filters/smart-list-property-type-filter.component'

interface PriorityFilterRow {
    label : string,
    type  : string
}

class PriorityTypeFilterModule extends PropertyTypeFilterModule{
    protected filter : TCSmartListPriorityFilter = new TCSmartListPriorityFilter()
    protected filterPropertyKey = 'priority'

    get title() { return "Priority" }

    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListPriorityFilter(group)
    }

    private readonly _rows : PriorityFilterRow[] = [
        { label : "None",   type : TCSmartListPriorityFilter.PriorityNone   },
        { label : "Low",    type : TCSmartListPriorityFilter.PriorityLow    },
        { label : "Medium", type : TCSmartListPriorityFilter.PriorityMedium },
        { label : "High",   type : TCSmartListPriorityFilter.PriorityHigh   }
    ]
    get rows() : PriorityFilterRow[] {
        return this._rows
    }

    select(row : PriorityFilterRow, group : TCSmartListFilterGroup) {
        super.select(row, group)
        if (this.filter.priority.length <= 0) this.filter.priority.push(TCSmartListPriorityFilter.PriorityNone)
    }
}

@Component({
    selector: 'smart-list-edit-filter-row',
    templateUrl: 'smart-list-edit-filter-row.component.html',
    styleUrls: ['../../../assets/css/list-editors.css', 'smart-list-edit.component.css', 'smart-list-edit-filter-row.component.css']
})
export class SmartListEditFilterRow implements OnInit {
    @Output() showFilter : EventEmitter<{ key : string }> = new EventEmitter<{ key : string }>()

    @Input() filterGroup : TCSmartListFilterGroup
    @Input() key         : string

    private sharedListMembers : TCAccount[] = []

    private myDisplayName : string = "Me"

    get isPriority() : boolean {
        return this.key == 'priority'
    }

    get isStarred() : boolean {
        return this.key == 'starred'
    }

    get starred() : boolean {
        if (!this.isStarred) return false
        return this.filterGroup.starred
    }
    set starred(starred : boolean) {
        if (!this.isStarred) return
        this.filterGroup.starred = starred
    }

    constructor(
        private readonly membershipService : TCListMembershipService,
        private readonly accountService : TCAccountService
    ) {}

    ngOnInit() {
        this.membershipService.getAllSharedListMembers().subscribe(m => this.sharedListMembers = m)
        this.priorityModule.filterGroup = this.filterGroup

        this.accountService.account.subscribe((account : TCAccount) => {
            this.myDisplayName = account.displayName()
        })
    }

    priorityModule = new PriorityTypeFilterModule()

    getFilterInformationLabel(key : string) : string {
        const defaultLabel = "None"
        
        const dateFilterFunction = (filter : SmartListDateFilter) =>
        () : string => {
            if (!filter) return defaultLabel
            if (filter.type == TCSmartListDateFilter.TypeAny)    return "Any"
            if (filter.type == TCSmartListDateFilter.TypeNone)   return "None"
            if (filter.type == TCSmartListDateFilter.TypeBefore) return "Before a Date"
            if (filter.type == TCSmartListDateFilter.TypeAfter)  return "After a Date"
            else return "Selected Date or Range"
        }

        const keyToMessage = {
            tags : () : string => {
                if (!this.filterGroup.tags) return defaultLabel

                const comparator : string = this.filterGroup.tags.comparator
                return this.filterGroup.tags.tags.reduce((accum : string, val : string) : string => {
                    if (val.length == 0) return accum
                    return accum.length > 0 ? `${accum} ${comparator} ${val}` : val
                }, "")
            },
            name : () : string => {
                if (!this.filterGroup.name) return defaultLabel
                
                const comparator : string = this.filterGroup.name.comparator
                return this.filterGroup.name.searchTerms.reduce((accum : string, val) : string => {
                    if (val.text.length == 0) return accum
                    return accum.length > 0 ? `${accum} ${comparator} ${val.text}` : val.text
                }, "")
            },
            note : () : string => {
                if (!this.filterGroup.note) return defaultLabel
                
                const comparator : string = this.filterGroup.note.comparator
                return this.filterGroup.note.searchTerms.reduce((accum : string, val) : string => {
                    if (val.text.length == 0) return accum
                    return accum.length > 0 ? `${accum} ${comparator} ${val.text}` : val.text
                }, "")
            },
            taskType : () : string => {
                if (!this.filterGroup.taskType) return defaultLabel

                let typeToMessage : any = {}
                typeToMessage[TCSmartListTaskTypeFilter.TypeNormal]    = 'Normal'
                typeToMessage[TCSmartListTaskTypeFilter.TypeProject]   = 'Project'
                typeToMessage[TCSmartListTaskTypeFilter.TypeChecklist] = 'Checklist'
                
                return this.filterGroup.taskType.reduce((accum : string, val : string) : string => {
                    if (val.length == 0) return accum
                    return accum.length > 0 ? `${accum}, ${typeToMessage[val]}` : typeToMessage[val]
                }, "")
            },
            actionType : () : string => {
                if (!this.filterGroup.actionType) return defaultLabel
                
                let typeToMessage : any = {}
                typeToMessage[TCSmartListActionTypeFilter.TypeNone]     = 'None'
                typeToMessage[TCSmartListActionTypeFilter.TypeURL]      = 'URL'
                typeToMessage[TCSmartListActionTypeFilter.TypeContact]  = 'Contact'
                typeToMessage[TCSmartListActionTypeFilter.TypeLocation] = 'Location'

                return this.filterGroup.actionType.reduce((accum : string, val : string) : string => {
                    if (val.length == 0) return accum
                    return accum.length > 0 ? `${accum}, ${typeToMessage[val]}` : typeToMessage[val]
                }, "")
            },
            assignment : () : string => {
                if (!this.filterGroup.assignment) return defaultLabel
                if (this.filterGroup.assignment.find(a => a == Utils.ALL_USERS_ID)) return "Anyone"
                if (this.filterGroup.assignment.find(a => a == Utils.UNASSIGNED_ID)) return "Unassigned"
                if (this.filterGroup.assignment.find(a => a == Utils.ME_USER_ID)) {
                    return this.myDisplayName
                }
                return this.sharedListMembers.reduce((accum : string, member) : string => {
                    if (this.filterGroup.assignment.find(a => a == member.userID)) {
                        return member.displayName()
                    }
                    return accum
                }, "Someone")
            },
            dueDate : dateFilterFunction(this.filterGroup.dueDate),
            completedDate : dateFilterFunction(this.filterGroup.completedDate),
            modifiedDate : dateFilterFunction(this.filterGroup.modifiedDate),
            startDate : dateFilterFunction(this.filterGroup.startDate)
        }

        const labelFunction = keyToMessage[key]

        return labelFunction ? labelFunction() : defaultLabel
    }

    getFilterLabel(key : string) : string {
        return SmartListFilterLabels[key]
    }

    deleteFilter() {
        delete this.filterGroup[this.key]
    }
}