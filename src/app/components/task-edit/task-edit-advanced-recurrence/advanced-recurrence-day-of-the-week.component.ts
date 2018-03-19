import { Component, Input, Output, EventEmitter } from '@angular/core'
import { TCTask } from '../../../classes/tc-task'

@Component({
    selector: 'advanced-recurrence-day-of-the-week',
    templateUrl: 'advanced-recurrence-day-of-the-week.component.html',
    styleUrls: ['../../../../assets/css/task-editors.css']
})
export class AdvancedRecurrenceDayOfTheWeekComponent {
    @Input() set currentRecurrence (currentRecurrence : string) {
        if (!currentRecurrence) return

        this.selectedDays = this.days.reduce((accum : string[], current : string) : string[] => {
            return currentRecurrence.indexOf(current) >= 0 ? accum.concat([current]) : accum
        }, [])
    }
    @Output() done : EventEmitter<string> = new EventEmitter<string>()

    readonly days : string[] = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
    ]

    selectedDays : string[] = []

    daySelected(day : string) {
        if (this.recurrenceContainsDay(day)) {
            this.selectedDays = this.selectedDays.filter(element => element != day)
        }
        else {
            this.selectedDays.push(day)
        }
    }

    recurrenceContainsDay(day : string) : boolean {
        return this.selectedDays.includes(day)
    }

    removePressed() {
        this.done.emit(null)
    }

    savePressed() {
        if (this.selectedDays.length == 0) {
            this.done.emit(null)
            return
        }

        this.done.emit(this.selectedDays.reduce((accum : string, day : string) : string => {
            return `${accum} ${day}${this.selectedDays.length > 1 ? ',' : ''}`
        }, 'Every'))
    }
}