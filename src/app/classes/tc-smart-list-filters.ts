import { Utils } from '../tc-utils'

export interface SmartListFullFilter {
    showListForTasks? : boolean,
    showSubtasks? : boolean,
    excludeStartDates? : boolean,
    filterGroups? : SmartListFilterGroup[],
    excludeLists? : string[],
    completedTasks?: TCCompletedTasksFilter,
    defaultList?: string
}

export interface SmartListFilterGroup {
    tags?       : SmartListTagFilter,
    priority?   : string[],
    starred?    : boolean,
    assignment? : string[],
    actionType? : string[],
    name?       : SmartListNameFilter,
    note?       : SmartListNoteFilter,
    taskType?   : string[],
    dueDate?    : SmartListDateFilter,
    startDate?  : SmartListDateFilter,
    modifiedDate?  : SmartListDateFilter,
    completedDate? : SmartListDateFilter
}

export const SmartListFilterLabels : Object = {
    tags          : "Tags",
    dueDate       : "Due date",
    completedDate : "Completed date",
    modifiedDate  : "Modified date",
    startDate     : "Start date",
    priority      : "Priority",
    starred       : "Starred",
    name          : "Task name",
    note          : "Note",
    taskType      : "Task type",
    actionType    : "Task action",
    assignment    : "Assigned to",
}

export abstract class SmartListFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        Object.assign(group, this.toJSON())
    }

    abstract toJSON() : any
}

export interface TCCompletedTasksFilter {
    type   : string,
    period : string,
}

export interface SmartListTagFilter {
    tags : string[],
    comparator : string
}

export interface SmartListPriorityFilter {
    priority : string[]
}

export interface SmartListStarredFilter {
    starred : boolean
}

export interface SmartListActionTypeFilter {
    actionType : string[]
}

export interface SmartListTaskTypeFilter {
    taskType : string[]
}

export interface SmartListUserAssignmentFilter {
    assignment : string[]
}

export interface SmartListSearchTerm {
    contains : boolean,
    text     : string
}

export interface SmartListSearchTermFilter {
    searchTerms : SmartListSearchTerm[]
    comparator  : string
}

export interface SmartListNameFilter extends SmartListSearchTermFilter {}

export interface SmartListNoteFilter extends SmartListSearchTermFilter {}

export interface SmartListDateRange {
    start : string,
    end : string,
}

export interface SmartListIntervalRange {
    period : string,
    start? : number,
    end? : number
}

export interface SmartListDateFilter {
    type : string,
    relation : string, 
    
    // Exact relations use these properties
    date? : string, // Either a specific day
    dateRange? : SmartListDateRange, // Or a date range

    // Relative relations use these properties
    period? : string,   // Stores the kind of period (day, week, month, etc)
    value? : number, // The number of relative periods

    // Relative interval
    intervalRangeStart? : SmartListIntervalRange,
    intervalRangeEnd? : SmartListIntervalRange
}

export class TCSmartListFilterGroup implements SmartListFilterGroup {
    tags?           : SmartListTagFilter
    priority?       : string[]
    starred?        : boolean
    assignment?     : string[]
    actionType?     : string[]
    name?           : SmartListNameFilter
    note?           : SmartListNoteFilter
    taskType?       : string[]
    dueDate?        : SmartListDateFilter
    startDate?      : SmartListDateFilter
    modifiedDate?   : SmartListDateFilter
    completedDate?  : SmartListDateFilter
}

export class TCSmartListStarredFilter extends SmartListFilter implements SmartListStarredFilter  {
    starred : boolean = false

    constructor(filter? : SmartListStarredFilter | SmartListFilterGroup) {
        super()
        if (filter && filter.starred) {
            this.starred = filter.starred
        }
    }

    toJSON() : any {
        return { starred : this.starred }
    }
}

export class TCSmartListPriorityFilter  extends SmartListFilter implements SmartListPriorityFilter {
    static readonly PriorityNone = 'none'
    static readonly PriorityLow  = 'low'
    static readonly PriorityMedium  = 'med'
    static readonly PriorityHigh = 'high'

    priority : string[] = [TCSmartListPriorityFilter.PriorityNone]

    constructor(filter? : SmartListPriorityFilter | SmartListFilterGroup) {
        super()
        if (filter && filter.priority) {
            this.priority = filter.priority
        }
    }

    toJSON() : any {
        return { priority : this.priority }
    }
}

export class TCSmartListTagsFilter extends SmartListFilter implements SmartListTagFilter {
    tags : string[] = ["Any Tag"]
    comparator : string = "and"

    constructor(filter? : SmartListTagFilter) {
        super()
        if (filter) {
            this.tags = filter.tags
            this.comparator = filter.comparator
        }
    }

    setInFilterGroup(group : SmartListFilterGroup) {
        group.tags = this.toJSON()
    }

    toJSON() {
        return { 
            tags : this.tags,
            comparator : this.comparator
        }
    }
}

export class TCSmartListActionTypeFilter extends SmartListFilter implements SmartListActionTypeFilter {
    static readonly TypeNone     : string = 'none'
    static readonly TypeURL      : string = 'url'
    static readonly TypeContact  : string = 'contact'
    static readonly TypeLocation : string = 'location'

    actionType : string[] = []

    constructor(filter? : SmartListActionTypeFilter | SmartListFilterGroup) {
        super()
        if (filter && filter.actionType) {
            this.actionType = filter.actionType
        }
    }

