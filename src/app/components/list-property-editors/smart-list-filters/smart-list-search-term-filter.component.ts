import { Component, Input, Output, OnInit, EventEmitter} from '@angular/core'
import { 
    TCSmartListFilterGroup,
    SmartListSearchTermFilter,
    TCSmartListSearchTermFilter,
    TCSmartListNameFilter,
    TCSmartListNoteFilter,
    SmartListSearchTerm,
    TCSmartListSearchTerm
} from '../../../classes/tc-smart-list-filters'
import { MaxNoteSearchTermLength } from '../../../tc-utils'
import { FilterScreens } from './smart-list-filters.component'

interface SearchTermFilterComparatorRow {
    description : string
    comparator  : string
}

abstract class SearchTermFilterModule {
    abstract get filter() : TCSmartListSearchTermFilter

    abstract get title() : string
    abstract set filterGroup(group : TCSmartListFilterGroup)
    abstract get filterPropertyKey() : string

    set comparator(comparator : string) {
        this.filter.comparator = comparator
    }

    get comparator() : string {
        return this.filter.comparator
    }

    get numberOfTerms() : number {
        return 3
    }

    get numberOfTermsIndexes() : number[] {
        return Array.from(Array(this.numberOfTerms).keys())
    }

    includes(text : string) : boolean {
        const findResult = this.filter.searchTerms.find((e : SmartListSearchTerm) => e.text == text)
        return findResult != undefined
    }

    clearSearchTerms() {
        this.filter.searchTerms = []
    }

    addSearchText(text : string) {
        if (text.trim().length == 0) return
        if (this.filter.searchTerms.length >= this.numberOfTerms) return

        if (text.length > MaxNoteSearchTermLength) {
            // Don't allow really long search terms: https://github.com/Appigo/todo-issues/issues/3329
            text = text.substr(0, MaxNoteSearchTermLength)
        }

        const term = new TCSmartListSearchTerm(text)
        this.filter.searchTerms.push(term)
    }

    get searchText() : string[] {
        return this.filter.searchTerms.map((val : SmartListSearchTerm) => val.text )
    }
}

class NoteFilterModule extends SearchTermFilterModule {
    get filterPropertyKey() : string {
        return 'note'
    }

    filter : TCSmartListNoteFilter = new TCSmartListNoteFilter()

    get title() { return "Note Contains" }

    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListNoteFilter(group.note)
    }
}

class NameFilterModule extends SearchTermFilterModule {
    get filterPropertyKey() : string {
        return 'name'
    }

    filter : TCSmartListNameFilter = new TCSmartListNameFilter()

    get title() { return "Task Name Contains" }

    set filterGroup(group : TCSmartListFilterGroup) {
        this.filter = new TCSmartListNameFilter(group.name)
    }
}

@Component({
    selector : 'smart-list-search-term-filter',
    templateUrl : 'smart-list-search-term-filter.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-search-term-filter.component.css']
})
export class SmartListSearchTermFilterComponent implements OnInit {
    @Output() done : EventEmitter<any> = new EventEmitter<any>()

    private editSearchTerms : string[] = []
    public placeholderText : string = "Search term or phrase"
    
    public comparatorRows : SearchTermFilterComparatorRow[] = [
        { description : "Match all of the search terms.", comparator : "and"},
        { description : "Match any of the search terms.", comparator : "or" }
    ]
    
    public comparatorHeaderText : string = "MATCH TYPE"
    public searchTermHeaderText : string = "SEARCH TERMS"

    private _filterGroup : TCSmartListFilterGroup
    @Input() set filterGroup(group : TCSmartListFilterGroup) {
        this._filterGroup = group

        if(this.searchTermModule) {
            this.searchTermModule.filterGroup = group
            this.populateEditTerms()
        }
    }

    public searchTermModule : SearchTermFilterModule = null
    @Input() set screen(screen : FilterScreens) {
        if (screen == FilterScreens.Note) {
            this.searchTermModule = new NoteFilterModule()
        }
        if (screen == FilterScreens.TaskName) {
            this.searchTermModule = new NameFilterModule()
        }

        if (this.searchTermModule && this._filterGroup) {
            this.searchTermModule.filterGroup = this._filterGroup
            this.populateEditTerms()
        }
    }
    
    ngOnInit() {
        this.done.subscribe((e) => {
            this.searchTermModule.clearSearchTerms()
            for (let searchText of this.editSearchTerms) {
                this.searchTermModule.addSearchText(searchText)
            }
            this.searchTermModule.filter.setInFilterGroup(this._filterGroup)

            const hasSearchTerms = this.searchTermModule.filter.searchTerms.length > 0 &&
                this.searchTermModule.filter.searchTerms.reduce((accum : boolean, term : TCSmartListSearchTerm) : boolean => {
                    return term.text.length > 0 || accum
                }, false)

            if (!hasSearchTerms) {
                delete this._filterGroup[this.searchTermModule.filterPropertyKey]
            }
        })
    }

    private keyUp(event : any, editBoxIndex : number) {
        this.editSearchTerms[editBoxIndex] = event.target.value
    }

    private getSearchText(index : number) {
        if (!(index in this.editSearchTerms)) {
             return null
        }
        return this.editSearchTerms[index]
    }

    private populateEditTerms() {
        this.editSearchTerms = this.searchTermModule.searchText.slice(0, this.searchTermModule.numberOfTerms)
    }
}
