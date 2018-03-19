import {ViewChild, Component, Input, Output, OnInit, EventEmitter, ElementRef } from '@angular/core'
import { 
    TCSmartListFilterGroup,
    TCSmartListDateFilter,
    TCSmartListStartDateFilter,
    TCSmartListDueDateFilter,
    TCSmartListModifiedDateFilter,
    TCSmartListCompletedDateFilter,
    SmartListDateRange,
    SmartListIntervalRange
} from '../../../classes/tc-smart-list-filters'
import { FilterScreens } from './smart-list-filters.component'
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';

interface DateFilterTypeRow {
    title : string,
    type  : string
}

interface BasicDateFilterTypeRow extends DateFilterTypeRow {
    description : string
}

interface RelationRow {
    title       : string,
    description : string,
    relation    : string
}

interface RelativeDate {
    period : string,
    value  : number
}

interface DateRange {
    start : Date,
    end : Date
}

abstract class DateFilterModule {
    abstract get filter() : TCSmartListDateFilter
    abstract get title() : string
    abstract set filterGroup(group : TCSmartListFilterGroup)

    set type(type : string) {
        this.filter.type = type
    }
    get type() {
        return this.filter.type
    }

    set relation(relation : string) { 
        this.filter.relation = relation
    }
    get relation() : string { 
        return this.filter.relation 
    }

    get shouldShowDetailScreen() : boolean { 
        return this.filter.type != TCSmartListDateFilter.TypeNone &&
               this.filter.type != TCSmartListDateFilter.TypeAny
    }

    get isRegularDateType() : boolean {
        return this.filter.type == TCSmartListDateFilter.TypeIs || 
               this.filter.type == TCSmartListDateFilter.TypeNot
    }

    get isExclusionDateType() : boolean {
        return this.filter.type == TCSmartListDateFilter.TypeNot
    }
    set isExclusionDateType(exclude : boolean) {
        this.filter.type = exclude ? TCSmartListDateFilter.TypeNot : TCSmartListDateFilter.TypeIs
    }

    get isBeforeDateType() : boolean {
        return this.filter.type == TCSmartListDateFilter.TypeBefore
    }

    get isAfterDateType() : boolean {
        return this.filter.type == TCSmartListDateFilter.TypeAfter
    }

    get isExact() : boolean {
        return this.filter.relation == TCSmartListDateFilter.RelationExact
    }

    get isRelative() : boolean {
        return this.filter.relation == TCSmartListDateFilter.RelationRelative
    }

    get useDateRange() : boolean {
        return this.filter.dateRange || (this.filter.intervalRangeStart && this.filter.intervalRangeEnd) ? true : false
    }
    set useDateRange(use  : boolean) {
        if (use) {
            if (this.isExact) {
                // Lazy initialize a date range
                this.dateRange = this.dateRange
            }
            else if (this.isRelative) {
                // Lazy initialize a relative date range
                this.relativeDateRange = this.relativeDateRange
            }

            delete this.filter.date
            delete this.filter.period
            delete this.filter.value
        }
        else {
            delete this.filter.dateRange
            delete this.filter.intervalRangeEnd
            delete this.filter.intervalRangeStart
        }
    }

    get date() : Date {
        if (this.filter.date) return new Date(Date.parse(this.filter.date))
        return new Date()
    }
    set date(date : Date) {
        this.filter.date = date.toISOString()
    }

