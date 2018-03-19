import { Component, Output, EventEmitter }  from '@angular/core'
import { NgbDateStruct }           from '@ng-bootstrap/ng-bootstrap'
import { CalendarService }         from '../../services/calendar.service'
import { TCAppSettingsService }    from '../../services/tc-app-settings.service'
import { TaskEditService }         from '../../services/task-edit.service'
import { TaskEditState }           from '../../tc-utils'
import { TCTask }                  from "../../classes/tc-task"
import * as moment from 'moment'


@Component({
    selector: 'main-calendar',
    templateUrl: 'main-calendar.component.html',
    styleUrls: ['main-calendar.component.css']
})
export class MainCalendarComponent {

    calendar : NgbDateStruct = null
    selectedDates : string[] = []
    _showClearFilter : boolean = false
    timerForFilter : any
    firstDayOfWeek :number = 7

    dueDates : NgbDateStruct[] = []
    showTaskEdit : boolean = false
    editedTask : TCTask = null

    @Output() dateFilterShow : EventEmitter<boolean> = new EventEmitter<boolean>()

    set showClearFilter(state : boolean) {
        clearTimeout(this.timerForFilter)
        if(state && this.selectedDates.length) {
            this.timerForFilter = setTimeout(() => {
                this.dateFilterShow.emit(true)
                this._showClearFilter = true
            }, 0)
            return
        } else {
            this.dateFilterShow.emit(false)
            this._showClearFilter = false
            this.calendarService.clearSelectedDates(true)
        }
    }

    constructor(
        private readonly calendarService : CalendarService,
        private readonly taskEditService : TaskEditService,
        private appSettingsService: TCAppSettingsService

    ) {}
    ngOnInit() : void {
        this.calendarService.selectedDates.subscribe(dates => {
            this.selectedDates = dates.map(d => {
                return moment(d).format('YYYY-MM-DD')
            })
        })
        this.firstDayOfWeek = parseInt(this.appSettingsService.calendarFirstDayDP)

        this.taskEditService.editedTask.subscribe(info => {
            this.showTaskEdit = info.state == TaskEditState.Beginning
            this.editedTask = info.task
        })

        this.calendarService.overdueDates.subscribe(dates => {
            this.dueDates = dates
        })
    }

    selectDate(e : any, dateStruct : NgbDateStruct) {
        //exit task editing if filter applied
        if(this.showTaskEdit) this.taskEditService.finishEditTask(this.editedTask)
        const momentDate = moment([dateStruct.year, dateStruct.month - 1, dateStruct.day])
        const date_str = momentDate.format('YYYY-MM-DD')
        const date = momentDate.toDate()
        if (e.shiftKey && !this.selectedDates.includes(date_str) && this.selectedDates.length > 0) {
            let startDate = moment(this.selectedDates[this.selectedDates.length - 1]).toDate()
            this.calendarService.selectDateRange(startDate, date)
        } else if (this.selectedDates.includes(date_str) && this.selectedDates.length == 1) {
            this.calendarService.clearSelectedDates(true)
        } else if (!e.ctrlKey && !e.metaKey) {
            this.calendarService.selectDate(date)
        } else if (e.ctrlKey || e.metaKey) {
            this.calendarService.addDateToSelection(date)
        }
        this.showClearFilter = true
    }

    isSelected(dateStruct: NgbDateStruct) {
        const date_str = this.dateString(dateStruct)
        if (this.selectedDates.includes(date_str))
            return true
        return false
    }

    dateString(dateStruct: NgbDateStruct) {
        const date = moment([dateStruct.year, dateStruct.month - 1, dateStruct.day])
        return date.format('YYYY-MM-DD')
    }

    hasTask(date : NgbDateStruct){
        return this.dueDates.find(d => {
            return d.day == date.day &&
                d.month == date.month &&
                d.year == date.year
        })
    }
    isCurrentDay(date: NgbDateStruct){
        let currentDate = new Date()
        return currentDate.getMonth() + 1 == date.month && currentDate.getDate() == date.day
    }

    navigatedToMonth(event : any) {
        this.calendarService.currentMonth = event.next
    }
}
