import { Component, Input, Output, OnInit, OnDestroy, EventEmitter, Renderer, AfterViewInit }  from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TCUserSettings } from '../../classes/tc-user-settings'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'
import { Subscription } from 'rxjs'

export enum SettingsSection {
    Account,
    Premium,
    General,
    TaskCreation,
    Notification,
    About,
    Teaming
}

@Component({
    selector: 'settings',
    templateUrl: 'settings.component.html',
    styleUrls: ['../../../assets/css/modal.css', 'settings.component.css'],
})
export class SettingsComponent implements OnInit, OnDestroy, AfterViewInit {
    private settings : TCUserSettings
    private settingsSub : Subscription

    SettingsSection = SettingsSection
    savingInProgress : boolean = false
    private _activeSection : SettingsSection = SettingsSection.Account
    private viewHasFinishedInit = false
    set activeSection(section : SettingsSection) {
        this._activeSection = section
        if (this.viewHasFinishedInit) this.updateModalClass()
    }
    get activeSection() {
        this._activeSection = this._activeSection ? this._activeSection : SettingsSection.Account
        return this._activeSection
    }
    @Input() saveButtonActive: boolean = false
    @Output() currentSection:EventEmitter<number> = new EventEmitter<number>()

    constructor(
        private readonly userSettingsService : TCUserSettingsService,
        public activeModal : NgbActiveModal,
        private renderer: Renderer
    ) {}

    ngOnInit() {
        this.settingsSub = this.userSettingsService.settings.subscribe(settings => this.settings = settings)
    }

    ngAfterViewInit() {
        this.viewHasFinishedInit = true
    }

    ngOnDestroy() {
        this.settingsSub.unsubscribe()
    }
    
    done() {
        this.activeModal.close()
    }

    private updateModalClass() {
        document.querySelector('.modal').className = 'modal fade show'
        document.querySelector('.modal').className += ' settings-tab-' + this.activeSection;
        if (this.activeSection == SettingsSection.Notification) {
            document.querySelector('.modal').className += ' settings-tab-wide'
        }
    }
}
