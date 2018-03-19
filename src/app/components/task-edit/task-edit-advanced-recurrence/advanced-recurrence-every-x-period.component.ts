import { Component, Input, Output, EventEmitter } from '@angular/core'
import { TCTask } from '../../../classes/tc-task'

@Component({
    selector: 'advanced-recurrence-every-x-period',
    templateUrl: 'advanced-recurrence-every-x-period.component.html',
    styleUrls: ['../../../../assets/css/task-editors.css']
})
export class AdvancedRecurrenceEveryXPeriodComponent {
    @Input() set currentRecurrence (current : string) {
        if (!current) return
        
        const split = current.split(' ')
        if (split.length < 3) return

        this.selectedPeriod = split[2]
        this.selectedValue = parseInt(split[1])
    }
    @Output() done : EventEmitter<string> = new EventEmitter<string>()

    readonly periods : string[] = [
        'Days',
        'Weeks',
        'Months',
        'Years',
    ]

    readonly values : number[] = []

    selectedPeriod : string = this.periods[0]
    selectedValue : number = 1

    constructor() {
        const count = 100
        for (let i = 1; i < count; i++) {
            this.values.push(i)
        }
    }

    removePressed() {
        this.done.emit(null)
    }

    savePressed() {
        this.done.emit(`Every ${this.selectedValue} ${this.selectedPeriod}`)
    }
}