"""Dev-only endpoints for tooling (path editor, etc.)."""

import json
from pathlib import Path

from fastapi import APIRouter, Body

router = APIRouter()

WALK_PATHS_FILE = Path(__file__).resolve().parents[3] / "frontend" / "public" / "walk-paths.json"


@router.get("/walk-paths")
async def get_walk_paths():
    if not WALK_PATHS_FILE.exists():
        return {}
    return json.loads(WALK_PATHS_FILE.read_text(encoding="utf-8"))


@router.post("/walk-paths")
async def save_walk_paths(data: dict = Body(...)):
    WALK_PATHS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return {"ok": True, "path": str(WALK_PATHS_FILE)}