    get dateRange() : DateRange {
        if (this.filter.dateRange) {
            const start = new Date(Date.parse(this.filter.dateRange.start))
            const end = new Date(Date.parse(this.filter.dateRange.end))
            return { start : start, end : end }
        }
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 1)
        return { start : new Date(), end : endDate}
    }
    set dateRange(range : DateRange) {
        this.filter.dateRange = { start : range.start.toISOString(), end : range.end.toISOString() }
    }

    get relativeDate() : RelativeDate {
        let result
        if (this.filter.period && this.filter.value) result =  { period : this.filter.period, value : this.filter.value }
        else result = { period : TCSmartListDateFilter.PeriodDay, value : 0 }
        return result
    }
    set relativeDate(date : RelativeDate) {
        this.filter.period = date.period
        this.filter.value  = date.value
    }

    get relativeDateRange() : {start : RelativeDate, end : RelativeDate} {
        if (this.filter.intervalRangeStart && 
            this.filter.intervalRangeEnd &&
            this.filter.intervalRangeStart.period &&
            this.filter.intervalRangeStart.start !== undefined &&
            this.filter.intervalRangeStart.end !== undefined &&
            this.filter.intervalRangeEnd.period) {
                return {
                    start : {
                        period : this.filter.intervalRangeStart.period,
                        value : this.filter.intervalRangeStart.start
                    },
                    end : {
                        period : this.filter.intervalRangeEnd.period,
                        value : this.filter.intervalRangeStart.end
                    }
                }
        }
        return {
            start : { period : TCSmartListDateFilter.PeriodDay, value : 0 },
            end   : { period : TCSmartListDateFilter.PeriodDay, value : 1 }
        }
    }
    set relativeDateRange(range : {start : RelativeDate, end : RelativeDate} ) {
        this.filter.intervalRangeStart = {
            period : range.start.period,
            start : range.start.value,
            end : range.end.value
        }
        this.filter.intervalRangeEnd = {
            period : range.end.period
        }
    }

    get dateModel() : NgbDateStruct {
        // NgbDateStruct months are 1-12, ES Date objects use 0-11
        return { 
            year  : this.date.getFullYear(), 
            month : this.date.getMonth() + 1, 
            day   : this.date.getDate()
        }
    }
    set dateModel(model : NgbDateStruct) {
        this.filter.date = new Date(model.year, model.month - 1, model.day).toISOString()
    }

    get dateRangeModel() : { start : NgbDateStruct, end : NgbDateStruct } {
        return {
            start : {
                year  : this.dateRange.start.getFullYear(), 
                month : this.dateRange.start.getMonth() + 1, 
                day   : this.dateRange.start.getDate()
            },
            end : {
                year  : this.dateRange.end.getFullYear(), 
                month : this.dateRange.end.getMonth() + 1, 
                day   : this.dateRange.end.getDate()
            }
        }
    }
    set dateRangeModel(rangeModel : { start : NgbDateStruct, end : NgbDateStruct }) {
        const start = new Date(rangeModel.start.year, rangeModel.start.month - 1, rangeModel.start.day).toISOString()
        const end = new Date(rangeModel.end.year, rangeModel.end.month - 1, rangeModel.end.day).toISOString()

        this.filter.dateRange = { start : start, end : end }
    }
}

class DueDateFilterModule extends DateFilterModule {
    filter = new TCSmartListDueDateFilter()
    get title() { return "Due Date" }
    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListDueDateFilter(group.dueDate)
    }
}

class StartDateFilterModule extends DateFilterModule {
    filter = new TCSmartListStartDateFilter()
    get title() { return "Start Date" }
    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListStartDateFilter(group.startDate)
    }
}

class ModifiedDateFilterModule extends DateFilterModule {
    filter = new TCSmartListModifiedDateFilter()
    get title() { return "Modified Date" }
    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListModifiedDateFilter(group.modifiedDate)
    }
}

class CompletedDateFilterModule extends DateFilterModule {
    filter = new TCSmartListCompletedDateFilter()
    get title() { return "Completed Date" }
    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListCompletedDateFilter(group.completedDate)
    }
}

interface DateSelectorRows {
    label : string
    showPicker : boolean
}

interface ExactDateSelectorRows extends DateSelectorRows {
    model : NgbDateStruct
}

interface RelationalDateSelectorRows extends DateSelectorRows {
    relativeDate : RelativeDate
}

abstract class DateFilterDetailsModule {
    abstract get rows() : DateSelectorRows[]

    constructor(
        protected filterModule : DateFilterModule
    ) {}

    abstract setModelsInFilter()
    abstract validateRange()
}

class ExactDateFilterDetailsModule extends DateFilterDetailsModule {
    private _singleRowMode : ExactDateSelectorRows[] = []
    private _dateRangeMode : ExactDateSelectorRows[] = []
    get rows() : ExactDateSelectorRows[] {
        if (this._singleRowMode.length == 0) {
            this._singleRowMode = [
                { label : "Date", model : this.filterModule.dateModel, showPicker : false }
            ]
        }
        
        if (this._dateRangeMode.length == 0) {
            const rangeModel = this.filterModule.dateRangeModel
            this._dateRangeMode = [
                { label : "Start", model : rangeModel.start, showPicker : false },
                { label : "End",   model : rangeModel.end,   showPicker : false }
            ]
        }
        
        return this.filterModule.useDateRange ? this._dateRangeMode : this._singleRowMode
    }

