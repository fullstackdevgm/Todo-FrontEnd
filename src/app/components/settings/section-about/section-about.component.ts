import { Component }  from '@angular/core'

import * as moment from 'moment'

const {version:appVersion} = require('../../../../../package.json')

@Component({
    selector: 'section-about',
    templateUrl: 'section-about.component.html',
    styleUrls: ['../../../../assets/css/settings.css', 'section-about.component.css']
})
export class SettingsAboutComponent {

    appVersion : string = ''
    copyrightString : string = `Copyright © ${moment().year()} Appigo, Inc.`
    constructor() {}

    ngOnInit() {
        this.appVersion = appVersion
    }
}
