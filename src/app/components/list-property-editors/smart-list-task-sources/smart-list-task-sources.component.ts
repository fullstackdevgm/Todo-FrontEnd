import { Component, OnInit, OnDestroy, Input, Output, EventEmitter} from '@angular/core'

import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCList } from '../../../classes/tc-list'
import { TCListService, ListPublication } from '../../../services/tc-list.service'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'

import { Subscription } from 'rxjs/Rx'

@Component({
    selector : 'smart-list-task-sources',
    templateUrl : 'smart-list-task-sources.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-task-sources.component.css']
})
export class SmartListTaskSourcesComponent implements OnInit, OnDestroy {
    @Input() smartList : TCSmartList
    
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<number> = new EventEmitter<number>()
    
    public lists : TCList[]
    private subscription : Subscription

    constructor(
        private listsService : TCListService,
        private userSettingsService: TCUserSettingsService
    ) {}

    ngOnInit() {
        this.subscription = this.listsService.lists.subscribe((pub : ListPublication) => this.lists = pub.lists )
    }

    ngOnDestroy() {
        this.subscription.unsubscribe()
    }

    toggleExcludeList(listId : string) {
        if (!listId) return
        if (this.smartList.excludedListIds.has(listId)) {
            this.smartList.excludedListIds.delete(listId)
            this.smartList.filter.excludeLists = Array.from(this.smartList.excludedListIds)
        }
        else {
            this.smartList.excludedListIds.add(listId)
            this.smartList.filter.excludeLists = Array.from(this.smartList.excludedListIds)
        }

        if (this.smartList.excludedListIds.size == this.lists.length) {
            this.userSettingsService.settings.subscribe((settings) => this.toggleExcludeList(settings.userInbox))
        }
        else {
            this.change.emit()
        }
    }
}
