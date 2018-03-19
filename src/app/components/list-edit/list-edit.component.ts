import { Component, HostListener, Output, Input, ChangeDetectorRef, EventEmitter, ViewChild, OnInit }  from '@angular/core'
import { TCList } from '../../classes/tc-list'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Utils } from '../../tc-utils'
import { TCListService } from '../../services/tc-list.service'
import { TCListMembershipService } from '../../services/tc-list-membership.service'
import { TCAccountService } from '../../services/tc-account.service'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'
import { TCUserSettings } from '../../classes/tc-user-settings'
import { PaywallService } from '../../services/paywall.service'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'

@Component({
    selector: 'list-edit',
    templateUrl: 'list-edit.component.html',
    styleUrls: ['../../../assets/css/list-editors.css', 'list-edit.component.css']
})
export class ListEditComponent implements OnInit {
    public savingInProgress : boolean = false

    public sharingMessage        : string = 'Share this list...'
    public defaultDueDateMessage : string = "None"
    public sortTypeMessage       : string = "Due date, priority"

    public showEditSharing       : boolean = false
    public showEditNotifications : boolean = false
    public showEditDefaultDueDate: boolean = false
    public showEditSortType      : boolean = false
    public showChangeColor       : boolean = false
    public showChangeIcon        : boolean = false
    public bgColorMore           : string  = '#9e9e9e'

    public  isMainList            : boolean = false
    public maxNameLength         : number = 72

    public readonly dueDates = Utils.DueDateNames
    public readonly sortTypes = Utils.SortTypeNames
    public readonly mainColors = Utils.MainColors

    public saveErrorMessage     : string = null
    
    private settings : TCUserSettings
    private hotkeySubscription: Subscription
    private selectflag : boolean = false
    private oldName : string = ''

    private _list : TCList
    @Input()
    set list(list: TCList) {
        this._list = list

        if (this.settings) {
            this.determineDueDateMessage()
            this.determineSortTypeMessage()
        }

        // Set the "more color" button to show the custom
        // color if it's not one of the main colors.
        if (this.mainColors.indexOf(this._list.color) == -1) {
            this.bgColorMore = this._list.color
        }
    }
    get list() {
        return this._list
    }

    private _listInit : boolean = false
    @Input()
    set listInit(state : boolean) {
        this._listInit = state
    }
    get listInit() {
        return this._listInit
    }

    @Input() saveButtonActive: boolean = false

    @Output() listEditFormActivated:EventEmitter<boolean> = new EventEmitter<boolean>()
    @Output() updatedList:EventEmitter<any> = new EventEmitter<any>()

    @ViewChild('listName') viewChildInput;

