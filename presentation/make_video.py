# Weather Witness: 30-second opening video from two free Pexels clips plus sourced numbers.
# Usage (from the presentation folder):  python make_video.py            -> hook-video.mp4
#                                        python make_video.py stills     -> stills/*.jpg for checking
# Footage: Pexels video 3757013 (parked car interior) and 2548212 (lighter), Pexels licence.
import math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, SECONDS = 1280, 720, 24, 30
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# ---- the cut (seconds) ----
CAR_END = 4.6        # parked car, getting hotter
LIGHTER_END = 7.2    # the lighter, up to the spark
BANG = LIGHTER_END   # white flash and the sound
CARDS = [            # (start, end, big line, second line, source)
    (8.0, 14.0, '1,071 children', 'have died of heatstroke in hot cars in the United States since 1998.', 'Source: noheatstroke.org, San José State University, November 2026'),
    (14.0, 20.0, '377 children', 'were killed by heat in Europe and Central Asia in 2021. About half were babies under one.', 'Source: UNICEF, Beat the Heat, July 2024'),
    (20.0, 26.0, '57 more warm nights a year', 'in Kuwait City for a child born in 2015 than for one born in 1981.', 'Source: NASA POWER (MERRA-2) daily data, 1981–2025, from this project'),
]
TITLE_AT = 26.0

def font(names, size):
    for n in names:
        p = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', n)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

HAND = ['segoesc.ttf', 'segoepr.ttf', 'comic.ttf', 'arial.ttf']
BODY = ['segoeui.ttf', 'arial.ttf']
BOLD = ['segoeuib.ttf', 'arialbd.ttf']

def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def prescale(src, start, dur, out):
    """Cut and shrink a 4K source once, so the Python side only handles 720p frames."""
    if os.path.exists(out):
        return
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-ss', str(start), '-t', str(dur), '-i', src,
                    '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}', '-r', str(FPS), '-an',
                    '-c:v', 'libx264', '-crf', '16', out], check=True)

def load(path):
    r = imageio.get_reader(path)
    frames = [f for f in r]
    r.close()
    return frames

def wrap(d, text, f, width):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def center(d, text, y, f, fill):
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)

def label(im, text):
    """Small line in the corner on every frame: what the footage is and that it was edited with AI help."""
    d = ImageDraw.Draw(im, 'RGBA')
    f = font(BODY, 18)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([W - w - 34, H - 42, W - 12, H - 12], radius=6, fill=(0, 0, 0, 140))
    d.text((W - w - 23, H - 39), text, font=f, fill=(255, 255, 255, 225))
    return im

def grade_hot(frame, k):
    """Warm, bleached look that grows with k (0..1): the car heating up."""
    a = frame.astype(np.float32) / 255.0
    a = a ** (1.0 - 0.38 * k)                       # lift the shadows
    a[..., 0] *= 1.0 + 0.55 * k                     # more red
    a[..., 1] *= 1.0 + 0.18 * k
    a[..., 2] *= 1.0 - 0.35 * k                     # less blue
    a = a * (1.0 + 0.25 * k) + 0.06 * k             # haze
    return np.clip(a * 255, 0, 255).astype(np.uint8)

def zoom(frame, z, cx=0.5, cy=0.5):
    if z <= 1.001:
        return frame
    h, w = frame.shape[:2]
    cw, ch = int(w / z), int(h / z)
    x0 = int((w - cw) * cx)
    y0 = int((h - ch) * cy)
    return np.asarray(Image.fromarray(frame[y0:y0 + ch, x0:x0 + cw]).resize((w, h), Image.BILINEAR))

def card(t, big, second, source):
    """t = seconds into the card. One second of pure black first, for the speaker's line."""
    im = Image.new('RGB', (W, H), (0, 0, 0))
    a = ease((t - 0.7) / 0.9)
    if a <= 0:
        return im
    layer = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    fb = font(BOLD, 84)
    while d.textlength(big, font=fb) > W - 120:
        fb = font(BOLD, fb.size - 4)
    center(d, big, 205, fb, (255, 214, 92))
    f2 = font(BODY, 38)
    y = 340
    for line in wrap(d, second, f2, W - 260):
        center(d, line, y, f2, (240, 240, 240))
        y += 52
    center(d, source, 560, font(BODY, 22), (150, 150, 150))
    return Image.blend(im, layer, a)

def title(t):
    im = Image.new('RGB', (W, H), (0, 0, 0))
    layer = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    center(d, 'Weather Witness', 235, font(HAND, 104), (255, 246, 168))
    center(d, 'Two childhoods, one city. 45 years of NASA data take the stand.', 420, font(BODY, 32), (230, 230, 230))
    return Image.blend(im, layer, ease(t / 0.8))

