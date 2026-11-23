[![English](https://img.shields.io/badge/English-blue?style=flat&logo=readme&logoColor=white)](README.md)
[![13 букмарклетов](https://img.shields.io/badge/13-букмарклетов-ff69b4?style=flat&logo=bookmarklets&logoColor=white)](https://daydve.github.io/ddblm/)

# ddblm

Моя коллекция букмарклетов и `blm`, небольшая CLI-утилита для их сборки и управления.

**Галерея:** https://daydve.github.io/ddblm/

## Что такое букмарклет

Закладка, которая вместо ссылки выполняет JavaScript. Нажал — скрипт сработал на текущей странице. Без установки, разрешений и магазина расширений.

## Букмарклеты

| Файл | Название | Что делает |
|---|---|---|
| `copy.js` | Copy element text | Копирует текст любого элемента по клику |
| `ddg.js` | Search on DuckDuckGo | Повторяет текущий поиск в DuckDuckGo |
| `edit.js` | Edit mode | Включает `designMode` для правки текста на странице |
| `kpfinder.js` | KPFinder | Ищет фильмы на Кинопоиске (нужен API-токен) |
| `logins.js` | Search logins/passwords | Ищет логины для сайта на BugMeNot и Google |
| `mdpick.js` | Export to Markdown | Выбирает блоки страницы мышью или по выделению и копирует или сохраняет их в Markdown |
| `passwords.js` | Show passwords | Показывает пароли, скрытые звёздочками |
| `qr.js` | QR | Генерирует QR-код для текущей страницы |
| `safeselect.js` | Safe select | Отключает ссылки, чтобы можно было выделять текст |
| `telegram.js` | Send to Telegram | Отправляет ссылку или выделенное в Telegram |
| `undisable.js` | unDisable element | Принудительно включает неактивные элементы |
| `unlock.js` | unlock right click | Снимает запрет на выделение и правый клик |
| `wback.js` | WBack Machine | Меню Wayback Machine: архив, последняя версия, сохранить |

## Использование

1. Открой [галерею](https://daydve.github.io/ddblm/).
2. Включи панель закладок (`Ctrl+Shift+B` в Firefox).
3. Перетащи карточку (иконка + название) на панель.

Если букмарклету нужен API-токен — впиши его в поле на карточке перед перетаскиванием.

Язык интерфейса: английский по умолчанию, `?lang=ru` — русский.

## Поддержка браузеров

Букмарклеты — чистый JavaScript, работают в любом браузере с поддержкой `javascript:`-закладок. Проверены только в Firefox.

Дополнительные штуки (кастомные иконки на панели закладок и тема `userChrome.css`) только для Firefox.

## Структура репозитория

```
src/          Исходники букмарклетов
icons/        SVG-иконки (24×24, адаптивные к теме)
templates/    Шаблоны для новых букмарклетов
docs/         Результат сборки (GitHub Pages)
blm           CLI
```

### Метаданные букмарклета

Каждый `src/*.js` начинается с мета-комментариев:

```js
// @label: Copy element text
// @desc: Позволяет скопировать текст любого элемента по клику
// @desc-en: Copy the text of any element on click
// @icon: copy_element_text.svg
```

Опциональные поля: `@token`, `@token-desc`, `@token-desc-en`, `@token-link`.

`@desc` — русское описание, `@desc-en` — английское. Если `@desc-en` нет, `@desc` используется для обоих языков.

## CLI `blm`

Требуется Python 3.8+. Других зависимостей нет.

```bash
./blm build            # src/*.js → docs/index.html + docs/blm_panel.css
./blm list             # список букмарклетов
./blm add <name>       # новый букмарклет из шаблона
./blm edit <name>      # открыть в $EDITOR
./blm rm <name>        # удалить
./blm config           # print / set / get / reset
./blm patchff          # прокидывает иконки и CSS в профиль Firefox
./blm get              # git pull
./blm put -m "msg"     # build + commit + push
```

### Конфиг

`~/.config/blm/config.json`:

| Ключ | Описание |
|---|---|
| `ff_profile` | Путь к профилю Firefox |
| `editor` | Редактор для `blm edit` |
| `author` | Имя автора для новых букмарклетов |

### Отдельные утилиты

- `patch_icon.py`: адаптирует SVG из Inkscape под светлую/тёмную тему Firefox
- `firefox_rdp_proxy.py`: прокси для Firefox Remote Debugging Protocol

## Лицензия

[MPL-2.0](LICENSE) © DayDve
