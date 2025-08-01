import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import Circle from 'ol/geom/Circle';

export const beaconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="24px" height="24px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
    scale: 1.5,
  }),
});

export const barrierStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 0, 0, 0.3)',
  }),
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
});

export const zoneStyle = new Style({
  fill: new Fill({
    color: 'rgba(0, 255, 0, 0.1)',
  }),
  stroke: new Stroke({
    color: 'green',
    width: 1,
  }),
});

export const switchStyle = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="purple" width="24px" height="24px"><path d="M19 1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-1 14h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zM8 5h8v2H8V5zm0 4h8v2H8V9zm0 4h8v2H8v-2z"/></svg>',
    scale: 1.5,
  }),
});

export const sketchStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(255, 0, 0, 0.7)',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.7)',
    }),
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.8)',
      width: 1,
    }),
  }),
});

export const rescaleLineStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 165, 0, 0.7)',
    width: 3,
  }),
});

export const hoverStyle = new Style({
  stroke: new Stroke({
    color: 'cyan',
    width: 3,
  }),
  image: new CircleStyle({
    radius: 10,
    stroke: new Stroke({
      color: 'cyan',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 255, 255, 0.1)',
    }),
  }),
});

export const zoneHoverStyle = new Style({
  stroke: new Stroke({
    color: 'orange',
    width: 3,
  }),
  fill: new Fill({
    color: 'rgba(255, 165, 0, 0.2)',
  }),
});

export const aoaAntennaIcon = new Icon({
  anchor: [0.5, 1],
  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24px" height="24px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
  scale: 1.5,
});

export const zonalAntennaIcon = new Icon({
  anchor: [0.5, 1],
  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green" width="24px" height="24px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
  scale: 1.5,
});

export const cableDuctLineStyle = new Style({
  stroke: new Stroke({
    color: 'orange',
    width: 3,
    lineDash: [5, 5],
  }),
});

export const getAntennaStyle = (feature: any, showAntennaRanges: boolean) => {
  const range = feature.get('range');
  const position = feature.getGeometry()?.getCoordinates();
  const type = feature.get('type');

  const styles: Style[] = [
    new Style({
      image: type === 'zonal' ? zonalAntennaIcon : aoaAntennaIcon,
    }),
  ];

  if (showAntennaRanges) {
    if (position && range !== undefined) {
      styles.push(
        new Style({
          geometry: new Circle(position, range),
          fill: new Fill({
            color: type === 'zonal' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)',
          }),
          stroke: new Stroke({
            color: type === 'zonal' ? 'green' : 'blue',
            width: 1,
          }),
        })
      );
    }
  }
  return styles;
};

export const getCableDuctStyle = (feature: any, showCableDuctLengths: boolean, hoveredFeatureId: string | null) => {
  const styles: Style[] = [cableDuctLineStyle];

  if (showCableDuctLengths) {
    const geometry = feature.getGeometry();
    if (geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates();
      for (let i = 0; i < coordinates.length - 1; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[i + 1];

        const segmentLength = Math.sqrt(
          Math.pow(p2[0] - p1[0], 2) +
          Math.pow(p2[1] - p1[1], 2)
        );

        const midpoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

        styles.push(new Style({
          geometry: new Point(midpoint),
          text: new Text({
            text: `${segmentLength.toFixed(2)} м`,
            font: '12px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'white', width: 3 }),
            offsetY: -10,
            placement: 'point',
          }),
        }));
      }
    }
  }

  if (feature.get('id') === hoveredFeatureId) {
    styles.push(hoverStyle);
  }

  return styles;
};