#!/usr/bin/env python3
"""Sync an organizer KDS kit into an isolated scaffold; generate React reference screens."""
import argparse
import hashlib
import json
import re
import shutil
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
NAMES = {"class": "className", "for": "htmlFor", "readonly": "readOnly", "tabindex": "tabIndex", "maxlength": "maxLength", "colspan": "colSpan", "rowspan": "rowSpan", "checked": "defaultChecked", "selected": "defaultSelected", "value": "defaultValue", "viewbox": "viewBox", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin"}


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {"tag": "document", "attrs": {}, "children": []}
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "children": []}
        self.stack[-1]["children"].append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]["tag"] == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        self.stack[-1]["children"].append(data)


def walk(node, tag):
    if isinstance(node, str):
        return []
    return ([node] if node["tag"] == tag else []) + [x for c in node["children"] for x in walk(c, tag)]


def make_screen(source, key, source_root):
    parser = Document()
    parser.feed(source)
    doc = walk(parser.root, "html")[0]
    body = walk(doc, "body")[0]
    styles = ["".join(x["children"]) for x in walk(doc, "style")]
    rules = []
    control_counter = [0]
    def jsx(node):
        if isinstance(node, str):
            return "{" + json.dumps(node, ensure_ascii=False) + "}"
        tag = node["tag"]
        if tag in {"script", "style", "head"}:
            return ""
        attrs = dict(node["attrs"])
        classes = attrs.get("class", "").split()
        if tag == "a":
            if attrs.get("href") == "#":
                attrs["href"] = "/design-system/kds/" + key
            elif attrs.get("href", "").endswith(".html"):
                attrs["href"] = "/design-system/kds/" + key.split("/")[0] + "/" + Path(attrs["href"]).stem
        if tag == "label" and "kds-field" in classes:
            inputs = walk(node, "input")
            if inputs:
                control_counter[0] += 1
                ident = "reference-field-" + str(control_counter[0])
                attrs["for"] = ident
                inputs[0]["attrs"]["id"] = ident
        if tag == "div" and attrs.get("role") == "group":
            tag = "fieldset"
            attrs.pop("role")
            attrs["style"] = "border: 0; margin-inline: 0; padding: 0; min-width: 0; " + attrs.get("style", "")
        if tag == "div" and "aria-label" in attrs and "role" not in attrs:
            attrs["role"] = "img"
        if "text-link" in classes:
            classes = ["kds-reference-link" if c == "text-link" else c for c in classes]
            attrs["class"] = " ".join(classes)
        if tag == "form" and attrs.get("role") == "search":
            attrs.pop("role")
        # Reference pages exercise the same local React primitives used by generated features.
        if tag == "span" and "kds-icon" in classes:
            icon = next((c[3:] for c in classes if c.startswith("ic-")), None)
            if icon and "style" not in attrs and all(c == "kds-icon" or c in {"kds-icon--16", "kds-icon--20", "ic-" + icon} for c in classes):
                size = ' size={16}' if "kds-icon--16" in classes else ' size={20}' if "kds-icon--20" in classes else ""
                extra = [c for c in classes if c not in {"kds-icon", "kds-icon--16", "kds-icon--20", "ic-" + icon}]
                return '<Icon name=' + json.dumps(icon) + size + (' className=' + json.dumps(" ".join(extra)) if extra else "") + ' />'
        if tag == "span" and "kds-datepicker" in classes:
            inputs = walk(node, "input")
            if inputs:
                a = inputs[0]["attrs"]
                label = a.get("aria-label", a.get("placeholder", "날짜 선택"))
                return '<DatePicker bare name=' + json.dumps("reference-" + ("start" if "시작" in label else "end")) + ' label=' + json.dumps(label, ensure_ascii=False) + ' placeholder=' + json.dumps(a.get("placeholder", "날짜 선택"), ensure_ascii=False) + ' />'
        if "style" in attrs:
            cls = "kds-reference-style-" + str(len(rules))
            rules.append(f'[data-kds-screen="{key}"] .{cls} {{ {attrs.pop("style")} }}')
            attrs["class"] = " ".join(classes + [cls])
        if tag == "button" and "kds-button" in classes and all(c == "kds-button" or c.startswith("kds-button--") for c in classes):
            tag = "Button"
            variant = next((x[12:] for x in classes if x in {"kds-button--primary", "kds-button--secondary", "kds-button--tertiary", "kds-button--accent"}), "primary")
            size = next((x[12:] for x in classes if x in {"kds-button--xsmall", "kds-button--small", "kds-button--medium", "kds-button--large"}), None)
            attrs["variant"] = variant
            if size:
                attrs["size"] = size
            if "kds-button--full" in classes:
                attrs["full"] = None
            attrs["class"] = " ".join(x for x in attrs.get("class", "").split() if x != "kds-button" and not x.startswith("kds-button--"))
        elif tag == "input" and "kds-field__input" in classes:
            tag = "Input"
            attrs["class"] = " ".join(c for c in classes if c != "kds-field__input")
        elif tag == "textarea" and "kds-field__input" in classes:
            tag = "Textarea"
        elif tag == "img":
            tag = "Image"
            image_path = attrs.get("src", "")
            if image_path.startswith("../") and image_path.endswith(".svg"):
                svg = ET.parse(source_root / image_path[3:]).getroot()
                viewbox = svg.attrib.get("viewBox", "0 0 24 24").split()
                attrs.setdefault("width", str(int(float(svg.attrib.get("width", viewbox[2]).removesuffix("px")))))
                attrs.setdefault("height", str(int(float(svg.attrib.get("height", viewbox[3]).removesuffix("px")))))
            attrs["unoptimized"] = None
        out = []
        for name, value in attrs.items():
            if name.startswith("on"):
                continue
            prop = NAMES.get(name, name)
            if name in {"src", "href"} and value and value.startswith("../"):
                value = "/kds/" + value[3:]
            if value is None:
                out.append(prop if not prop.startswith(("aria-", "data-")) else prop + '="true"')
            else:
                if prop in {"aria-valuenow", "aria-valuemin", "aria-valuemax", "width", "height", "colSpan", "rowSpan", "tabIndex", "maxLength"} and value.isdigit():
                    out.append(prop + "={" + value + "}")
                else:
                    out.append(prop + "=" + json.dumps(value, ensure_ascii=False))
        if tag in {"Button", "button"} and "type" not in attrs:
            out.append('type="button"')
        if tag == "Image" and "alt" not in attrs:
            out.append('alt=""')
        opening = "<" + tag + (" " + " ".join(out) if out else "")
        if node["tag"] in VOID:
            return opening + " />"
        result = opening + ">" + "".join(jsx(c) for c in node["children"]) + "</" + tag + ">"
        return "<search>" + result + "</search>" if node["tag"] == "form" and node["attrs"].get("role") == "search" else result
    children = [c for c in body["children"] if not isinstance(c, str) or c.strip()]
    content = "".join(jsx(c) for c in children)
    if len(children) > 1:
        content = "<>" + content + "</>"
    css = "\n".join(styles + rules)
    # One screen is rendered per route; source-specific CSS follows the source KDS CSS.
    return content, css, doc["attrs"]


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--source", type=Path, required=True)
    args.add_argument("--destination", type=Path, required=True)
    config = args.parse_args()
    source, dest = config.source.resolve(), config.destination.resolve()
    if not (source / "tokens/kds-tokens.css").is_file() or not (dest / "package.json").is_file():
        args.error("source must be a KDS kit; destination must be an isolated moai-kit scaffold")
    public = dest / "public/kds"
    manifest = {}
    for folder in ["tokens", "icons", "images", "scripts", "templates", "examples"]:
        for path in sorted((source / folder).rglob("*")):
            if path.is_file():
                rel = path.relative_to(source)
                target = public / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(path, target)
                manifest[rel.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (source / "docs").rglob("*.md"):
        target = dest / "docs/design-system/reference" / path.relative_to(source / "docs")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    for path in (source / "fonts/web").glob("Pretendard-*.woff2"):
        target = public / "fonts/web" / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        manifest["fonts/web/" + path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    shutil.copyfile(source / "fonts/install-for-figma/Pretendard-LICENSE.txt", public / "fonts/Pretendard-LICENSE.txt")
    shutil.copyfile(source / "fonts/README.txt", public / "fonts/README.txt")
    # Organizer license: brand fonts stay local, outside the redistributable archive.
    base = public / "tokens/kds-base.css"
    css = base.read_text(encoding="utf-8")
    css = re.sub(r', url\(../fonts/web/KTFLOW-[^)]+\) format\("woff2"\)', "", css)
    base.write_text(css, encoding="utf-8", newline="\n")
    if not (public / "fonts/kt-flow.css").is_file():
        (public / "fonts/kt-flow.css").write_text('/* Optional participant-only font override. Installed locally by moai-kit kds-fonts. */\n', encoding="utf-8")
    (public / "source-manifest.json").write_text(json.dumps({"version": "20261012", "files": manifest, "adaptations": {"tokens/kds-base.css": "KT Flow local() only; optional private kt-flow.css"}}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    icon_script = public / "scripts/build-icon-classes.py"
    text = icon_script.read_text(encoding="utf-8").replace("css.read_text()", 'css.read_text(encoding="utf-8")')
    text = text.replace('css.write_text(s.rstrip("\\n") + "\\n\\n" + "\\n".join(block) + "\\n")', 'css.write_text(s.rstrip("\\n") + "\\n\\n" + "\\n".join(block) + "\\n", encoding="utf-8", newline="\\n")')
    icon_script.write_text(text, encoding="utf-8", newline="\n")
    sync_script = public / "scripts/sync-instructions.sh"
    text = sync_script.read_text(encoding="utf-8").replace("set -e", 'set -e\n# Reference-only copy: moai-kit owns project workflow and connector rules.\nprintf "%s\\n" "moai-kit: update project AGENTS.md through the skill; never overwrite it with KDS-only rules."\nexit 1', 1)
    sync_script.write_text(text, encoding="utf-8", newline="\n")
    ui = dest / "src/components/design-system/KdsScreens.tsx"
    parts = ['// Generated from organizer KDS HTML by scripts/migrate-kds.py. React UI primitives remain shared.', 'import { Button, Icon, Input, DatePicker } from "@/components/ui";', 'import Image from "next/image";']
    screens = []
    for folder in ["templates", "examples"]:
        for path in sorted((source / folder).glob("*.html")):
            key = folder + "/" + path.stem
            fn = "Screen" + str(len(screens))
            content, styles, attrs = make_screen(path.read_text(encoding="utf-8"), key, source)
            stylesheet = public / "screens" / (fn + ".css")
            stylesheet.parent.mkdir(parents=True, exist_ok=True)
            stylesheet.write_text(styles, encoding="utf-8", newline="\n")
            parts.append('function ' + fn + '() { return ' + content + '; }')
            screens.append((key, fn, attrs.get("data-mode", "light"), attrs.get("data-platform", "mobile")))
    parts.append('export const KDS_SCREENS = {\n' + ',\n'.join(json.dumps(key) + ': { component: ' + fn + ', stylesheet: "/kds/screens/' + fn + '.css", mode: ' + json.dumps(mode) + ', platform: ' + json.dumps(platform) + ' }' for key, fn, mode, platform in screens) + '\n} as const;\n')
    ui.parent.mkdir(parents=True, exist_ok=True)
    ui.write_text("\n".join(parts), encoding="utf-8", newline="\n")
    # The design linter resolves custom CSS through the imported CSS graph. Scope every
    # source layout rule to its screen so it cannot change generated feature screens.
    def scope_css(styles, key):
        styles = re.sub(r'/\*.*?\*/', '', styles, flags=re.S)
        return re.sub(r'(?m)([^{}]+)\{', lambda m: m.group(0) if m.group(1).lstrip().startswith('@') else ', '.join(selector.strip() if selector.strip().startswith('[data-kds-screen=') else f'[data-kds-screen="{key}"] ' + selector.strip() for selector in m.group(1).strip().split(',')) + ' {', styles)
    scoped = []
    example_styles = (source / "examples/examples.css").read_text(encoding="utf-8").replace(".text-link", ".kds-reference-link")
    for key, fn, _, _ in screens:
        text = (public / "screens" / (fn + ".css")).read_text(encoding="utf-8")
        scoped.append(scope_css((example_styles if key.startswith("examples/") else "") + "\n" + text, key))
    (dest / "src/app/kds-reference.css").write_text("\n".join(scoped), encoding="utf-8", newline="\n")
    print(f"KDS 20261012 synced: {len(manifest)} assets, {len(screens)} React reference screens -> {dest}")


if __name__ == "__main__":
    main()