    toJSON() {
        return { actionType : this.actionType }
    }
}

export class TCSmartListTaskTypeFilter extends SmartListFilter implements SmartListTaskTypeFilter {    
    static readonly TypeNormal    : string = 'normal'
    static readonly TypeProject   : string = 'project'
    static readonly TypeChecklist : string = 'checklist'

    taskType : string[] = []

    constructor(filter? : SmartListTaskTypeFilter | SmartListFilterGroup) {
        super()
        if(filter && filter.taskType) {
            this.taskType = filter.taskType
        }
    }

    toJSON() {
        return { taskType : this.taskType }
    }
}

export class TCSmartListUserAssignmentFilter extends SmartListFilter implements SmartListUserAssignmentFilter {
    assignment : string[] = []

    constructor(filter? : SmartListUserAssignmentFilter | SmartListFilterGroup) {
        super()
        if(filter && filter.assignment) {
            this.assignment = filter.assignment
        }
        else {
            this.assignment = [Utils.UNASSIGNED_ID]
        }
    }

    toJSON() {
        return { assignment : this.assignment }
    }
}

export class TCSmartListSearchTerm implements SmartListSearchTerm {
    constructor(
        public text : string, 
        public contains : boolean = true
    ) {}
}

export class TCSmartListSearchTermFilter extends SmartListFilter implements SmartListSearchTermFilter {
    searchTerms : SmartListSearchTerm[] = []
    comparator  : string = "and"

    constructor(filter? : SmartListNameFilter) {
        super()
        if (filter) {
            this.searchTerms = filter.searchTerms
            this.comparator = filter.comparator
        }
    }

    toJSON() {
        return {
            searchTerms : this.searchTerms,
            comparator  : this.comparator
        }
    }
}

export class TCSmartListNameFilter extends TCSmartListSearchTermFilter implements SmartListNameFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.name = this.toJSON()
    }
}

export class TCSmartListNoteFilter extends TCSmartListSearchTermFilter implements SmartListNoteFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.note = this.toJSON()
    }
}

export class TCSmartListDateFilter extends SmartListFilter implements SmartListDateFilter {
    static readonly TypeNone : string = "none"
    static readonly TypeAny  : string = "any"
    static readonly TypeIs   : string = "is"
    static readonly TypeNot  : string = "not"
    static readonly TypeAfter: string = "after"
    static readonly TypeBefore : string = "before"

    static readonly RelationExact    : string = "exact"
    static readonly RelationRelative : string = "relative"

    static readonly PeriodDay   : string = "day"
    static readonly PeriodWeek  : string = "week"
    static readonly PeriodMonth	: string = "month"
    static readonly PeriodYear  : string = "year"

    type     : string = TCSmartListDateFilter.TypeNone
    relation : string = TCSmartListDateFilter.RelationExact
    
    // Exact relations use these properties
    date? : string // Either a specific day
    dateRange? : SmartListDateRange // Or a date range

    // Relative relations use these properties
    period? : string   // Stores the kind of period (day, week, month, etc)
    value? : number // The number of relative periods

    // Relative interval
    intervalRangeStart? : SmartListIntervalRange
    intervalRangeEnd? : SmartListIntervalRange

    constructor(filter? : SmartListDateFilter) {
        super()
        if (filter) {
            this.type = filter.type
            this.relation = filter.relation

            if (filter.relation == TCSmartListDateFilter.RelationExact) {
                if (filter.date) this.date = filter.date
                if (filter.dateRange) this.dateRange = filter.dateRange
            }
            if (filter.relation == TCSmartListDateFilter.RelationRelative) {
                if (filter.period) this.period = filter.period
                if (filter.value) this.value = filter.value
                if (filter.intervalRangeStart) this.intervalRangeStart = filter.intervalRangeStart
                if (filter.intervalRangeEnd) this.intervalRangeEnd = filter.intervalRangeEnd
            }
        }
    }

    toJSON() {
        let result = { 
            type : this.type,
            relation : this.relation
         }

         if (this.date && this.relation == TCSmartListDateFilter.RelationExact) {
            Object.assign(result, {date : this.date})
         }
         if (this.dateRange && this.relation == TCSmartListDateFilter.RelationExact) {
            Object.assign(result, { dateRange : { start : this.dateRange.start, end : this.dateRange.end }})
         }
         if (this.period && this.relation == TCSmartListDateFilter.RelationRelative) {
            Object.assign(result, { period : this.period, value : this.value })
         }
         if (this.intervalRangeStart && this.intervalRangeEnd && this.relation == TCSmartListDateFilter.RelationRelative) {
            Object.assign(result, { intervalRangeStart : this.intervalRangeStart, intervalRangeEnd : this.intervalRangeEnd })
         }

        return result
    }
}

export class TCSmartListDueDateFilter extends TCSmartListDateFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.dueDate = this.toJSON()
    }
}

export class TCSmartListStartDateFilter extends TCSmartListDateFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.startDate = this.toJSON()
    }
}

export class TCSmartListModifiedDateFilter extends TCSmartListDateFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.modifiedDate = this.toJSON()
    }
}

export class TCSmartListCompletedDateFilter extends TCSmartListDateFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        group.completedDate = this.toJSON()
    }
}

export class SmartListStubFilter extends SmartListFilter {
    setInFilterGroup(group : SmartListFilterGroup) {
        // null op
    }

    toJSON() {
        return {}
    }
}