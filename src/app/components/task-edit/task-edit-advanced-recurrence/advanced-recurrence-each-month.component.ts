import { Component, Input, Output, EventEmitter } from '@angular/core'
import { TCTask } from '../../../classes/tc-task'

@Component({
    selector: 'advanced-recurrence-each-month',
    templateUrl: 'advanced-recurrence-each-month.component.html',
    styleUrls: ['../../../../assets/css/task-editors.css']
})
export class AdvancedRecurrenceEachMonth {
    @Input() set currentRecurrence (current : string) {
        if (!current) return
        
        const split = current.split(' ')
        if (split.length < 3) return

        this.selectedDay = split[2]
        this.selectedValue = split[1]
    }
    @Output() done : EventEmitter<string> = new EventEmitter<string>()

    readonly values : string[] = [
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        'last'
    ]

    readonly days : string[] = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'Day',
    ]

    selectedValue : string = this.values[0]
    selectedDay : string = this.days[0]

    removePressed() {
        this.done.emit(null)
    }

    savePressed() {
        this.done.emit(`The ${this.selectedValue} ${this.selectedDay} of each month`)
    }
}