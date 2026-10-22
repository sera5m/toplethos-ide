"""Parse //<<<node>>> / //<<<end>>> / //<<<link>>> markers."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

NODE_RE = re.compile(r"^//<<<node\s+(.*)>>> *$" if False else r"^//<<<node\s+(.*)>>> *$")
