import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {loadModules} from 'esri-loader';
import esri = __esri;
import {DataService} from '../service/data.service';
import * as _ from 'lodash';

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

  private dummyData;

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

  constructor(private dataSvc: DataService) { }

  ngOnInit(): void {
    this.dummyData = this.dataSvc.grabData();
    this.initializeMap().then( () => {
      this.watchForChange().then(() => {
        this.fixMapData().then( () => {
          this.createFeatureLayers().then(() => {
            this._map.add(this.featureLayer);
          });
        })
      })
    })
  }

  ngOnDestroy() {
    console.log('In NG On Destroy');

    if (this._view) {
      try {
        this._view.container = null;
        this._view.destroy();
        this._view = null;
      } catch (error) {
        console.log(error);
      }
    }

    if (this._map) {
      try {
        this._map.destroy();
        this._map = null;
      } catch (error) {
        console.log(error);
      }
    }

    if (this.featureLayer) {
      try {
        this.featureLayer.destroy();
        this.featureLayer = null;
      } catch (error) {
        console.log(error);
      }
    }
  }

  async initializeMap() {
    const options = {
      version: '4.17',
      css: true
    };

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
    ], options);

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
    return new Promise((r) => {
      this.WatchUtil.whenTrue(this._view, 'stationary', () => {
        // this.addUIFeatures();
        r();
      });
    })
  }

  addUIFeatures() {
    try {
      if (this._view) {
        const topLeftPane = document.getElementsByClassName('esri-ui-top-left')[0];
        if (topLeftPane) {
          topLeftPane.append(this.printButtonElem.nativeElement)
        }

        try {
          if (this.Home) {
            const home = this.Home({
              view: this._view
            });

            this._view.ui.add([home], 'top-left');
          }
        } catch (error) {
          console.log(error);
        }

      } else {
        console.log('View Removed');
      }
    } catch (error) {
      console.log(error);
    }
  }

  printMap() {
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
      window.open(result.url);
    }, (err) => {
      console.log('ESRI Print Task Error: ', err);
    });
  }

  fixMapData() {
    return new Promise((r) => {
      this.sortedMapData = this.dummyData.features.map((entries, index) => {
        const geometry = {
          type: 'polyline',
          paths: entries.geometry.coordinates
        }

        return {
          geometry: _.cloneDeep(geometry),
          attributes: {
            ObjectID: index,
            colour: '#9ee86b',
            geometry: 'polyline',
          }
        };
      });
      r();
    })
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
        type: 'simple-line',
        size: 30,
        width: 3,
        color: _.cloneDeep(colour),
        outline: {
          width: 4,
          color: _.cloneDeep(colour),
        }
      }
    }
  }
}
