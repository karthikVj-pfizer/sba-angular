import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Action } from '@sinequa/components/action';
import { FacetConfig } from '@sinequa/components/facet';
import { PreviewService } from '@sinequa/components/preview';
import { SearchService } from '@sinequa/components/search';
import { SelectionService } from '@sinequa/components/selection';
import { UIService } from '@sinequa/components/utils';
import { AppService } from '@sinequa/core/app-utils';
import { IntlService } from '@sinequa/core/intl';
import { LoginService } from '@sinequa/core/login';
import { Record } from '@sinequa/core/web-services';
import { Subscription } from 'rxjs';
import { FACETS, FEATURES, METADATA } from '../../config';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {

  // Dynamic display of facets titles/icons in the multi-facet component
  public multiFacetIcon? = "fas fa-filter fa-fw";
  public multiFacetTitle = "msg#facet.filters.title";

  // Document "opened" via a click (opens the preview facet)
  public openedDoc?: Record;

  // Custom action for the preview facet (open the preview route)
  public previewCustomActions: Action[];

  // Whether the left facet bar is shown
  public _showFilters = this.ui.screenSizeIsEqual('md');
  // Whether the menu is shown on small screens
  public _showMenu = false;

  private _searchServiceSubscription: Subscription;

  constructor(
    public searchService: SearchService,
    public selectionService: SelectionService,
    private previewService: PreviewService,
    private titleService: Title,
    private intlService: IntlService,
    private appService: AppService,
    public loginService: LoginService,
    public ui: UIService
  ) {

    // Initialize the facet preview action (opens the preview route)
    this.previewCustomActions = [new Action({
      icon: "far fa-window-maximize",
      title: "msg#facet.preview.expandTitle",
      action: () => {
        if (this.openedDoc) {
          this.previewService.openRoute(this.openedDoc, this.searchService.query);
        }
      }
    })];

    // Subscribe to the search service to update the page title based on the searched text
    this._searchServiceSubscription = this.searchService.resultsStream.subscribe(results => {
      this.titleService.setTitle(this.intlService.formatMessage("msg#search.pageTitle", {search: this.searchService.query.text || ""}));
      if(!this.showResults){
        this.openedDoc = undefined;
        this._showFilters = false;
      }
    });

  }

  /**
   * Initialize the page title
   */
  ngOnInit() {
    this.titleService.setTitle(this.intlService.formatMessage("msg#search.pageTitle", {search: ""}));
  }

  /**
   * Unsubscribe from the search service
   */
  ngOnDestroy(){
    this._searchServiceSubscription.unsubscribe();
  }

  /**
   * Returns the configuration of the facets displayed in the facet-multi component.
   * The configuration from the config.ts file can be overriden by configuration from
   * the app configuration on the server
   */
  public get facets(): FacetConfig[] {
    if(this.appService.app && this.appService.app.data && this.appService.app.data.facets){
      return <FacetConfig[]> <any> this.appService.app.data.facets;
    }
    return FACETS;
  }

  /**
   * Returns the list of features activated in the top right menus.
   * The configuration from the config.ts file can be overriden by configuration from
   * the app configuration on the server
   */
  public get features(): string[] {
    if(this.appService.app && this.appService.app.data && this.appService.app.data.features){
      return <string[]> <any> this.appService.app.data.features;
    }
    return FEATURES;
  }

  /**
   * Returns the configuration of the metadata displayed in the facet-preview component.
   * The configuration from the config.ts file can be overriden by configuration from
   * the app configuration on the server
   */
  public get metadata(): string[] {
    if(this.appService.app && this.appService.app.data && this.appService.app.data.metadata){
      return <string[]> <any> this.appService.app.data.metadata;
    }
    return METADATA;
  }

  /**
   * Responds to a change of facet in the multi facet
   * @param facet
   */
  facetChanged(facet: FacetConfig){
    if(!facet) {
      this.multiFacetIcon = "fas fa-filter fa-fw";
      this.multiFacetTitle = "msg#facet.filters.title";
    }
    else {
      this.multiFacetIcon = facet.icon;
      this.multiFacetTitle = facet.title;
    }
  }

  /**
   * Responds to a click on a document (setting openedDoc will open the preview facet)
   * @param record
   * @param event
   */
  onDocumentClicked(record: Record, event: Event) {
    if(!this.isClickAction(event)){
      this.openedDoc = record;
      if(this.ui.screenSizeIsLessOrEqual('md')){
        this._showFilters = false; // Hide filters on small screens if a document gets opened
      }
    }
  }

  /**
   * Open the preview when this record has no url1
   * @param record 
   * @param isLink 
   */
  openPreviewIfNoUrl(record: Record, isLink: boolean) {
    if(!isLink){
      this.previewService.openRoute(record, this.searchService.query);
    }
  }

  /**
   * Responds to the preview facet being closed by a user action
   */
  closeDocument(){
    if(this.openedDoc){
      this.openedDoc = undefined;
      if(this.ui.screenSizeIsEqual('md')){
        this._showFilters = true; // Show filters on medium screen when document is closed
      }
    }
  }

  // VERY SPECIFIC TO THIS APP:
  // Make sure the click is not meant to trigger an action (from sq-result-source or sq-result-title)
  private isClickAction(event: Event): boolean {
    if (event.type !== 'click') {
      return true;
    }
    const target = event.target as HTMLElement;
    if (!target) {
      return false;
    }
    return event.type !== 'click' ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.matches("sq-result-selector *, .sq-result-title, sq-result-source *");
  }


  /**
   * Controls visibility of filters (small screen sizes)
   */
  get showFilters(): boolean {
    return this.ui.screenSizeIsGreaterOrEqual('lg') || this._showFilters;
  }

  /**
   * Show or hide the left facet bar (small screen sizes)
   */
  toggleFilters(){
    this._showFilters = !this._showFilters;
    if(this._showFilters){ // Close document if filters are displayed
      this.openedDoc = undefined;
    }
  }

  /**
   * Controls visibility of menu (small screen sizes)
   */
  get showMenu(): boolean {
    return this.ui.screenSizeIsGreaterOrEqual('sm') || (this._showMenu && !this._showFilters);
  }

  /**
   * Show or hide the user menus (small screen sizes)
   */
  toggleMenu(){
    this._showMenu = !this._showMenu;
  }

  /**
   * Determine whether to show or hide results
   */
  get showResults(): boolean {
    if(this.ui.screenSizeIsLessOrEqual('sm')){
      return !this.showFilters && !this.openedDoc;
    }
    return true;
  }

  /**
   * On small screens only show the search form when the facets are displayed
   */
  get showForm(): boolean {
    return this.ui.screenSizeIsGreaterOrEqual('sm') || this.showFilters;
  }

  /**
   * Whether the UI is in dark or light mode
   */
  isDark(): boolean {
    return document.body.classList.contains("dark");
  }
}
