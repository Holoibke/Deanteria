# Fantasy Map

An interactive fantasy map viewer and editor built with [Leaflet.js](https://leafletjs.com/), designed for GitHub Pages.

## Setup

### 1. Add your map image

Place your map file in the root directory and update `MAP_CONFIG.imageUrl` in `js/map.js`:

```js
imageUrl:   'map.jpg',   // ← your filename here
imageWidth:  12088,      // ← your image width in px
imageHeight: 7932,       // ← your image height in px
```

Supported formats: `.jpg`, `.png`, `.webp`

### 2. Add your icons

Drop `.png`, `.svg`, or `.ico` files into `icons/` and register them in `MAP_CONFIG.icons` in `js/map.js`:

```js
icons: [
  { id: 'default',  label: 'Default Pin',  file: 'default.png'  },
  { id: 'city',     label: 'City',         file: 'city.png'     },
  { id: 'my-thing', label: 'My Thing',     file: 'my-thing.svg' },
],
```

Icons are displayed at a fixed `28×28px` regardless of zoom. Change `iconSize` in `MAP_CONFIG` to adjust.

### 3. Deploy to GitHub Pages

1. Push this folder as a GitHub repository (or into a subfolder with its own Pages config)
2. Go to **Settings → Pages → Source: Deploy from branch → main → / (root)**
3. Your map will be live at `https://yourusername.github.io/repo-name/`

## Using the editor

1. Open the map in a browser
2. Click **✏ Edit Mode** in the top-right toolbar
3. Go to the **Markers** or **Labels** tab in the sidebar
4. Click **+ Place Marker** / **+ Place Label**, then click on the map
5. Fill in the form that appears at the bottom of the sidebar
6. Click **Save**
7. When done, go to the **Data** tab and click **⬇ Download mapdata.json**
8. Replace `data/mapdata.json` in your repo with the downloaded file and push

## File structure

```
/
├── index.html              Main page
├── style.css               All styles
├── js/
│   ├── map.js              Map logic (Leaflet, markers, labels, visibility)
│   └── editor.js           Editor sidebar logic
├── data/
│   └── mapdata.json        Marker and label data (edit via the UI, not by hand)
├── icons/                  Marker icon images
│   ├── default.png
│   ├── city.png
│   └── dungeon.png
└── README.md
```

## Zoom levels

With `CRS.Simple` and a single image, zoom works as follows:

| Zoom | Approx. view |
|------|-------------|
| -4   | Very zoomed out (full world view) |
| -2   | Default start — full map visible |
|  0   | 1:1 pixel scale |
|  3   | Zoomed in close |

Marker and label visibility is controlled by `minZoom` / `maxZoom` per item (set in the editor).

## Future: switching to tiles

When your map is finished and file size becomes an issue:

1. Install GDAL: `pip install gdal` or via your OS package manager
2. Run: `gdal2tiles.py -z 0-4 --profile=raster map.jpg tiles/`
3. In `js/map.js`, replace the `imageOverlay` line with:
   ```js
   L.tileLayer('tiles/{z}/{x}/{y}.png', { tms: true, noWrap: true }).addTo(map);
   ```
4. Remove the `imageOverlay` import. All marker coordinates remain valid.

## Data schema

`data/mapdata.json` structure:

```json
{
  "markers": [
    {
      "id": "abc123",
      "name": "The Capital",
      "lat": 4200,
      "lng": 6100,
      "icon": "city",
      "minZoom": -4,
      "maxZoom": 3,
      "description": "Seat of the empire"
    }
  ],
  "labels": [
    {
      "id": "def456",
      "name": "The Wastes",
      "lat": 3000,
      "lng": 2000,
      "fontSize": 24,
      "minZoom": -3,
      "maxZoom": 1
    }
  ]
}
```

Coordinates are in Leaflet `CRS.Simple` space: `lat` = y from bottom, `lng` = x from left.
