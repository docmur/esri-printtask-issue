import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {loadModules} from 'esri-loader';
import esri = __esri;
import * as _ from 'lodash';
import * as WKT from 'terraformer-wkt-parser';

@Component({
  selector: 'app-esri-map',
  templateUrl: './esri-map.component.html',
  styleUrls: ['./esri-map.component.css']
})
export class EsriMapComponent implements OnInit {

  @ViewChild('mapViewNode', { static: true }) private mapViewEl: ElementRef;
  @ViewChild('printButtonElem') printButtonElem: ElementRef;

  private _basemap = 'topo';
  private _center: Array<number> = [-116.51212386503, 49.1030138147457]
  private _map: esri.Map = null;
  private _view: esri.MapView = null;
  private _zoom = 13;

  private EsriMap: any;
  private EsriMapView: any;
  private FeatureLayer: any;
  private SimpleFillSymbol: any;
  private SimpleLineSymbol: any;
  private Color: any;
  private Home: any;
  private Expand: any;
  private Print: any;
  private PrintTask: any;
  private PrintTemplate: any;
  private PrintParameters: any;
  private Graphic: any;
  private WatchUtil: any;

  private featureLayer: any;

  private sortedMapData = [];

  private dummyData = [
    {
      assetSectionId: 1,
      colour: "#667882",
      coordinatesText: "LINESTRING (-116.515656199938 49.1129159465096, -116.514907799938 49.1120203465096)",
      filterValues: ["Not Defined"]
    },
    {
      assetSectionId: 2,
      colour: "#667882",
      coordinatesText: "LINESTRING (-116.513511599938 49.10351964651, -116.513491499938 49.10282934651)",
      filterValues: ["Not Defined"]
    },
    {
      assetSectionId: 3,
      colour: "#667882",
      coordinatesText: "LINESTRING (-116.514907799938 49.1120203465096, -116.514729399938 49.1117119465097, -116.514484299938 49.1107991465097, -116.514529299938 49.1106333465097, -116.514733899938 49.1105442465097)",
      filterValues: ["Not Defined"]
    },
    {
      assetSectionId: 4,
      colour: "#667882",
      coordinatesText: "LINESTRING (-116.513431199938 49.0977734465101, -116.513418199938 49.0967522465102)",
      filterValues: ["Not Defined"]
    }
  ]

  private _fields = [
    {
      name: 'ObjectID',
      alias: 'ObjectID',
      type: 'oid'
    },
    {
      name: 'colour',
      alias: 'colour',
      type: 'string'
    },
    {
      name: 'geometry',
      alias: 'geometry',
      type: 'string',
    }
  ]

  constructor() { }

  ngOnInit(): void {
    this.initializeMap().then( () => {
      console.log('Map Allocated');
      this.watchForChange();

      console.log('Mapping Data');
      this.fixMapData();

      console.log(this.sortedMapData);

      console.log('Creating Feature Layer');
      this.createFeatureLayers().then(() => {
        console.log('Feature Layer');
        console.log(this.featureLayer);

        console.log('Adding Map Data');
        this._map.add(this.featureLayer);
      });
    })
  }

  ngOnDestroy() {
  }

  async initializeMap() {
    [ this.EsriMap,
      this.EsriMapView,
      this.FeatureLayer,
      this.SimpleLineSymbol,
      this.SimpleFillSymbol,
      this.Graphic,
      this.Color,
      this.WatchUtil,
      this.Home,
      this.Expand,
      this.Print,
      this.PrintTask,
      this.PrintTemplate,
      this.PrintParameters ] = await loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/symbols/SimpleLineSymbol',
      'esri/symbols/SimpleFillSymbol',
      'esri/Graphic',
      'esri/Color',
      'esri/core/watchUtils',
      'esri/widgets/Home',
      'esri/widgets/Expand',
      'esri/widgets/Print',
      'esri/tasks/PrintTask',
      'esri/tasks/support/PrintTemplate',
      'esri/tasks/support/PrintParameters',
    ]);

    /* Configure and initialize the map */
    const mapProperties: esri.MapProperties = {
      basemap: this._basemap,
    };

    this._map = new this.EsriMap(mapProperties);

    const mapViewProperties: esri.MapViewProperties = {
      container: this.mapViewEl.nativeElement,
      center: this._center,
      zoom: this._zoom,
      map: this._map
    };

    this._view = new this.EsriMapView(mapViewProperties);
    await this._view.when();
    return this._view;
  }

  watchForChange() {
    this.WatchUtil.whenTrue(this._view, 'stationary', () => {
      console.log('Adding Features');
      this.addUIFeatures();
    });
  }

  addUIFeatures() {
    try {
      if (this._view) {
        const topLeftPane = document.getElementsByClassName('esri-ui-top-left')[0];
        if (topLeftPane) {
          topLeftPane.append(this.printButtonElem.nativeElement)
        }


        if (this.Home) {
          const home = this.Home({
            view: this._view
          });

          this._view.ui.add([home], 'top-left');
        }
      } else {
        console.log('View Removed');
      }
    } catch (error) {
      console.log(error);
    }
  }

  printMap() {
    console.log('In Print Map');

    const printTask = this.PrintTask({
      url: 'https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'
    });

    const template = new this.PrintTemplate({
      format: 'jpg',
      layout: 'a4-landscape',
      layoutOptions: {
        titleText: '',
        authorText: ''
      }
    });

    const params = new this.PrintParameters({
      view: this._view,
      template: template
    });

    printTask.execute(params).then( (result) => {

      console.log('Result');
      console.log(result);

      window.open(result.url);
    }, (err) => {
      console.log('ESRI Print Task Error: ', err);
    });
  }

  fixMapData() {
    this.sortedMapData = this.dummyData.map((entry) => {
        const _temp = WKT.parse(entry.coordinatesText);
        if (_temp) {
          let geometry;
          if (_temp.type === 'LineString') {
            geometry = {
              type: 'polyline',
              paths: 'coordinates' in _temp ? _temp.coordinates : null,
            }
          }

          return {
            geometry: _.cloneDeep(geometry),
            attributes: {
              ObjectID: entry.assetSectionId,
              colour: _.cloneDeep(entry.colour),
              geometry: _.cloneDeep(geometry.type),
            }
          };
        }
    });
  }

  createFeatureLayers() {
    return new Promise( (r) => {
      this.featureLayer = new this.FeatureLayer(this.buildFeatureSettings('polyline', this.sortedMapData, '#4fb821'));
      r();
    })
  }

  buildFeatureSettings(geometryType, data, colour) {
    return {
      source: data,
      renderer: this.buildRenderSettings(data, colour),
      fields: this._fields,
      objectIdField: 'ObjectID',
      geometryType: geometryType,
      spatialReference: {
        wkid: 4326
      },
      title: 'test'
    };
  }

  buildRenderSettings(data, colour: string) {
    return {
      type: 'simple',
      symbol: {
        style: null,
        type: 'simple-fill',
        size: 30,
        color: _.cloneDeep(colour),
        outline: {
          width: 4,
          color: _.cloneDeep(colour),
        }
      },
    }
  }
}