    constructor(
        private readonly listService : TCListService,
        private readonly userSettingsService : TCUserSettingsService,
        private readonly listMembershipService : TCListMembershipService,
        private readonly accountService : TCAccountService,
        private readonly paywallService : PaywallService,
        private cdRef : ChangeDetectorRef,
        private readonly hotkeyService: TCHotkeyService,
        public activeModal : NgbActiveModal
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnInit() {
        this.userSettingsService.settings.subscribe(settings => {
            this.settings = settings
            this.determineDueDateMessage()
            this.determineSortTypeMessage()
        })

        this.oldName = this._list.name

        this.getListMemberInfo()
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
    }

    ngAfterViewChecked() {
        // focus on input element
        if (!this.selectflag && this.viewChildInput && this.viewChildInput.nativeElement.value) {
            this.viewChildInput.nativeElement.select()
            this.selectflag = true
        }
    }

    private getListMemberInfo() {
        if (!this.saveButtonActive || !this._list.identifier) return // Don't try to get members for newly created lists.
        this.accountService.account.first().subscribe(account => {
            this.listMembershipService.getMembersForList(this._list).first().subscribe(result => {
                const matchesAccount = (info) => info.account.userID == account.userID
                const notMe = result.filter(info => !matchesAccount(info))

                const shareCount = notMe.length
                this.sharingMessage = shareCount > 0 ? `Shared with ${shareCount} ${ shareCount > 1 ? 'people' : 'person' }`
                    : 'Share this list...'
            })
        })
    }

    updateListName(listName:string, saveList? : boolean) {
        if (listName.trim()) {
            const txt = Utils.truncateToFit(listName, this.maxNameLength)
            this._list.name = txt.trim()
            if(Utils.lengthInUtf8Bytes(listName) > this.maxNameLength) this.viewChildInput.nativeElement.value = txt
        }

        if (saveList) {
            this.done()
        }

        return this._list.name
    }

    showChangeColorSettings(show : boolean) {
        this.paywallService.paywallCheck("Additional colors are for premium members only.",
            () => {
                this.showChangeColor = show
                if (this.mainColors.indexOf(this._list.color) == -1) {
                    this.bgColorMore = this._list.color
                }
            },
            () => this.showChangeColor = false
        )
    }

    updateColor(color:string) {
        if (color) {
            this._list.color = color
            console.log('List color changed: ' + color)
        }
        if (this.mainColors.indexOf(color) >= 0) {
            this.bgColorMore = '#9e9e9e'
        }
    }

    showSharingOptions(showSharing : boolean) {
        if (showSharing) {
            this.showEditSharing = showSharing
            this.saveList(true)
        } else {
            this.done()
        }
    }

    showNotificationSettings(show : boolean) {
        this.showEditNotifications = show
    }

    showDefaultDueDateSettings(show : boolean) {
        this.showEditDefaultDueDate = show
    }

    showSortTypeSettings(show : boolean) {
        this.showEditSortType = show
    }
    showChangeIconSettings(show : boolean) {
        this.showChangeIcon = show
    }

    done() {
        if (this.saveErrorMessage) {
            // Just close the modal window because the user
            // should have already seen the error message now.
            this.activeModal.close()
            return
        }

        this.savingInProgress = true

        this.saveList()
    }

    cancel() {
        if (this.saveErrorMessage) {
            // Just close the modal window because the user
            // should have already seen the error message now.
            this.activeModal.close()
            return
        }

        this.savingInProgress = true
        this._list.name = this.oldName
        this.viewChildInput.nativeElement.value = this.oldName

        if (this.listInit)
            this.listService.delete(this._list).subscribe(
                () => {
                    this.saveErrorMessage = null
                    this.savingInProgress = false
                    this.activeModal.close()
                },
                err => {
                    this.savingInProgress = false
                    this.saveErrorMessage = Utils.parseErrorMessage(err)
                }
            )
        else {
            this.saveErrorMessage = null
            this.savingInProgress = false
            this.activeModal.close()
        }
    }

    saveList(silentSave? : boolean) {
        this.listService.update(this._list).first().subscribe(
            (updatedList : TCList) => {
                this.updatedList.emit({list: this._list})
                this.savingInProgress = false
                if(!silentSave)
                    this.activeModal.close()
            },
            err => {
                this.savingInProgress = false
                this.saveErrorMessage = Utils.parseErrorMessage(err)
            }
        )
    }

    private determineDueDateMessage() {
        if (this._list.defaultDueDate == -1) {
            this.defaultDueDateMessage = this.dueDates[this.settings.defaultDueDate]
        }
        else {
            this.defaultDueDateMessage = this.dueDates[this._list.defaultDueDate]
        }
    }
    private determineSortTypeMessage() {
        if (this._list.sortType == -1) {
            this.sortTypeMessage = this.sortTypes[this.settings.taskSortOrder]
        }
        else {
            this.sortTypeMessage = this.sortTypes[this._list.sortType]
        }
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        switch (hotkeyEvent.name) {
            case 'Modal.save':
                this.done()
            break
            case 'Modal.cancel':
                this.cancel()
            break
        }
    }
}
