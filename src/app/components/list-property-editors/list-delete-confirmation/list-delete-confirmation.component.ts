import { Component, HostListener, Input, Output, EventEmitter} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

import { TCList } from '../../../classes/tc-list'
import { TCListService } from '../../../services/tc-list.service'
import { HotkeyEventModel, TCHotkeyService } from '../../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'list-delete-confirmation',
    templateUrl : 'list-delete-confirmation.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'list-delete-confirmation.component.css']
})
export class ListDeleteConfirmationComponent {
    @Input() list : TCList
    @Input() errorMessage : string = null

    @Output() deletePressed : EventEmitter<TCList> = new EventEmitter<TCList>()

    private hotkeySubscription: Subscription

    constructor(
        public activeModal: NgbActiveModal,
        private readonly hotkeyService: TCHotkeyService,
        private listService : TCListService
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
        this.deletePressed.emit(this.list)
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
