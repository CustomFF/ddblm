[![Русский](https://img.shields.io/badge/Русский-blue?style=flat&logo=readme&logoColor=white)](README.ru.md)
[![13 bookmarklets](https://img.shields.io/badge/13-bookmarklets-ff69b4?style=flat&logo=bookmarklets&logoColor=white)](https://daydve.github.io/ddblm/)

# ddblm

My collection of bookmarklets, plus `blm`, a small CLI for building and managing them.

**Gallery:** https://daydve.github.io/ddblm/

## What is a bookmarklet

A bookmark that runs JavaScript instead of opening a URL. Click it and the script runs on the current page. No installation, no permissions, no extension store.

## Bookmarklets

| File | Label | What it does |
|---|---|---|
| `copy.js` | Copy element text | Copies the text of any element on click |
| `ddg.js` | Search on DuckDuckGo | Re-runs the current search query in DuckDuckGo |
| `edit.js` | Edit mode | Toggles `designMode` to edit text on the page |
| `kpfinder.js` | KPFinder | Searches Kinopoisk for movies (API token required) |
| `logins.js` | Search logins/passwords | Looks up site logins on BugMeNot and Google |
| `mdpick.js` | Export to Markdown | Picks page blocks with the mouse or from the selection and copies or saves them as Markdown |
| `passwords.js` | Show passwords | Reveals passwords hidden behind asterisks |
| `qr.js` | QR | Generates a QR code for the current page |
| `safeselect.js` | Safe select | Disables links so text can be selected over them |
| `telegram.js` | Send to Telegram | Sends the link or selected text to Telegram |
| `undisable.js` | unDisable element | Force-enables disabled elements |
| `unlock.js` | unlock right click | Removes selection and right-click restrictions |
| `wback.js` | WBack Machine | Wayback Machine menu: archive, latest, save |

## Usage

1. Open the [gallery](https://daydve.github.io/ddblm/).
2. Enable the bookmarks toolbar (`Ctrl+Shift+B` in Firefox).
3. Drag a card (icon + name) onto it.

If a bookmarklet requires an API token, enter it in the card's field before dragging.

The gallery UI is bilingual: English by default, `?lang=ru` for Russian.

## Browser support

The bookmarklets are plain JavaScript and should work in any browser that supports `javascript:` bookmarks. Only Firefox has been tested.

The extras (custom toolbar icons and the `userChrome.css` theme) are Firefox-only.

## Repository layout

```
src/          Bookmarklet sources
icons/        SVG icons (24×24, theme-adaptive)
templates/    Scaffolding for new bookmarklets
docs/         Build output (GitHub Pages)
blm           The CLI
```

### Bookmarklet metadata

Every `src/*.js` file starts with metadata comments:

```js
// @label: Copy element text
// @desc: Позволяет скопировать текст любого элемента по клику
// @desc-en: Copy the text of any element on click
// @icon: copy_element_text.svg
```

Optional fields: `@token`, `@token-desc`, `@token-desc-en`, `@token-link`.

`@desc` is the Russian description; `@desc-en` is the English one. If `@desc-en` is missing, `@desc` is used for both languages.

## The `blm` CLI

Requires Python 3.8+. No other dependencies.

```bash
./blm build            # src/*.js → docs/index.html + docs/blm_panel.css
./blm list             # list bookmarklets
./blm add <name>       # scaffold a new bookmarklet from the template
./blm edit <name>      # open in $EDITOR
./blm rm <name>        # delete
./blm config           # print / set / get / reset
./blm patchff          # symlink icons and CSS into the Firefox profile
./blm get              # git pull
./blm put -m "msg"     # build + commit + push
```

### Config

Stored at `~/.config/blm/config.json`:

| Key | Description |
|---|---|
| `ff_profile` | Firefox profile path |
| `editor` | Editor used by `blm edit` |
| `author` | Author name for new bookmarklets |

### Standalone tools

- `patch_icon.py`: patches Inkscape SVGs for Firefox light/dark theme
- `firefox_rdp_proxy.py`: proxy for the Firefox Remote Debugging Protocol

## License

[MPL-2.0](LICENSE) © DayDve
