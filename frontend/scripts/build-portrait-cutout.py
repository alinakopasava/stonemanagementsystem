"""Regenerate the catalog portrait cutout: person only, soft edge, no background.

Run once after replacing `portrait-sample.png`:
    python scripts/build-portrait-cutout.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter
from rembg import new_session, remove

PUBLIC = Path(__file__).resolve().parent.parent / "public" / "images"
SRC = PUBLIC / "portrait-sample.png"
DST = PUBLIC / "portrait-sample-cutout.png"

# Matte below this alpha is background; above it is the person. The ramp between
# them keeps hair and coat edges from turning into a hard sticker outline.
BG_CUTOFF = 12
FG_CUTOFF = 90

# The fade straddles the outline so the border of the photo melts instead of ending on
# a cut-out contour. An eroded copy is merged back in, which pins the middle of the
# subject at full opacity while the outer band dissolves in both directions.
FEATHER_RADIUS = 40
HALO_RADIUS = 14
CORE_EROSION_PASSES = 7
GAMMA = 1.2

# A plain gaussian ramp reads as airbrush. Perturbing it with fractal noise breaks the
# falloff into irregular wisps, and letting bright pixels drop out sooner than dark ones
# mimics an etching, where the stone keeps showing through the highlights first.
NOISE_OCTAVES = (13, 27, 55)
NOISE_WOBBLE = 0.16
HIGHLIGHT_DROPOUT = 0.14
RAMP_WIDTH = 0.5

# How far the subject's own colour is pushed into the surround. Without this the fade
# would dissolve whatever stood behind her, which reads as a milky patch on the stone.
BLEED_RADIUS = 70

SEED = 20240521


def solidify(alpha: Image.Image) -> Image.Image:
    lut = []
    for value in range(256):
        if value < BG_CUTOFF:
            lut.append(0)
        elif value > FG_CUTOFF:
            lut.append(255)
        else:
            t = (value - BG_CUTOFF) / (FG_CUTOFF - BG_CUTOFF)
            lut.append(round(t * t * (3 - 2 * t) * 255))
    return alpha.point(lut)


def blur(plane: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.clip(plane, 0, 255).astype(np.uint8), "L")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)


def bleed(rgb: np.ndarray, solid: np.ndarray) -> np.ndarray:
    """Extend the silhouette's colour outward, weighted by coverage, so the surround
    carries the subject's tone instead of the original background."""
    coverage = solid / 255
    spread_weight = np.maximum(blur(solid, BLEED_RADIUS), 2.0)
    out = np.empty_like(rgb)
    for channel in range(3):
        plane = rgb[..., channel]
        spread = blur(plane * coverage, BLEED_RADIUS) * 255 / spread_weight
        out[..., channel] = plane * coverage + spread * (1 - coverage)
    return out


def fractal_noise(width: int, height: int) -> np.ndarray:
    """Zero-mean, roughly unit-variance field summed from coarse to fine octaves."""
    rng = np.random.default_rng(SEED)
    field = np.zeros((height, width), dtype=np.float32)
    total = 0.0
    for index, radius in enumerate(NOISE_OCTAVES):
        amplitude = 0.5**index
        raw = rng.integers(0, 256, size=(height, width), dtype=np.uint8)
        octave = np.asarray(
            Image.fromarray(raw, "L").filter(ImageFilter.GaussianBlur(radius)),
            dtype=np.float32,
        )
        field += amplitude * (octave - octave.mean()) / (octave.std() + 1e-6)
        total += amplitude
    return field / total


def weather(ramp: Image.Image, luma: np.ndarray) -> Image.Image:
    """Roughen the transition band; the solid core and the clear outside stay put.

    The noise moves where the ramp crosses its midpoint rather than scaling the ramp
    down — scaling would hollow out the middle and leave a crisp edge behind.
    """
    alpha = np.asarray(ramp, dtype=np.float32) / 255
    midpoint = (
        0.5
        + fractal_noise(*reversed(alpha.shape)) * NOISE_WOBBLE
        + (luma - 0.5) * HIGHLIGHT_DROPOUT
    )
    # Anchored so a fully clear pixel stays clear and a solid one stays solid; only the
    # slope between them shifts around.
    low = np.clip(midpoint - RAMP_WIDTH, 0.0, 0.45)
    high = np.clip(midpoint + RAMP_WIDTH, 0.55, 1.0)
    t = np.clip((alpha - low) / (high - low), 0, 1)
    return Image.fromarray((t * t * (3 - 2 * t) * 255).astype(np.uint8), "L")


def dissolve(alpha: Image.Image, luma: np.ndarray) -> Image.Image:
    core = alpha
    for _ in range(CORE_EROSION_PASSES):
        core = core.filter(ImageFilter.MinFilter(9))
    # Long fade inwards so the subject's own edge melts, but a tight one outwards —
    # a wide outer glow would sit on the stone as a pale haze.
    inward = alpha.filter(ImageFilter.GaussianBlur(FEATHER_RADIUS))
    outward = ImageChops.lighter(alpha, alpha.filter(ImageFilter.GaussianBlur(HALO_RADIUS)))
    ramp = ImageChops.darker(inward, outward)
    ramp = ramp.point([round(((v / 255) ** GAMMA) * 255) for v in range(256)])
    return ImageChops.lighter(core, weather(ramp, luma))


def main() -> None:
    cutout = remove(Image.open(SRC).convert("RGBA"), session=new_session("u2netp"))
    solid = solidify(cutout.getchannel("A"))
    colour = bleed(
        np.asarray(cutout.convert("RGB"), dtype=np.float32),
        np.asarray(solid, dtype=np.float32),
    )
    luma = colour @ np.array([0.299, 0.587, 0.114], dtype=np.float32) / 255
    out = Image.fromarray(np.clip(colour, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    out.putalpha(dissolve(solid, luma))
    out.save(DST, "PNG")
    print(f"saved {DST}")


if __name__ == "__main__":
    main()
