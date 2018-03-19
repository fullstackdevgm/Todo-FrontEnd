import { Component, HostListener, Input, Output, EventEmitter} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'sign-out-confirmation',
    templateUrl : 'sign-out-confirmation.component.html',
    styleUrls : ['../../../assets/css/list-editors.css', 'sign-out-confirmation.component.css']
})
export class SignOutConfirmationComponent {
    @Input() errorMessage : string = null

    @Output() signOutPressed : EventEmitter<void> = new EventEmitter<void>()

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

    signOut() {
        this.signOutPressed.emit()
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        switch (hotkeyEvent.name) {
            case 'Modal.save':
                this.signOut()
            break
            case 'Modal.cancel':
                this.cancel()
            break
        }
    }
}
