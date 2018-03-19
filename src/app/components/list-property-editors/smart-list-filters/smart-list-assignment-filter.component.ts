import { Component, Input, Output, EventEmitter} from '@angular/core'
import { 
    TCSmartListFilterGroup,
    SmartListUserAssignmentFilter,
    TCSmartListUserAssignmentFilter
} from '../../../classes/tc-smart-list-filters'
import { TCListMembershipService } from '../../../services/tc-list-membership.service'
import { TCAccount } from '../../../classes/tc-account'

import { FilterScreens } from './smart-list-filters.component'
import { Utils } from '../../../tc-utils'
import { Subscription } from 'rxjs/Rx'

interface AssignmentFilterRow {
    userName : string,
    userId   : string
}

abstract class AssignmentFilterSection {
    abstract get rows() : AssignmentFilterRow[]
    public filter : SmartListUserAssignmentFilter

    select(row : AssignmentFilterRow) {
        this.filter.assignment = [row.userId]
    }

    isSelected(row : AssignmentFilterRow) {
        return this.filter.assignment.includes(row.userId)
    }
}

class AssignmentFilterGenericUsersSection extends AssignmentFilterSection {
    private readonly _rows : AssignmentFilterRow[] = [
        { userName : "Anyone",     userId : Utils.ALL_USERS_ID },
        { userName : "Unassigned", userId : Utils.UNASSIGNED_ID }
    ]
    get rows() : AssignmentFilterRow[] {
        return this._rows
    }
}

class AssignmentFilterUsersSection extends AssignmentFilterSection {
    private _rows : AssignmentFilterRow[] = []

    constructor(
        private readonly membershipService : TCListMembershipService
    ) {
        super()
        membershipService.getAllSharedListMembers().subscribe((users : TCAccount[]) => {
            this._rows = users.map(u => { 
                return { userName : u.displayName(), userId : u.userID } 
            })
        })
    }

    get rows() : AssignmentFilterRow[] {
        return this._rows
    }
}

@Component({
    selector : 'smart-list-assignment-filter',
    templateUrl : 'smart-list-assignment-filter.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-assignment-filter.component.css']
})
export class SmartListUserAssignmentFilterComponent  {
    @Output() done : EventEmitter<any> = new EventEmitter<any>()

    public readonly sections : AssignmentFilterSection[] = [
        new AssignmentFilterGenericUsersSection(),
        new AssignmentFilterUsersSection(this.membershipService)
    ]

    private _filterGroup : TCSmartListFilterGroup
    private subscription : Subscription = new Subscription()
    @Input() set filterGroup(group : TCSmartListFilterGroup) {
        this._filterGroup = group

        const filter = new TCSmartListUserAssignmentFilter(this._filterGroup)

        for (let section of this.sections) {
            section.filter = filter
        }

        this.subscription.unsubscribe()
        this.subscription = this.done.subscribe((e) => filter.setInFilterGroup(this._filterGroup))
    }

    constructor(
        private readonly membershipService : TCListMembershipService
    ) {
        this.sections = [
            new AssignmentFilterGenericUsersSection(),
            new AssignmentFilterUsersSection(this.membershipService)
        ]
    }
}