    setModelsInFilter() {
        if(this.filterModule.useDateRange) {
            this.filterModule.dateRangeModel = { start : this.rows[0].model, end : this.rows[1].model }
        }
        else { 
            this.filterModule.dateModel = this.rows[0].model
        }
    }

    /** Returns positive if a is after b, negative if b is after a,
     *  and zero if they're equal.
     * 
     *  Said another way, if the date of a is greater than the date of b,
     *  a positive number is returned, if the date of a is less than the
     *  date b, a negative number is returned.
     */
    modelCompare(a : NgbDateStruct, b : NgbDateStruct) : number {
        if (a.year != b.year) return a.year - b.year
        if (a.month != b.month) return a.month - b.month
        if (a.day != b.day) return a.day - b.day

        return 0
    }

    validateRange() {
        if (!this.filterModule.useDateRange) return

        if (this.modelCompare(this.rows[0].model, this.rows[1].model) > 0) {
            this.rows[0].model = {
                year : this.rows[1].model.year,
                month : this.rows[1].model.month,
                day : this.rows[1].model.day
            }
        }
    }
}

class RelationalDateFilterDetailsModule extends DateFilterDetailsModule {
    private _singleRowMode : RelationalDateSelectorRows[] = []
    private _dateRangeMode : RelationalDateSelectorRows[] = []
    get rows() : RelationalDateSelectorRows[] {
        if (this._singleRowMode.length == 0) {
            const relativeDate = this.filterModule.relativeDate
            this._singleRowMode = [
                { label : "Date", relativeDate : { period : relativeDate.period, value : relativeDate.value }, showPicker : false }
            ]
        }
        
        if (this._dateRangeMode.length == 0) {
            const relativeRange = this.filterModule.relativeDateRange
            const start = { period : relativeRange.start.period, value : relativeRange.start.value }
            const end   = { period : relativeRange.end.period,   value : relativeRange.end.value   }
            this._dateRangeMode = [
                { label : "Start", relativeDate : start, showPicker : false },
                { label : "End",   relativeDate : end,   showPicker : false }
            ]
        }
        
        return this.filterModule.useDateRange ? this._dateRangeMode : this._singleRowMode
    }

    private readonly _values : number[] = []
    get values() : number[] {
        return this._values
    }

    private readonly _periods : { label : string, period : string }[] = [
        { label : "Days",   period : TCSmartListDateFilter.PeriodDay   },
        { label : "Weeks",  period : TCSmartListDateFilter.PeriodWeek  },
        { label : "Months", period : TCSmartListDateFilter.PeriodMonth },
        { label : "Years",  period : TCSmartListDateFilter.PeriodYear  }
    ]
    get periods() : { label : string, period : string }[] {
        return this._periods
    }

    constructor(filterModule : DateFilterModule) {
        super(filterModule)

        const range = 100
        for (let i = 1 - range; i < range; i++) {
            this._values.push(i)
        }
    }

    setModelsInFilter() {
        if(this.filterModule.useDateRange) {
            this.filterModule.relativeDateRange = { start : this.rows[0].relativeDate, end : this.rows[1].relativeDate }
        }
        else { 
            this.filterModule.relativeDate = this.rows[0].relativeDate
        }
    }

    /**
     * @param rel The relative date to convert to a Date object
     * @return A Date object that indicates the same date as the relative date
     */
    relativeDateToDate(rel : RelativeDate) : Date {
        const now = new Date()
        return new Date(
            rel.period == TCSmartListCompletedDateFilter.PeriodYear ? now.getFullYear() + rel.value : now.getFullYear(),
            rel.period == TCSmartListCompletedDateFilter.PeriodMonth ? now.getMonth() + rel.value : now.getMonth(),
            rel.period == TCSmartListCompletedDateFilter.PeriodWeek ? now.getDate() + (rel.value * 7) : 
            rel.period == TCSmartListCompletedDateFilter.PeriodDay ? now.getDate() + rel.value : now.getFullYear()
        )
    }
    
