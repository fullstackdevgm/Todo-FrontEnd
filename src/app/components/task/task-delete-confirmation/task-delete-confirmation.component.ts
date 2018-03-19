import { Component, HostListener, Input, Output, EventEmitter} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

import { TCTask } from '../../../classes/tc-task'
import { TCTaskito } from '../../../classes/tc-taskito'

import { TCTaskService } from '../../../services/tc-task.service'
import { HotkeyEventModel, TCHotkeyService } from '../../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'task-delete-confirmation',
    templateUrl : 'task-delete-confirmation.component.html',
    styleUrls : ['../../../../assets/css/modal.css', 'task-delete-confirmation.component.css']
})
export class TaskDeleteConfirmationComponent {
    @Input() task : TCTask | TCTaskito
    @Input() selectedTaskCount : number = 0

    @Output() deletePressed : EventEmitter<TCTask|TCTaskito> = new EventEmitter<TCTask|TCTaskito>()

    private hotkeySubscription: Subscription
    
    constructor(
        private readonly hotkeyService: TCHotkeyService,
        public activeModal: NgbActiveModal
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
    }

    cancel() {
        this.activeModal.close()
    }

    delete() {
        this.deletePressed.emit(this.task)
        this.activeModal.close()
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        switch (hotkeyEvent.name) {
            case 'Modal.save':
                this.delete()
            break
            case 'Modal.cancel':
                this.cancel()
            break
        }
    }
}