def build():
    clips = os.path.join(HERE, 'clips')
    car_s, lighter_s = os.path.join(clips, 'car-720.mp4'), os.path.join(clips, 'lighter-720.mp4')
    prescale(os.path.join(clips, 'car-interior.mp4'), 4.0, CAR_END + 0.2, car_s)
    # the last seconds of the lighter clip: the thumb rolls the wheel and the sparks fly
    prescale(os.path.join(clips, 'lighter.mp4'), 13.95 - (LIGHTER_END - CAR_END) - 0.05, LIGHTER_END - CAR_END + 0.05, lighter_s)
    return load(car_s), load(lighter_s)

def render(frame, car, lighter):
    t = frame / FPS
    if t < CAR_END:
        k = ease(t / CAR_END)
        f = zoom(grade_hot(car[min(frame, len(car) - 1)], 0.15 + 0.5 * k), 1.0 + 0.10 * k, 0.75, 0.55)
        im = Image.fromarray(f)
        if t < 0.5:
            im = Image.blend(Image.new('RGB', (W, H), (0, 0, 0)), im, ease(t / 0.5))
        d = ImageDraw.Draw(im)
        d.text((60, 600), 'A parked car. Midday. Summer.', font=font(BODY, 34), fill=(255, 255, 255))
        return label(im, 'Footage: Pexels · edited with AI assistance')
    if t < LIGHTER_END:
        i = int((t - CAR_END) * FPS)
        f = lighter[min(i, len(lighter) - 1)]
        k = (t - CAR_END) / (LIGHTER_END - CAR_END)
        f = zoom(grade_hot(f, 0.25 + 0.35 * k), 1.0 + 0.12 * k)
        im = Image.fromarray(f)
        d = ImageDraw.Draw(im)
        d.text((60, 600), 'A lighter left on the dashboard.', font=font(BODY, 34), fill=(255, 255, 255))
        return label(im, 'Footage: Pexels · edited with AI assistance')
    if t < 8.0:
        k = (t - BANG) / (8.0 - BANG)
        v = int(255 * max(0.0, 1 - k * 2.2) ** 2)
        return label(Image.new('RGB', (W, H), (v, v, int(v * 0.85))), 'Edited with AI assistance')
    for (a, b, big, second, source) in CARDS:
        if a <= t < b:
            return label(card(t - a, big, second, source), 'Edited with AI assistance')
    return label(title(t - TITLE_AT), 'Edited with AI assistance')

def soundtrack(path):
    """Low room tone that rises under the car and lighter, a bang at the cut, then silence for the speaker."""
    sr = 44100
    n = sr * SECONDS
    t = np.arange(n) / sr
    rng = np.random.default_rng(3)
    out = np.zeros(n, dtype=np.float32)
    pre = t < BANG
    rise = np.clip(t / BANG, 0, 1) ** 2
    out += pre * rise * 0.10 * (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.5 * t))
    for tick in np.arange(0.6, BANG - 0.1, 0.5):        # a ticking that speeds the pulse
        m = (t >= tick) & (t < tick + 0.03)
        out[m] += 0.18 * np.sin(2 * np.pi * 1800 * (t[m] - tick)) * np.exp(-(t[m] - tick) * 160)
    m = (t >= BANG) & (t < BANG + 1.6)                   # the bang: a crack, a thump and a tail of noise
    tt = t[m] - BANG
    noise = rng.standard_normal(tt.size).astype(np.float32)
    out[m] += 0.9 * noise * np.exp(-tt * 9) + 0.9 * np.sin(2 * np.pi * (70 - 25 * tt) * tt) * np.exp(-tt * 5)
    out = np.clip(out, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((out * 32000).astype(np.int16).tobytes())

if __name__ == '__main__':
    car, lighter = build()
    if len(sys.argv) > 1 and sys.argv[1] == 'stills':
        d = os.path.join(HERE, 'stills')
        os.makedirs(d, exist_ok=True)
        for sec in [0.3, 2.5, 4.4, 5.5, 7.0, 7.25, 11, 17, 23, 28.5]:
            render(int(sec * FPS), car, lighter).save(os.path.join(d, f'still_{sec:05.2f}.jpg'), quality=85)
        sys.exit(0)
    silent, wav, out = os.path.join(HERE, 'silent.tmp.mp4'), os.path.join(HERE, 'sound.tmp.wav'), os.path.join(HERE, 'hook-video.mp4')
    w = imageio.get_writer(silent, fps=FPS, codec='libx264', quality=8, macro_block_size=16, pixelformat='yuv420p')
    for f in range(FPS * SECONDS):
        w.append_data(np.asarray(render(f, car, lighter)))
    w.close()
    soundtrack(wav)
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', out], check=True)
    os.remove(silent)
    os.remove(wav)
    print('wrote', out)
