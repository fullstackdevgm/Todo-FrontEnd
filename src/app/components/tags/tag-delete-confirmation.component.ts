import { Component, HostListener, Input, Output, EventEmitter} from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

import { TCTag } from '../../classes/tc-tag'
import { TCTagService } from '../../services/tc-tag.service'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector : 'tag-delete-confirmation',
    templateUrl : 'tag-delete-confirmation.component.html',
    styleUrls : ['../../../assets/css/list-editors.css', 'tag-delete-confirmation.component.css']
})
export class TagDeleteConfirmationComponent {
    deleteError : string = null
    
    @Input() tag : TCTag

    @Output() deleteSucceeded : EventEmitter<TCTag> = new EventEmitter<TCTag>()

    private hotkeySubscription: Subscription

    constructor(
        public activeModal: NgbActiveModal,
        private readonly hotkeyService: TCHotkeyService,
        private tagService : TCTagService
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
        this.tagService.delete(this.tag).first().subscribe(
            res => {
                this.deleteError = null
                this.deleteSucceeded.emit(this.tag)
                this.activeModal.close()
            },
            err => {
                this.deleteError = `The tag could not be deleted. Please try again later.`
            })
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
