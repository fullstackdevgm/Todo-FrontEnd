import { Component, OnInit, OnDestroy, Input, Output, EventEmitter} from '@angular/core'

import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCList } from '../../../classes/tc-list'
import { TCListService, ListPublication } from '../../../services/tc-list.service'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'

import { Subscription } from 'rxjs/Rx'

@Component({
    selector : 'smart-list-default-list',
    templateUrl : 'smart-list-default-list.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-default-list.component.css']
})
export class SmartListDefaultListComponent implements OnInit, OnDestroy {
    @Input() smartList : TCSmartList
    
    @Output() done   : EventEmitter<any> = new EventEmitter<any>()
    @Output() change : EventEmitter<TCList> = new EventEmitter<TCList>()
    
    public lists : TCList[]
    public appDefault : TCList
    private subscription : Subscription

    constructor(
        private listsService : TCListService,
        private userSettingsService : TCUserSettingsService
    ) {}

    ngOnInit() {
        this.subscription = this.listsService.lists.subscribe((pub : ListPublication) => {
            this.lists = pub.lists
            this.appDefault = pub.lists.find(list => list.identifier == this.userSettingsService.defaultListID)
            if (!this.appDefault) {
                this.userSettingsService.settings.first().subscribe(settings => {
                    this.appDefault = pub.lists.find(list => list.identifier == settings.userInbox)
                })
            }
        })
    }

    ngOnDestroy() {
        this.subscription.unsubscribe()
    }

    selectAppDefault() {
        this.smartList.defaultList = ""
        this.change.emit(null)
        this.done.emit()
    }

    selectList(list : TCList) {
        this.smartList.defaultList = list.identifier
        this.change.emit(list)
        this.done.emit()
    }
}
