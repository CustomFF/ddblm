// @label: Blocks to Markdown
// @desc: Выбор блоков страницы мышью (как в uBlock Origin) и копирование или сохранение их в Markdown
// @desc-en: Pick page blocks with the mouse (like uBlock Origin's picker) and copy or save them as Markdown
// @icon: markdown.svg

(function() {
    if (window.__mdpick) { window.__mdpick(); return; }

    const ru = /^ru\b/i.test(navigator.language);
    const T = ru
        ? { copy: "Копировать", save: "Сохранить", cancel: "Отмена", imgs: "С картинками", n: "Выбрано: ", copied: "Скопировано", saved: "Сохранено", hint: "Клик: выбрать · Alt+колесо или ↑↓: уровень · Esc: выход" }
        : { copy: "Copy", save: "Save", cancel: "Cancel", imgs: "With images", n: "Selected: ", copied: "Copied", saved: "Saved", hint: "Click: pick · Alt+wheel or ↑↓: level · Esc: exit" };

    /* ---------- HTML → Markdown ---------- */

    const SP = "\uE000", TAB = "\uE001", EMPTY = "\uE002";
    const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|CANVAS|IFRAME|OBJECT|BUTTON|INPUT|SELECT|TEXTAREA|LINK|META)$/;
    const isListLine = /^\uE000*(?:[-*+]|\d+[.)]) /;

    const clean = s => s.replace(/ {2,}/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n")
        .replace(/(?:\\\n){2,}/g, "\n\n").replace(/\\\n(?=\n|$)/g, "\n").replace(/(^|\n)\\\n/g, "$1").replace(/\n{3,}/g, "\n\n").trim().replace(/\\$/, "");
    const block = s => { s = clean(s); return s ? "\n\n" + s + "\n\n" : ""; };
    const indent = (s, first, rest) => s.split("\n").map((l, i) => l ? (i ? rest : first) + l : (i ? "" : first.trimEnd())).join("\n");
    const pad = n => SP.repeat(n);
    const fence = (s, ch) => { let f = ch; while (s.includes(f)) f += ch[0]; return f; };
    const escText = s => s.replace(/[\\`*[\]<]/g, "\\$&").replace(/(^|[^\w])_|_(?=[^\w]|$)/g, (m, p) => p === undefined ? "\\_" : p + "\\_");
    const escStart = s => s.replace(/^(#{1,6} |[-+*] |\d+[.)] |>|=+$|-{3,}$)/, "\\$1");
    const wrap = (s, m) => {
        const x = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
        return x[2] ? x[1] + m + x[2] + m + x[3] : s;
    };
    const codeLang = el => {
        for (const e of [el, el.querySelector("code"), el.parentElement, el.getRootNode().host]) {
            if (!e || !e.getAttribute) continue;
            const m = (e.getAttribute("class") || "").match(/(?:^|\s)(?:lang(?:uage)?-|highlight-source-|brush:\s*)([\w+#-]+)/);
            if (m) return m[1];
            const d = e.getAttribute("data-lang") || e.getAttribute("data-language");
            if (d) return d;
        }
        return "";
    };
    const codeBlock = el => {
        const text = el.innerText.replace(/\n$/, "");
        const f = fence(text, "```");
        const body = text.replace(/ /g, SP).replace(/\t/g, TAB).split("\n").map(l => l || EMPTY).join("\n");
        return "\n\n" + f + codeLang(el) + "\n" + body + "\n" + f + "\n\n";
    };
    const visible = el => el.getAttribute("aria-hidden") !== "true" && (!el.checkVisibility || el.checkVisibility() || getComputedStyle(el).display === "contents");
    const url = u => u && !/^javascript:/i.test(u) ? u.replace(/[()\s]/g, encodeURIComponent) : "";

    const kids = (el, ctx) => {
        const sr = el.shadowRoot && !el.querySelector(":scope > *") ? el.shadowRoot : el;
        return [...sr.childNodes].map(n => md(n, ctx)).join("");
    };

    const listItem = (li, ctx, marker) => {
        let s = clean(kids(li, ctx)).replace(/\n\n(?=\uE000*(?:[-*+]|\d+[.)]) )/g, "\n");
        const box = li.querySelector(":scope > input[type=checkbox], :scope > p > input[type=checkbox]");
        if (box) marker += box.checked ? "[x] " : "[ ] ";
        return indent(s || "", marker, pad(marker.length));
    };
    const markerFor = (li, i) => {
        const list = li.parentElement;
        if (!list || list.tagName !== "OL") return "- ";
        const start = parseInt(list.getAttribute("start") || "1", 10);
        const v = li.getAttribute("value");
        return (v ? parseInt(v, 10) : start + i) + ". ";
    };
    const list = (el, ctx) => {
        const items = [...el.children].filter(c => c.tagName === "LI" && visible(c));
        const s = items.map((li, i) => listItem(li, ctx, markerFor(li, i))).join("\n");
        return s ? "\n\n" + s + "\n\n" : "";
    };

    const cell = (c, ctx) => clean(kids(c, ctx)).replace(/\n+/g, "<br>").replace(/\|/g, "\\|") || " ";
    const table = (rows, ctx) => {
        rows = rows.filter(r => visible(r));
        if (!rows.length) return "";
        const grid = rows.map(r => {
            const out = [];
            for (const c of r.cells) {
                out.push(cell(c, ctx));
                for (let k = 1; k < (c.colSpan || 1); k++) out.push(" ");
            }
            return out;
        });
        const w = Math.max(...grid.map(r => r.length));
        const line = r => "| " + Array.from({ length: w }, (_, i) => r[i] || " ").join(" | ") + " |";
        return "\n\n" + [line(grid[0]), "|" + " --- |".repeat(w), ...grid.slice(1).map(line)].join("\n") + "\n\n";
    };

    function md(n, ctx) {
        if (n.nodeType === 3) {
            if (ctx.pre) return n.nodeValue;
            return escText(n.nodeValue.replace(/[ \t\n\r\f\u00A0]+/g, " "));
        }
        if (n.nodeType !== 1 || n === host) return "";
        const el = n, tag = el.tagName.toUpperCase();
        if (SKIP.test(tag) || !visible(el)) return "";
        switch (tag) {
            case "H1": case "H2": case "H3": case "H4": case "H5": case "H6": {
                const s = clean(kids(el, ctx)).replace(/\n+/g, " ");
                return s ? "\n\n" + "#".repeat(+tag[1]) + " " + s + "\n\n" : "";
            }
            case "BR": return "\\\n";
            case "HR": return "\n\n---\n\n";
            case "PRE": return codeBlock(el);
            case "CODE": {
                const t = el.textContent;
                if (!t) return "";
                const f = fence(t, "`");
                return f + (/^`|`$/.test(t) ? " " + t + " " : t) + f;
            }
            case "STRONG": case "B": return wrap(kids(el, ctx), "**");
            case "EM": case "I": case "CITE": case "DFN": return wrap(kids(el, ctx), "*");
            case "S": case "DEL": case "STRIKE": return wrap(kids(el, ctx), "~~");
            case "MARK": return wrap(kids(el, ctx), "==");
            case "A": {
                const s = kids(el, ctx), h = url(el.href);
                if (!h || !s.trim() || /\n/.test(s.trim()) || h === location.href + "#") return s;
                const t = el.title ? ' "' + el.title.replace(/"/g, '\\"') + '"' : "";
                return wrap("[" + s.trim() + "](" + h + t + ")", "");
            }
            case "IMG": {
                if (!ctx.imgs) return "";
                const src = url(el.currentSrc || el.src);
                if (!src || /^data:/.test(src) && src.length > 2000) return el.alt ? escText(el.alt) : "";
                return "![" + escText(el.alt || "").replace(/\n/g, " ") + "](" + src + ")";
            }
            case "UL": case "OL": case "MENU": return list(el, ctx);
            case "LI": return block(listItem(el, ctx, markerFor(el, [...el.parentElement.children].filter(c => c.tagName === "LI").indexOf(el))));
            case "BLOCKQUOTE": {
                const s = clean(kids(el, ctx));
                return s ? "\n\n" + s.split("\n").map(l => l ? "> " + l : ">").join("\n") + "\n\n" : "";
            }
            case "TABLE": return table([...el.rows], ctx);
            case "DT": return block("**" + clean(kids(el, ctx)) + "**");
            case "DD": return block(": " + clean(kids(el, ctx)));
            case "SUP": return "^" + kids(el, ctx) + "^";
            case "SUB": return "~" + kids(el, ctx) + "~";
            case "KBD": return "<kbd>" + kids(el, ctx) + "</kbd>";
        }
        const disp = getComputedStyle(el).display;
        if (/^inline/.test(disp) || disp === "contents") return kids(el, ctx);
        const s = clean(kids(el, ctx));
        return s ? "\n\n" + (tag === "P" ? escStart(s) : s) + "\n\n" : "";
    }

    const finish = s => s
        .replace(/\n{3,}/g, "\n\n").trim()
        .replace(/\uE002/g, "").replace(/\uE000/g, " ").replace(/\uE001/g, "\t") + "\n";

    const toMarkdown = (els, ctx) => {
        let out = "", prev = null;
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            let s;
            if (el.tagName === "TR") {
                const t = el.closest("table"), rows = [el];
                while (els[i + 1] && els[i + 1].tagName === "TR" && els[i + 1].closest("table") === t) rows.push(els[++i]);
                const head = t.tHead ? t.tHead.rows[0] : t.rows[0];
                s = clean(table(rows[0] === head ? rows : [head, ...rows], ctx));
            } else s = clean(md(el, ctx));
            if (!s) continue;
            const sameList = prev && el.tagName === "LI" && prev.tagName === "LI" && prev.parentElement === el.parentElement;
            out += (out ? (sameList ? "\n" : "\n\n") : "") + s;
            prev = el;
        }
        return finish(out);
    };

    /* ---------- block picking ---------- */

    const blockOf = el => {
        if (el && el.nodeType !== 1) el = el.parentElement;
        const pre = el && el.closest("pre");
        if (pre) el = pre;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.tagName === "IMG") return el;
            const d = getComputedStyle(el).display;
            if (!/^inline/.test(d) && d !== "contents") return el;
            el = el.parentElement;
        }
        return null;
    };
    const sameRect = (a, b) => {
        const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
        return Math.abs(r.left - q.left) < 1 && Math.abs(r.top - q.top) < 1 && Math.abs(r.width - q.width) < 1 && Math.abs(r.height - q.height) < 1;
    };
    const parentOf = el => {
        let p = el.parentElement;
        while (p && p !== document.body && sameRect(p, el)) p = p.parentElement;
        return p && p !== document.body && p !== document.documentElement ? p : null;
    };

    let picked = [];
    const add = el => {
        if (!el || picked.some(p => p === el || p.contains(el))) return;
        picked = picked.filter(p => !el.contains(p));
        picked.push(el);
    };
    const toggle = el => {
        const owner = picked.find(p => p === el || p.contains(el));
        if (owner) picked = picked.filter(p => p !== owner);
        else add(el);
        update();
    };
    const sorted = () => picked.filter(p => p.isConnected).sort((a, b) => a.compareDocumentPosition(b) & 4 ? -1 : 1);

    /* text nodes (and images / shadow hosts) the range really selects: visible, selectable, not blank */
    const items = (r, withObjects) => {
        const out = [], root = r.commonAncestorContainer;
        const part = n => n.nodeValue.slice(n === r.startContainer ? r.startOffset : 0, n === r.endContainer ? r.endOffset : undefined);
        const take = n => {
            const el = n.nodeType === 3 ? n.parentElement : n;
            if (!el || !visible(el) || getComputedStyle(el).userSelect === "none") return;
            if (n.nodeType === 3 ? part(n).trim() : withObjects && (n.tagName === "IMG" || n.shadowRoot)) out.push(n);
        };
        if (root.nodeType === 3) { take(root); return out; }
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        for (let n = w.currentNode; n; n = w.nextNode()) if (r.intersectsNode(n)) take(n);
        return out;
    };
    /* el counts as covered when nothing selectable is left outside the range */
    const covers = (r, el) => {
        const q = document.createRange();
        q.selectNodeContents(el);
        if (r.compareBoundaryPoints(Range.START_TO_START, q) > 0) {
            const a = q.cloneRange();
            a.setEnd(r.startContainer, r.startOffset);
            if (items(a).length) return false;
        }
        if (r.compareBoundaryPoints(Range.END_TO_END, q) < 0) {
            const b = q.cloneRange();
            b.setStart(r.endContainer, r.endOffset);
            if (items(b).length) return false;
        }
        return true;
    };
    const hasBlocks = el => [...el.children].some(c => blockOf(c) === c);
    const fromRange = (r, n) => {
        let b = blockOf(n);
        if (b && n.nodeType === 3 && !covers(r, b) && hasBlocks(b)) return null;
        if (b && /^T[DH]$/.test(b.tagName)) b = b.parentElement;
        for (let p = b && parentOf(b); p && covers(r, p); p = parentOf(p)) b = p;
        return b;
    };
    /* getRangeAt() breaks when an edge is inside a shadow root (e.g. GitHub's <relative-time>);
       getComposedRanges() lifts such edges to the host */
    const sel = getSelection();
    /* exact copy of the selection (edges inside shadow roots too) to put back on cancel */
    const saved = (() => {
        if (!sel.rangeCount) return null;
        const back = sel.direction === "backward";
        let c = sel.getRangeAt(0);
        if (sel.getComposedRanges) {
            const shadowRoots = [...document.querySelectorAll("*")].map(e => e.shadowRoot).filter(Boolean);
            try { c = sel.getComposedRanges({ shadowRoots })[0] || c; } catch (e) {}
        }
        const a = [c.startContainer, c.startOffset], b = [c.endContainer, c.endOffset];
        return back ? [...b, ...a] : [...a, ...b];
    })();
    const ranges = sel.getComposedRanges
        ? sel.getComposedRanges().map(c => { const r = document.createRange(); r.setStart(c.startContainer, c.startOffset); r.setEnd(c.endContainer, c.endOffset); return r; })
        : Array.from({ length: sel.rangeCount }, (_, i) => sel.getRangeAt(i));
    for (const r of ranges) {
        if (r.collapsed) continue;
        const its = items(r, true);
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
        .ov{position:fixed;inset:0;pointer-events:auto;cursor:crosshair;}
        svg{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;}
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
    <svg><path class="mask" fill="rgba(0,0,0,.4)" fill-rule="evenodd"/><g class="sel"></g><rect class="hov" fill="rgba(26,115,232,.12)" stroke="#fbbc04" stroke-width="2" stroke-dasharray="6 3"/></svg>
    <div class="ov"></div>
    <div class="bar">
        <div class="n"></div>
        <label><input type="checkbox" class="imgs" checked><span></span></label>
        <div class="row"><button class="p copy"></button><button class="save"></button><button class="cancel"></button></div>
        <div class="h"></div>
    </div>`;
    const $ = s => root.querySelector(s);
    const ov = $(".ov"), mask = $(".mask"), selG = $(".sel"), hov = $(".hov");
    const bCopy = $(".copy"), bSave = $(".save"), bCancel = $(".cancel"), count = $(".n");
    bCopy.textContent = T.copy; bSave.textContent = T.save; bCancel.textContent = T.cancel; $(".h").textContent = T.hint; $("label span").textContent = T.imgs;
    document.documentElement.appendChild(host);

    let base = null, cur = null, stack = [], mx = -1, my = -1, raf = 0;

    const under = (x, y) => document.elementsFromPoint(x, y).find(e => e !== host && e !== document.documentElement && e !== document.body);
    const hover = () => {
        if (mx < 0) return;
        const b = blockOf(under(mx, my));
        if (b !== base) { base = b; cur = b; stack = []; }
    };

    const rectPath = r => `M${r.left},${r.top}h${r.width}v${r.height}h${-r.width}z`;
    const draw = () => {
        raf = requestAnimationFrame(draw);
        const W = innerWidth, H = innerHeight;
        let d = `M0,0H${W}V${H}H0z`, g = "";
        for (const p of picked) {
            if (!p.isConnected) continue;
            const r = p.getBoundingClientRect();
            if (r.bottom < 0 || r.top > H) continue;
            d += rectPath(r);
            g += `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" fill="rgba(26,115,232,.18)" stroke="#1a73e8" stroke-width="2"/>`;
        }
        if (cur && !picked.includes(cur)) {
            const r = cur.getBoundingClientRect();
            if (!picked.some(p => p.contains(cur))) d += rectPath(r);
            hov.setAttribute("x", r.left); hov.setAttribute("y", r.top);
            hov.setAttribute("width", r.width); hov.setAttribute("height", r.height);
            hov.style.display = "";
        } else hov.style.display = "none";
        mask.setAttribute("d", d);
        if (selG.innerHTML !== g) selG.innerHTML = g;
    };

    const update = () => {
        const n = sorted().length;
        count.textContent = T.n + n;
        bCopy.disabled = bSave.disabled = !n;
    };

    const level = up => {
        if (!cur) return;
        if (up) { const p = parentOf(cur); if (p) { stack.push(cur); cur = p; } }
        else if (stack.length) cur = stack.pop();
    };

    const scrollable = el => {
        for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            const s = getComputedStyle(el);
            if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) return el;
        }
        return null;
    };

    const kill = e => { e.preventDefault(); e.stopPropagation(); };
    ov.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; hover(); });
    ov.addEventListener("mouseleave", () => { mx = -1; base = cur = null; });
    ["mousedown", "mouseup", "dblclick", "contextmenu", "auxclick"].forEach(t => ov.addEventListener(t, kill));
    ov.addEventListener("click", e => { kill(e); if (cur) toggle(cur); });
    ov.addEventListener("wheel", e => {
        if (e.altKey) { kill(e); level(e.deltaY < 0); return; }
        const s = scrollable(under(e.clientX, e.clientY));
        if (!s) return;
        kill(e);
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? s.clientHeight : 1;
        s.scrollBy(e.deltaX * k, e.deltaY * k);
    }, { passive: false });
    const onScroll = () => hover();
    const onKey = e => {
        if (e.key === "Escape") { kill(e); exit(); }
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") { kill(e); level(e.key === "ArrowUp"); }
    };
    addEventListener("scroll", onScroll, true);
    addEventListener("keydown", onKey, true);

    const toast = text => {
        const t = document.createElement("div");
        t.textContent = text;
        t.style.cssText = "all:initial;position:fixed;top:12px;right:12px;z-index:2147483647;background:#202124;color:#e8eaed;font:13px system-ui,sans-serif;padding:8px 14px;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.45);transition:opacity .3s;";
        document.documentElement.appendChild(t);
        setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 1500);
    };

    const copyText = async s => {
        try { await navigator.clipboard.writeText(s); return; } catch (e) {}
        const ta = document.createElement("textarea");
        ta.value = s;
        ta.style.cssText = "position:fixed;left:-9999px;";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    };

    const saveText = s => {
        const name = (document.title || location.hostname).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim().slice(0, 120) || "page";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([s], { type: "text/markdown;charset=utf-8" }));
        a.download = name + ".md";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    };

    const result = () => toMarkdown(sorted(), { imgs: $(".imgs").checked });
    bCopy.onclick = async () => { await copyText(result()); exit(true); toast(T.copied); };
    bSave.onclick = () => { saveText(result()); exit(true); toast(T.saved); };
    bCancel.onclick = () => exit();

    /* cancel (button, Esc, bookmarklet again) gives the selection back; an export leaves it cleared */
    function exit(done) {
        if (!done && saved) try { sel.setBaseAndExtent(...saved); } catch (e) {}
        cancelAnimationFrame(raf);
        removeEventListener("scroll", onScroll, true);
        removeEventListener("keydown", onKey, true);
        host.remove();
        delete window.__mdpick;
    }
    window.__mdpick = exit;

    update();
    draw();
})();
