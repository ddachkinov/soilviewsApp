// Type compatibility shim for using @mapbox/mapbox-gl-draw with maplibre-gl
declare module '@mapbox/mapbox-gl-draw' {
  import { IControl, Map, ControlPosition } from 'maplibre-gl';

  export default class MapboxDraw implements IControl {
    constructor(options?: any);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition?: () => ControlPosition;
    add(geojson: any): string[];
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: any): string[];
    getAll(): any;
    get(id: string): any;
    getSelectedIds(): string[];
    getSelected(): any;
    getMode(): string;
    changeMode(mode: string, options?: any): this;
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
  }

  export const modes: {
    SIMPLE_SELECT: 'simple_select';
    DIRECT_SELECT: 'direct_select';
    DRAW_LINE_STRING: 'draw_line_string';
    DRAW_POLYGON: 'draw_polygon';
    DRAW_POINT: 'draw_point';
  };

  export const events: {
    CREATE: 'draw.create';
    UPDATE: 'draw.update';
    DELETE: 'draw.delete';
    SELECTION_CHANGE: 'draw.selectionchange';
    MODE_CHANGE: 'draw.modechange';
    RENDER: 'draw.render';
    COMBINE_FEATURES: 'draw.combine';
    UNCOMBINE_FEATURES: 'draw.uncombine';
  };
}
