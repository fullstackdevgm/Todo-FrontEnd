import { Component, HostListener, Input, Output, EventEmitter} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCSmartListService } from '../../../services/tc-smart-list.service'
import { HotkeyEventModel, TCHotkeyService } from '../../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'smart-list-delete-confirmation',
    templateUrl : 'smart-list-delete-confirmation.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-delete-confirmation.component.css']
})
export class SmartListDeleteConfirmationComponent {
    @Input() smartList : TCSmartList

    @Output() done   : EventEmitter<any> = new EventEmitter<any>()
    @Output() deletePressed : EventEmitter<any> = new EventEmitter<any>()
    
    inSmartListEditor : boolean = true

    private hotkeySubscription: Subscription
    
    constructor(
        public activeModal: NgbActiveModal,
        private readonly hotkeyService: TCHotkeyService,
        private smartListService : TCSmartListService
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
    }

    cancel() {
        if (this.inSmartListEditor) {
            this.done.emit()
        } else {
            this.activeModal.close()
        }
    }

    delete() {
        this.deletePressed.emit()
        this.smartListService.delete(this.smartList)
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
