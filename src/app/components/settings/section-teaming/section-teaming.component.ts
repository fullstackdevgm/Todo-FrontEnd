import { Component, OnInit, OnDestroy }  from '@angular/core'
import { Utils } from "../../../tc-utils"

@Component({
    selector: 'section-teaming',
    templateUrl: 'section-teaming.component.html',
    styleUrls: [
        '../../task-edit/task-edit-list-select.component.css',
        '../../../../assets/css/settings.css',
        'section-teaming.component.css']
})
export class SettingsTeamingComponent implements OnInit, OnDestroy {
    legacyUrl: string = ''
    
    constructor() {}

    ngOnInit() {
        this.legacyUrl = Utils.LEGACY_WEB_URL
    }

    ngOnDestroy() {}    
}
