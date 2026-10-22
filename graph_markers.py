"""Parse //<<<node>>> / //<<<end>>> / //<<<link>>> markers."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

NODE_RE = re.compile(r"^//<<<node\s+(.*)>>> *$")
END_RE = re.compile(r"^//<<<end\s+id=(\d+)>>> *$")
LINK_RE = re.compile(
    r"^//<<<link\s+from=(\d+)\.(in|out)(\d+)\s+to=(\d+)\.(in|out)(\d+)>>> *$"
)
FIELD_RE = re.compile(r'(\w+)=(?:"([^"]*)"|(\S+))')
FN_RE = re.compile(r"\bfn\s+\w+\s+in\s+\[([^\]]*)\]\s+out\s+\[([^\]]*)\]")


def _split_ports(body: str) -> list[str]:
    return [p.strip() for p in body.split(",") if p.strip()]


@dataclass
class Node:
    id: int
    name: str
    pos: tuple[int, int] | None
    start: int  # 1-based line of the node marker
    end: int    # 1-based line of the end marker
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    x: float = 0
    y: float = 0


@dataclass
class Link:
    src: int
    src_side: str
    src_idx: int
    dst: int
    dst_side: str
    dst_idx: int


def parse(text: str) -> tuple[list[Node], list[Link]]:
    lines = text.splitlines()
    nodes: list[Node] = []
    links: list[Link] = []
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        nm = NODE_RE.match(stripped)
        if nm:
            fields = {m.group(1): m.group(2) if m.group(2) is not None else m.group(3)
                      for m in FIELD_RE.finditer(nm.group(1))}
            try:
                nid = int(fields.get("id", "0"))
            except ValueError:
                nid = 0
            name = fields.get("name") or ("node%d" % nid)
            pos = None
            if "pos" in fields and "," in fields["pos"]:
                xs, ys = fields["pos"].split(",", 1)
                try:
                    pos = (int(float(xs)), int(float(ys)))
                except ValueError:
                    pos = None
            start = i + 1
            end = start
            body_lines = []
            j = i + 1
            while j < len(lines):
                em = END_RE.match(lines[j].strip())
                if em and int(em.group(1)) == nid:
                    end = j + 1
                    break
                body_lines.append(lines[j])
                j += 1
            body = "\n".join(body_lines)
            fm = FN_RE.search(body)
            inputs = _split_ports(fm.group(1)) if fm else ["in"]
            outputs = _split_ports(fm.group(2)) if fm else ["out"]
            if not inputs:
                inputs = ["in"]
            if not outputs:
                outputs = ["out"]
            nodes.append(Node(nid, name, pos, start, end, inputs, outputs))
            i = j + 1
            continue
        lm = LINK_RE.match(stripped)
        if lm:
            links.append(Link(
                int(lm.group(1)), lm.group(2), int(lm.group(3)),
                int(lm.group(4)), lm.group(5), int(lm.group(6)),
            ))
        i += 1
    return nodes, links
