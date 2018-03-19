import { Component, HostListener, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

import { TCTask } from '../../../classes/tc-task'
import { TCTaskito } from '../../../classes/tc-taskito'

import { TCTaskService } from '../../../services/tc-task.service'
import { HotkeyEventModel, TCHotkeyService } from '../../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'task-note-edit-popup',
    templateUrl : 'task-note-edit-popup.component.html',
    styleUrls : ['../../../../assets/css/modal.css', 'task-note-edit-popup.component.css']
})
export class TaskNoteEditPopupComponent {
    @Input() noteText : string
    @ViewChild('noteTextarea') noteTextarea : ElementRef

    @Output() saveNoteUpdate : EventEmitter<string> = new EventEmitter<string>()

    private hotkeySubscription: Subscription
    
    constructor(
        private readonly hotkeyService: TCHotkeyService,
        public activeModal: NgbActiveModal
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngAfterViewInit() {
        if(this.noteTextarea) {
            this.noteTextarea.nativeElement.select()
        }
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
    }

    cancel() {
        this.activeModal.close()
    }

    done() {
        this.saveNoteUpdate.emit(this.noteText)
        this.cancel()
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        if (hotkeyEvent.name == 'Modal.cancel') {
            this.cancel()
        }
    }
}
