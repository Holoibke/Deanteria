# Fantasy Map

An interactive fantasy map built with Leaflet.js, hosted on GitHub Pages.

---

## Setup

### 1. Add your map image

Replace `map.png` in the root with your own map image.
Then open `js/viewer.js` and update these two lines to match your image's pixel dimensions:

```js
const MAP_WIDTH  = 1000;  // ← your image width in pixels
const MAP_HEIGHT = 800;   // ← your image height in pixels
```

### 2. Add your icons

Drop icon files into the `icons/` folder.
Then open `js/editor.js` and add them to `ICON_OPTIONS`:

```js
const ICON_OPTIONS = [
  { label: 'City',    value: 'icons/city.png'    },
  { label: 'Town',    value: 'icons/town.png'    },
  // add more here...
];
```

### 3. Set the editor password

The default password is `fantasycartographer`. To change it:

1. Open a browser console (F12)
2. Run:
```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('yournewpassword'))
  .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
```
3. Copy the hash and paste it into `js/editor.js` as `EDITOR_PASSWORD_HASH`.

### 4. Enable GitHub Pages

- Go to your repo → Settings → Pages
- Set source to **Deploy from a branch** → `main` → `/ (root)`
- Your map will be at `https://your-username.github.io/your-repo/`

### 5. Create a GitHub Personal Access Token

- Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Create a token with **Contents: Read and Write** permission for this repo
- In the editor (`/editor.html`), go to the **Settings** tab and paste the token
- Settings are stored in your browser's localStorage — never committed to the repo

---

## Using the editor

Navigate to `/editor.html` on your GitHub Pages URL (or locally).
- Enter the editor password
- Click **+ Add marker** or **+ Add label**, then click on the map to place it
- Fill in the details in the edit panel that opens
- Click **Save to GitHub** when you're done

Changes go live within a minute or two as GitHub Pages rebuilds.

---

## File structure

```
├── index.html        Public viewer
├── editor.html       Password-protected editor
├── map.png           Your base map image
├── data.json         All markers and labels
├── icons/            Marker icon files (.png / .svg)
│   ├── city.png
│   └── ...
├── css/
│   ├── viewer.css
│   └── editor.css
└── js/
    ├── viewer.js
    └── editor.js
```

---

## Label styles

Three built-in label styles, customisable in `css/viewer.css`:

| Style    | Use for               |
|----------|-----------------------|
| `region` | Forests, mountain ranges, territories |
| `ocean`  | Seas, lakes, rivers   |
| `city`   | Named settlements     |

To add more styles, add a CSS class in `.map-label.<yourclass> span` and add the name to `LABEL_STYLES` in `editor.js`.

---

## Zoom levels

Leaflet zoom goes from `0` (fully zoomed out) to `5` (maximum zoom).
Each marker and label has a `minZoom` and `maxZoom` — it only appears when the current zoom is within that range.

Use this to hide minor locations until the viewer zooms in, and hide fine detail when zoomed out.
