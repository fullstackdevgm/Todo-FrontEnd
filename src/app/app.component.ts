import { Component, OnInit } from '@angular/core'
import { Http } from '@angular/http'
import { environment } from '../environments/environment';

@Component({
    selector: 'todo-cloud-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
    constructor(
        private readonly http : Http
    ) {}

    ngOnInit() {}
}

