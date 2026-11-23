// @label: Export to Markdown
// @desc: Выбор блоков страницы мышью (как в uBlock Origin) и копирование или сохранение их в Markdown
// @desc-en: Pick page blocks with the mouse (like uBlock Origin's picker) and copy or save them as Markdown
// @icon: markdown.svg

(function() {
    if (window.__mdpick) { window.__mdpick(); return; }

    const T = /^ru\b/i.test(navigator.language)
        ? { copy: "Копировать", save: "Сохранить", cancel: "Отмена", imgs: "С картинками", n: "Выбрано: ", copied: "Скопировано", saved: "Сохранено", hint: "Клик: выбрать или снять блок" }
        : { copy: "Copy", save: "Save", cancel: "Cancel", imgs: "With images", n: "Selected: ", copied: "Copied", saved: "Saved", hint: "Click: pick or unpick a block" };

    /* ---------- HTML → Markdown ---------- */

    /* code keeps its spaces, tabs and empty lines through the whitespace cleanup as these placeholders */
    const SP = "\uE000", TAB = "\uE001", EMPTY = "\uE002";
    const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|CANVAS|IFRAME|OBJECT|BUTTON|INPUT|SELECT|TEXTAREA|LINK|META)$/;
    const INLINE = { STRONG: "**", B: "**", EM: "*", I: "*", CITE: "*", DFN: "*", S: "~~", DEL: "~~", STRIKE: "~~", MARK: "==" };
    let imgs = true;

    const clean = s => s.replace(/ {2,}/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n")
        .replace(/(?:\\\n){2,}/g, "\n\n").replace(/\\\n(?=\n|$)/g, "\n").replace(/(^|\n)\\\n/g, "$1").replace(/\n{3,}/g, "\n\n").trim().replace(/\\$/, "");
    const para = s => s ? "\n\n" + s + "\n\n" : "";
    const fence = (s, ch) => { let f = ch; while (s.includes(f)) f += ch[0]; return f; };
    const escText = s => s.replace(/[\\`*[\]<]/g, "\\$&").replace(/(^|\W)_|_(?=\W|$)/g, (m, p) => (p || "") + "\\_");
    /* wrap s in markup, keeping its outer whitespace outside the markup */
    const wrap = (s, open, close = open) => {
        const x = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
        return x[2] ? x[1] + open + x[2] + close + x[3] : s;
    };
    const visible = el => el.getAttribute("aria-hidden") !== "true" && (!el.checkVisibility || el.checkVisibility() || getComputedStyle(el).display === "contents");
    const url = u => u && !/^javascript:/i.test(u) ? u.replace(/[()\s]/g, encodeURIComponent) : "";
    const kids = el => [...(el.shadowRoot && !el.children.length ? el.shadowRoot : el).childNodes].map(md).join("");
    const inner = el => clean(kids(el));

    const codeBlock = el => {
        let lang = "";
        for (const e of [el, el.querySelector("code"), el.parentElement, el.getRootNode().host]) {
            const m = e && e.getAttribute && ((e.getAttribute("class") || "").match(/(?:^|\s)(?:lang(?:uage)?-|highlight-source-|brush:\s*)([\w+#-]+)/) || [, e.getAttribute("data-lang") || e.getAttribute("data-language")]);
            if (m && m[1]) { lang = m[1]; break; }
        }
        const text = el.innerText.replace(/\n$/, ""), f = fence(text, "```");
        return para(f + lang + "\n" + text.replace(/ /g, SP).replace(/\t/g, TAB).split("\n").map(l => l || EMPTY).join("\n") + "\n" + f);
    };

    const listItem = li => {
        const ol = li.parentElement && li.parentElement.tagName === "OL" && li.parentElement;
        let marker = !ol ? "- " : (li.getAttribute("value") || +(ol.getAttribute("start") || 1) + [...ol.children].filter(c => c.tagName === "LI").indexOf(li)) + ". ";
        const box = li.querySelector(":scope > input[type=checkbox], :scope > p > input[type=checkbox]");
        if (box) marker += box.checked ? "[x] " : "[ ] ";
        /* nested lists stay tight; continuation lines are indented under the marker */
        const s = inner(li);
        return s && s.replace(/\n\n(?=\uE000*(?:[-*+]|\d+[.)]) )/g, "\n").split("\n")
            .map((l, i) => i ? l && SP.repeat(marker.length) + l : marker + l).join("\n");
    };

    const table = rows => {
        const grid = rows.filter(visible).map(r => [...r.cells].flatMap(c =>
            [inner(c).replace(/\n+/g, "<br>").replace(/\|/g, "\\|") || " ", ...Array(Math.max(0, (c.colSpan || 1) - 1)).fill(" ")]));
        if (!grid.length) return "";
        const w = Math.max(...grid.map(r => r.length));
        const line = r => "| " + Array.from({ length: w }, (_, i) => r[i] || " ").join(" | ") + " |";
        return para([line(grid[0]), "|" + " --- |".repeat(w), ...grid.slice(1).map(line)].join("\n"));
    };

    function md(n) {
        if (n.nodeType === 3) return escText(n.nodeValue.replace(/[ \t\n\r\f\u00A0]+/g, " "));
        if (n.nodeType !== 1) return "";
        const el = n, tag = el.tagName.toUpperCase();
        if (SKIP.test(tag) || !visible(el)) return "";
        if (INLINE[tag]) return wrap(kids(el), INLINE[tag]);
        if (/^H[1-6]$/.test(tag)) { const s = inner(el).replace(/\n+/g, " "); return para(s && "#".repeat(+tag[1]) + " " + s); }
        if (/^(SUP|SUB|KBD)$/.test(tag)) return wrap(kids(el), "<" + tag.toLowerCase() + ">", "</" + tag.toLowerCase() + ">");
        switch (tag) {
            case "BR": return "\\\n";
            case "HR": return para("---");
            case "PRE": return codeBlock(el);
            case "CODE": {
                const t = el.textContent, f = fence(t, "`");
                return t && f + (/^`|`$/.test(t) ? " " + t + " " : t) + f;
            }
            case "A": {
                const s = kids(el), h = url(el.href);
                if (!h || !s.trim() || /\n/.test(s.trim()) || h === location.href + "#") return s;
                return wrap(s, "[", "](" + h + (el.title ? ' "' + el.title.replace(/"/g, '\\"') + '"' : "") + ")");
            }
            case "IMG": {
                const src = imgs && url(el.currentSrc || el.src);
                if (!src || /^data:/.test(src) && src.length > 2000) return imgs && el.alt ? escText(el.alt) : "";
                return "![" + escText(el.alt || "").replace(/\n/g, " ") + "](" + src + ")";
            }
            case "UL": case "OL": case "MENU": return para([...el.children].filter(c => c.tagName === "LI" && visible(c)).map(listItem).filter(Boolean).join("\n"));
            case "LI": return para(listItem(el));
            case "BLOCKQUOTE": { const s = inner(el); return para(s && s.split("\n").map(l => l ? "> " + l : ">").join("\n")); }
            case "TABLE": return table([...el.rows]);
            case "DT": return para("**" + inner(el) + "**");
            case "DD": return para(": " + inner(el));
        }
        const disp = getComputedStyle(el).display;
        if (/^inline/.test(disp) || disp === "contents") return kids(el);
        const s = inner(el);
        /* a paragraph that starts like markup must stay text */
        return para(tag === "P" ? s.replace(/^(#{1,6} |[-+*] |\d+[.)] |>|=+$|-{3,}$)/, "\\$1") : s);
    }

    const toMarkdown = els => {
        let out = "", prev = null;
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            let s;
            if (el.tagName === "TR") {
                /* neighbouring picked rows of one table make one table, under its header row */
                const t = el.closest("table"), rows = [el];
                while (els[i + 1] && els[i + 1].tagName === "TR" && els[i + 1].closest("table") === t) rows.push(els[++i]);
                const head = t.tHead ? t.tHead.rows[0] : t.rows[0];
                s = clean(table(rows[0] === head ? rows : [head, ...rows]));
            } else s = clean(el.run ? el.nodes.map(md).join("") : md(el));
            if (!s) continue;
            const sameList = prev && el.tagName === "LI" && prev.tagName === "LI" && prev.parentElement === el.parentElement;
            out += (out ? (sameList ? "\n" : "\n\n") : "") + s;
            prev = el;
        }
        return out.replace(/\n{3,}/g, "\n\n").trim().replace(/\uE002/g, "").replace(/\uE000/g, " ").replace(/\uE001/g, "\t") + "\n";
    };

    /* ---------- blocks ---------- */

    const blockOf = el => {
        if (el && el.nodeType !== 1) el = el.parentElement;
        el = el && el.closest("pre") || el;
        for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            const d = getComputedStyle(el).display;
            if (el.tagName === "IMG" || !/^inline/.test(d) && d !== "contents") return el;
        }
        return null;
    };
    /* the next block up, skipping wrappers of the same size */
    const parentOf = el => {
        const r = el.getBoundingClientRect();
        let p = el.parentElement;
        for (let q; p && p !== document.body && (q = p.getBoundingClientRect(),
            Math.abs(q.left - r.left) < 1 && Math.abs(q.top - r.top) < 1 && Math.abs(q.width - r.width) < 1 && Math.abs(q.height - r.height) < 1); p = p.parentElement);
        return p && p !== document.body && p !== document.documentElement ? p : null;
    };

    /* loose inline content (text, <br>, links...) between the block children of a container
       has no element of its own; such a run is picked as a pseudo-block */
    const isBlockEl = c => c.nodeType === 1 && c.tagName !== "IMG" && getComputedStyle(c).display !== "none" && blockOf(c) === c;
    const hasBlocks = el => [...el.children].some(isBlockEl);
    const runOf = (box, n) => {
        while (n.parentNode !== box) n = n.parentNode;
        while (n.previousSibling && !isBlockEl(n.previousSibling)) n = n.previousSibling;
        const nodes = [n], r = document.createRange();
        while (n.nextSibling && !isBlockEl(n.nextSibling)) nodes.push(n = n.nextSibling);
        r.setStartBefore(nodes[0]);
        r.setEndAfter(n);
        return {
            run: true, tagName: "#RUN", nodes, parentElement: box,
            get isConnected() { return nodes[0].isConnected; },
            contains: x => nodes.some(m => m === x || m.contains(x)),
            getBoundingClientRect: () => r.getBoundingClientRect()
        };
    };
    const head = x => x.run ? x.nodes[0] : x;
    const same = (a, b) => a === b || !!a && !!b && head(a) === head(b);
    const inside = (x, p) => same(x, p) || p.contains(head(x));

    let picked = [];
    const add = el => {
        if (!el || picked.some(p => inside(el, p))) return;
        picked = picked.filter(p => !inside(p, el));
        picked.push(el);
    };
    const sorted = () => picked.filter(p => p.isConnected).sort((a, b) => head(a).compareDocumentPosition(head(b)) & 4 ? -1 : 1);

    /* ---------- current selection → blocks ---------- */

    /* text nodes (and images / shadow hosts) the range really selects: visible, selectable, not blank */
    const items = (r, withObjects) => {
        const out = [], root = r.commonAncestorContainer;
        const take = n => {
            const el = n.nodeType === 3 ? n.parentElement : n;
            if (!el || !visible(el) || getComputedStyle(el).userSelect === "none") return;
            if (n.nodeType === 3 ? n.nodeValue.slice(n === r.startContainer ? r.startOffset : 0, n === r.endContainer ? r.endOffset : undefined).trim()
                : withObjects && (n.tagName === "IMG" || n.shadowRoot)) out.push(n);
        };
        if (root.nodeType === 3) take(root);
        else for (let w = document.createTreeWalker(root, 5), n = root; n; n = w.nextNode()) if (r.intersectsNode(n)) take(n);
        return out;
    };
    /* el counts as covered when nothing selectable is left outside the range */
    const covers = (r, el) => {
        const q = document.createRange();
        q.selectNodeContents(el);
        const a = q.cloneRange(), b = q.cloneRange();
        a.setEnd(r.startContainer, r.startOffset);
        b.setStart(r.endContainer, r.endOffset);
        return !(r.compareBoundaryPoints(Range.START_TO_START, q) > 0 && items(a).length || r.compareBoundaryPoints(Range.END_TO_END, q) < 0 && items(b).length);
    };
    const fromRange = (r, n) => {
        let b = blockOf(n);
        if (b && n.nodeType === 3 && !covers(r, b) && hasBlocks(b)) return runOf(b, n);
        if (b && /^T[DH]$/.test(b.tagName)) b = b.parentElement;
        for (let p = b && parentOf(b); p && covers(r, p); p = parentOf(p)) b = p;
        return b;
    };
    const toRange = c => { const r = document.createRange(); r.setStart(c.startContainer, c.startOffset); r.setEnd(c.endContainer, c.endOffset); return r; };

    const sel = getSelection();
    /* getRangeAt() breaks when an edge is inside a shadow root (GitHub's <relative-time>):
       getComposedRanges() lifts such edges to the host for picking, or keeps them exact, given the roots, for restoring */
    const composed = shadowRoots => sel.getComposedRanges ? sel.getComposedRanges({ shadowRoots }) : Array.from({ length: sel.rangeCount }, (_, i) => sel.getRangeAt(i));
    const saved = sel.rangeCount && (c => sel.direction === "backward"
        ? [c.endContainer, c.endOffset, c.startContainer, c.startOffset]
        : [c.startContainer, c.startOffset, c.endContainer, c.endOffset])(composed([...document.querySelectorAll("*")].map(e => e.shadowRoot).filter(Boolean))[0]);
    for (const r of composed([]).map(toRange)) {
        const its = r.collapsed ? [] : items(r, true);
        if (!its.length) continue;
        /* shrink the range to what is really selected, so unselectable or blank edges don't count */
        const f = its[0], l = its[its.length - 1], nr = document.createRange();
        if (f.nodeType === 3) nr.setStart(f, f === r.startContainer ? r.startOffset : 0); else nr.setStartBefore(f);
        if (l.nodeType === 3) nr.setEnd(l, l === r.endContainer ? r.endOffset : l.length); else nr.setEndAfter(l);
        its.forEach(n => { if (!picked.some(p => p.contains(n))) add(fromRange(nr, n)); });
    }
    sel.removeAllRanges();

    /* ---------- UI ---------- */

    const host = document.createElement("div");
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>
        svg{position:fixed;inset:0;width:100%;height:100%;}
        .bar{position:fixed;top:12px;right:12px;pointer-events:auto;display:flex;flex-direction:column;gap:6px;background:#202124;color:#e8eaed;font:13px/1.3 system-ui,sans-serif;padding:10px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.45);max-width:260px;}
        .row{display:flex;gap:6px;}
        button{all:unset;cursor:pointer;padding:6px 12px;border-radius:5px;background:#3c4043;color:#e8eaed;font:inherit;text-align:center;}
        button.p{background:#1a73e8;color:#fff;}
        button:hover:not(:disabled){filter:brightness(1.2);}
        button:disabled{opacity:.4;cursor:default;}
        .n{font-weight:600;}
        .h{font-size:11px;opacity:.65;}
        label{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;}
        input{margin:0;accent-color:#1a73e8;}
    </style>
    <svg><path fill="rgba(0,0,0,.4)" fill-rule="evenodd"/><g></g></svg>
    <div class="bar">
        <div class="n"></div>
        <label><input type="checkbox" checked>${T.imgs}</label>
        <div class="row"><button class="p">${T.copy}</button><button>${T.save}</button><button>${T.cancel}</button></div>
        <div class="h">${T.hint}</div>
    </div>`;
    const $ = s => root.querySelector(s);
    const [bCopy, bSave, bCancel] = root.querySelectorAll("button");
    const bar = $(".bar"), svg = $("svg"), mask = $("path"), frames = $("g");
    /* the page gets a crosshair cursor everywhere */
    const cursor = document.createElement("style");
    cursor.textContent = "*{cursor:crosshair!important}";
    document.documentElement.append(host, cursor);

    let cur = null, mx = -1, my = -1, raf = 0;

    const hover = () => {
        const e = mx < 0 ? null : document.elementFromPoint(mx, my);
        let b = e === host ? null : blockOf(e);
        /* over loose text of a container with blocks: take just that run */
        const cp = b && hasBlocks(b) && document.caretPositionFromPoint && document.caretPositionFromPoint(mx, my), t = cp && cp.offsetNode;
        if (t && t.nodeType === 3 && t.nodeValue.trim() && blockOf(t) === b) {
            const run = runOf(b, t), q = run.getBoundingClientRect();
            if (mx >= q.left && mx <= q.right && my >= q.top && my <= q.bottom) b = run;
        }
        if (!same(b, cur)) cur = b;
    };

    /* every frame: a dark mask with holes for the picked blocks and the hovered one, plus their frames */
    const PICKED = 'fill="rgba(26,115,232,.18)" stroke="#1a73e8"', HOVER = 'fill="rgba(26,115,232,.12)" stroke="#fbbc04" stroke-dasharray="6 3"';
    const draw = () => {
        raf = requestAnimationFrame(draw);
        let d = `M0,0H${innerWidth}V${innerHeight}H0z`, g = "";
        const frame = (r, style, hole) => {
            if (hole) d += `M${r.left},${r.top}h${r.width}v${r.height}h${-r.width}z`;
            g += `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" stroke-width="2" ${style}/>`;
        };
        for (const p of picked) {
            const r = p.isConnected && p.getBoundingClientRect();
            if (r && r.bottom >= 0 && r.top <= innerHeight) frame(r, PICKED, true);
        }
        if (cur && !picked.some(p => same(p, cur))) frame(cur.getBoundingClientRect(), HOVER, !picked.some(p => inside(cur, p)));
        mask.setAttribute("d", d);
        if (frames.innerHTML !== g) frames.innerHTML = g;
    };

    const update = () => {
        const n = sorted().length;
        $(".n").textContent = T.n + n;
        bCopy.disabled = bSave.disabled = !n;
    };

    /* the page's own mouse handling is shut off by catching events on window first; the panel (inside host) is let through */
    const ac = new AbortController();
    const on = (types, f) => types.split(" ").forEach(t => addEventListener(t, e => e.target === host || f(e), { capture: true, passive: false, signal: ac.signal }));
    const kill = e => { e.preventDefault(); e.stopPropagation(); };
    on("mousemove", e => { mx = e.clientX; my = e.clientY; hover(); });
    on("mouseout", e => { if (!e.relatedTarget) { mx = -1; cur = null; } });
    on("scroll", hover);
    on("mousedown mouseup pointerdown pointerup dblclick contextmenu auxclick", kill);
    on("click", e => {
        kill(e);
        if (!cur) return;
        const owner = picked.find(p => inside(cur, p));
        if (owner) picked = picked.filter(p => p !== owner); else add(cur);
        update();
    });

    const copyText = async s => {
        try { await navigator.clipboard.writeText(s); return; } catch (e) {}
        /* plain-http pages have no clipboard API */
        const ta = document.createElement("textarea");
        ta.value = s;
        ta.style.cssText = "position:fixed;left:-9999px;";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    };
    const saveText = s => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([s], { type: "text/markdown;charset=utf-8" }));
        a.download = ((document.title || location.hostname).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim().slice(0, 120) || "page") + ".md";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    };

    const result = () => { imgs = $("input").checked; return toMarkdown(sorted()); };
    bCopy.onclick = async () => { await copyText(result()); exit(T.copied); };
    bSave.onclick = () => { saveText(result()); exit(T.saved); };
    bCancel.onclick = () => exit();

    /* an export leaves the panel with a short message and the selection cleared;
       a cancel (button or the bookmarklet again) gives the selection back */
    function exit(msg) {
        cancelAnimationFrame(raf);
        ac.abort();
        cursor.remove();
        delete window.__mdpick;
        if (msg) {
            svg.remove();
            bar.textContent = msg;
            setTimeout(() => host.remove(), 1500);
            return;
        }
        host.remove();
        if (saved) try { sel.setBaseAndExtent(...saved); } catch (e) { console.warn("mdpick: selection not restored", e); }
    }
    window.__mdpick = () => exit();

    update();
    draw();
})();
