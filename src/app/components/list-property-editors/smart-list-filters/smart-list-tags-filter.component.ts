import { Component, Input, Output, EventEmitter} from '@angular/core'
import { 
    TCSmartListFilterGroup,
    SmartListTagFilter,
    TCSmartListTagsFilter
} from '../../../classes/tc-smart-list-filters'
import { TCTag } from '../../../classes/tc-tag'
import { TCTagService } from '../../../services/tc-tag.service'
import { FilterScreens } from './smart-list-filters.component'

interface TagsFilterRow {
    description? : string
}

interface TagsFilterComparatorRow extends TagsFilterRow {
    title : string
    comparator  : string
}

interface TagsFilterTagRow extends TagsFilterRow {
    tag   : string,
}

abstract class TagsFilterSection {
    abstract get rows() : TagsFilterRow[]
    public filter : SmartListTagFilter

    abstract select(row : TagsFilterRow)
    abstract isSelected(row : TagsFilterRow) : boolean
}

class TagsFilterComparatorSection extends TagsFilterSection {
    private readonly _rows : TagsFilterComparatorRow[] = [
        { title : "Match All", comparator : "and", description : "Tasks matching all of the selected tags will be included" },
        { title : "Match Any", comparator : "or",  description : "Tasks matching any of the selected tags will be included" }
    ]
    get rows() : TagsFilterComparatorRow[] {
        return this._rows
    }

    select(row : TagsFilterComparatorRow) {
        this.filter.comparator = row.comparator
    }

    isSelected(row : TagsFilterComparatorRow) {
        return row.comparator == this.filter.comparator
    }
}

class TagsFilterTagSection extends TagsFilterSection {
    tags : TCTag[] = []

    constructor(
        private tagService : TCTagService 
    ) {
        super()
        
        this.tagService.tagsForUser()
            .first()
            .map(results => results.map(tagInfo => tagInfo.tag))
            .subscribe((tags : TCTag[]) => {
                this.tags = tags
                this._rows = this._rows.concat(this.tags.map(tag => { return { tag : tag.name } }))
            })
    }

    private _rows : TagsFilterTagRow[] = [
        { tag : "Any Tag", description : "Include tasks that have at least one tag"   },
        { tag : "No Tag",  description : "Include tasks that have no tag"      }
    ]
    get rows() : TagsFilterTagRow[] {
        return this._rows
    }

    select(row : TagsFilterTagRow) {
        if (this.isSelected(row)) {
            this.filter.tags = this.filter.tags.filter((e) => e != row.tag)
        }
        else {
            if (row.tag == "Any Tag" || row.tag == "No Tag") {
                this.filter.tags = []
            }
            else {
                this.filter.tags = this.filter.tags.filter(e => e != "Any Tag" && e != "No Tag")
            }

            this.filter.tags.push(row.tag)
        }

        if (this.filter.tags.length == 0) {
            this.filter.tags.push(this.rows[0].tag)
        }
    }

    isSelected(row : TagsFilterTagRow) {
        return this.filter.tags.includes(row.tag)
    }
}

@Component({
    selector : 'smart-list-tags-filter',
    templateUrl : 'smart-list-tags-filter.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'smart-list-tags-filter.component.css']
})
export class SmartListTagsFilterComponent  {
    @Output() done : EventEmitter<any> = new EventEmitter<any>()

    public sections : TagsFilterSection[]

    private _filterGroup : TCSmartListFilterGroup
    private filter : TCSmartListTagsFilter
    @Input() set filterGroup(group : TCSmartListFilterGroup) {
        this._filterGroup = group

        if (!this._filterGroup.tags) {
            this._filterGroup.tags = new TCSmartListTagsFilter()
        }

        for (let section of this.sections) {
            section.filter = this._filterGroup.tags
        }
    }

    constructor(private tagService : TCTagService ){
        this.sections = [
            new TagsFilterComparatorSection(),
            new TagsFilterTagSection(this.tagService)
        ]
    }
}
