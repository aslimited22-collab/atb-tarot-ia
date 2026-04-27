#!/usr/bin/env python3
"""Gera imagens via OpenAI gpt-image-1 e salva em public/img/."""
import os, json, base64, sys
from concurrent.futures import ThreadPoolExecutor
import urllib.request

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = None
for line in open(os.path.join(PROJECT, ".env.local"), encoding="utf-8"):
    if line.startswith("OPENAI_API_KEY="):
        KEY = line.split("=", 1)[1].strip()
        break

OUT_DIR = os.path.join(PROJECT, "public", "img")
os.makedirs(OUT_DIR, exist_ok=True)

IMAGES = [
    {
        "name": "landing-hero",
        "size": "1536x1024",
        "prompt": "Mature graceful Brazilian woman in her 60s with kind warm smile, eyes closed peacefully, soft hands together in prayer position, gentle warm golden light from above, soft purple and gold mystical atmosphere, white roses around her, blurred background of sacred Catholic altar with candles, oil painting style, photorealistic intimate portrait, dignified and comforting, no text, sense of peace and spiritual relief, professional cinematic lighting",
    },
    {
        "name": "carta-limpeza",
        "size": "1024x1024",
        "prompt": "Vintage tarot card design, ornate gold borders with intricate filigree, deep purple velvet background, white pillar candle with golden flame in center, white roses, statue of Nossa Senhora Aparecida with blue mantle, divine light rays from above, baroque religious art style, mystical glowing atmosphere, no text, vertical card composition, photorealistic",
    },
    {
        "name": "carta-caminhos",
        "size": "1024x1024",
        "prompt": "Vintage tarot card design, ornate gold borders, deep purple background, large golden ornate key floating in the air, glowing wooden door slightly open with bright divine golden light pouring out, vines of green leaves and white flowers around, mystical atmosphere, baroque oil painting style, no text, vertical composition, photorealistic, sense of opening pathways",
    },
    {
        "name": "carta-protecao",
        "size": "1024x1024",
        "prompt": "Vintage tarot card design, ornate gold borders, deep dark red and purple background, large golden silver shield in the center with a glowing sword crossed behind it, archangel feathered wings spread, divine fiery light, religious medieval baroque oil painting style, mystical protection atmosphere, no text, vertical composition, photorealistic, powerful sacred energy",
    },
    {
        "name": "santos-grid",
        "size": "1536x1024",
        "prompt": "Beautiful collage of 6 Catholic saints icons arranged in 2 rows of 3, traditional religious art style, each in ornate gold frame: Nossa Senhora Aparecida with blue mantle and crown, Sagrado Coracao de Jesus with flaming heart, Sao Miguel Arcanjo with sword and wings, Santo Antonio holding child Jesus, Sao Jorge with white horse and dragon, Nossa Senhora Desatadora dos Nos untying ribbon. Deep purple velvet background, golden divine light, baroque oil painting style, photorealistic, devotional and warm atmosphere, no text labels",
    },
]

def gen(img):
    name = img["name"]
    size = img["size"]
    prompt = img["prompt"]
    print(f"=> {name} ({size})...")
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "quality": "high",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read())
        b64 = data["data"][0]["b64_json"]
        out = os.path.join(OUT_DIR, f"{name}.png")
        with open(out, "wb") as f:
            f.write(base64.b64decode(b64))
        print(f"   OK {name}.png ({os.path.getsize(out)} bytes)")
        return name, True
    except Exception as e:
        print(f"   ERR {name}: {e}")
        return name, False

with ThreadPoolExecutor(max_workers=3) as ex:
    results = list(ex.map(gen, IMAGES))

ok = sum(1 for _, s in results if s)
print(f"\nDone: {ok}/{len(IMAGES)} images generated")