    validateRange() {
        if (!this.filterModule.useDateRange) return

        const startDate = this.relativeDateToDate(this.rows[0].relativeDate)
        const endDate = this.relativeDateToDate(this.rows[1].relativeDate)

        if (startDate > endDate) {
            this.rows[0].relativeDate = {
                period : this.rows[1].relativeDate.period,
                value  : this.rows[1].relativeDate.value
            }
        }
    }
}

@Component({
    selector : 'smart-list-date-filter',
    templateUrl : 'smart-list-date-filter.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-date-filter.component.css']
})
export class SmartListDateFilterComponent implements OnInit{
    @Output() done : EventEmitter<any> = new EventEmitter<any>()

    public basicDateFilterTypeRows : BasicDateFilterTypeRow[] = [
        { title : "No Date",  description : "Tasks must not have a date", type : TCSmartListDateFilter.TypeNone },
        { title : "Any Date", description : "Tasks must have a date",     type : TCSmartListDateFilter.TypeAny  }
    ]

    public dateFilterTypeRows : DateFilterTypeRow[] = [
        { title : "Select a date", type : TCSmartListDateFilter.TypeIs     },
        { title : "Before a date", type : TCSmartListDateFilter.TypeBefore },
        { title : "After a date",  type : TCSmartListDateFilter.TypeAfter  }
    ]
    
    public dateSelectionRowText : string = "Date"
    public relationHeaderText : string = "DATE MATCHING"
    public relationRows : RelationRow[] = [
        { title : "Matching Date", description : "Choose a specific date or range", relation : TCSmartListDateFilter.RelationExact    },
        { title : "Relative Date", description : "Choose a period of time",         relation : TCSmartListDateFilter.RelationRelative }
    ]

    private _filterGroup : TCSmartListFilterGroup
    @Input() set filterGroup(group : TCSmartListFilterGroup) {
        this._filterGroup = group

        if(this.dateFilterModule) {
            this.dateFilterModule.filterGroup = group
            this.createDetailsModules()
        }
    }

    public dateFilterModule : DateFilterModule = null

    private detailModules : { relative : RelationalDateFilterDetailsModule, exact : ExactDateFilterDetailsModule } = null
    public filterDetailsModule : DateFilterDetailsModule = null
    @Input() set screen(screen : FilterScreens) {
        if (screen == FilterScreens.DueDate) {
            this.dateFilterModule = new DueDateFilterModule()
        }
        if (screen == FilterScreens.StartDate) {
            this.dateFilterModule = new StartDateFilterModule()
        }
        if (screen == FilterScreens.ModifiedDate) {
            this.dateFilterModule = new ModifiedDateFilterModule()
        }
        if (screen == FilterScreens.CompletedDate) {
            this.dateFilterModule = new CompletedDateFilterModule()
        }

        if (this.dateFilterModule && this._filterGroup) {
            this.dateFilterModule.filterGroup = this._filterGroup
            this.createDetailsModules()   
        }
    }


    constructor(private elRef : ElementRef) {}

    private createDetailsModules() {
        const exact = new ExactDateFilterDetailsModule(this.dateFilterModule)
        const relative = new RelationalDateFilterDetailsModule(this.dateFilterModule)

        this.detailModules = { relative : relative, exact : exact }
        this.filterDetailsModule = this.detailModules[this.dateFilterModule.relation]
    }

    private selectRelation(relation : string) {
        this.dateFilterModule.relation = relation
        this.filterDetailsModule = this.detailModules[relation]
    }

    ngOnInit() {
        this.done.subscribe((e) => {
            if (this.dateFilterModule.shouldShowDetailScreen) {
                this.filterDetailsModule.setModelsInFilter()
            }
            this.dateFilterModule.filter.setInFilterGroup(this._filterGroup)
        })
    }

    updateRow(row : DateSelectorRows, day :PerfectScrollbarComponent, period: PerfectScrollbarComponent) {
        row.showPicker = !row.showPicker
        if (row.showPicker) {
            setTimeout(() => {
                const selectedDayElement = this.elRef.nativeElement.querySelector(`.${row.label}.day .selected`)
                const selectedPeriodElement = this.elRef.nativeElement.querySelector(`.${row.label}.period .selected`)
                day.directiveRef.scrollTo(0, selectedDayElement.offsetTop, 400)
                period.directiveRef.scrollTo(0, selectedPeriodElement.offsetTop, 400)
            }, 100)
        }
    }
}
