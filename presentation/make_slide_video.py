# Weather Witness: the 42-second opening for ONE slide in the live presentation.
# Car and lighter, bang, a silent pause for the speaker, the interview clip, the three numbers, title.
# Usage (from the presentation folder):  python make_slide_video.py <interview.mp4> [stills]
# Not for the submitted demo: it is longer than 30 seconds and contains news footage.
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
import imageio.v2 as imageio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_video as mv

W, H, FPS = mv.W, mv.H, mv.FPS
SECONDS = 42
PAUSE_END = 13.5            # 8.0-13.5: black, 5.5 s for the speaker's 12-word line
CLIP_LEN = 10.3             # the interview
CLIP_END = PAUSE_END + CLIP_LEN
CARD_LEN = 4.5
TITLE_AT = CLIP_END + 3 * CARD_LEN   # 35.4
LABEL = 'Edited with AI assistance'

def interview_panel(frame_img, t):
    """The vertical interview on the left; on the right the yearly death toll from heat, leading into the children cards."""
    im = Image.new('RGB', (W, H), (0, 0, 0))
    im.paste(frame_img, (60, 0))
    d = ImageDraw.Draw(im)
    x = 60 + frame_img.width + 60
    a = mv.ease(t / 0.8)
    col = lambda c: tuple(int(v * a) for v in c)
    d.text((x, 150), '489,000 people', font=mv.font(mv.BOLD, 62), fill=col((255, 214, 92)))
    y = 250
    for line in ['are killed by heat', 'every year, worldwide.']:
        d.text((x, y), line, font=mv.font(mv.BODY, 40), fill=col((240, 240, 240)))
        y += 56
    d.text((x, y + 34), 'Some of them are children.', font=mv.font(mv.BOLD, 36), fill=col((255, 255, 255)))
    d.text((x, 590), 'Source: World Health Organization, yearly average 2000-2019', font=mv.font(mv.BODY, 20), fill=col((150, 150, 150)))
    d.text((x, 620), 'News interview clip, shown for this presentation only.', font=mv.font(mv.BODY, 18), fill=col((120, 120, 120)))
    return im

def render(frame, car, lighter, talk):
    t = frame / FPS
    if t < 8.0:
        return mv.render(frame, car, lighter)          # car, lighter, flash: same as the 30-second cut
    if t < PAUSE_END:
        return mv.label(Image.new('RGB', (W, H), (0, 0, 0)), LABEL)
    if t < CLIP_END:
        i = min(int((t - PAUSE_END) * FPS), len(talk) - 1)
        return mv.label(interview_panel(Image.fromarray(talk[i]), t - PAUSE_END), LABEL)
    for n, (_, _, big, second, source) in enumerate(mv.CARDS):
        a = CLIP_END + n * CARD_LEN
        if a <= t < a + CARD_LEN:
            return mv.label(mv.card(t - a + 0.4, big, second, source), LABEL)
    return mv.label(mv.title(t - TITLE_AT), LABEL)

if __name__ == '__main__':
    src = sys.argv[1]
    car, lighter = mv.build()
    talk_s = os.path.join(mv.HERE, 'clips', 'interview-720.mp4')
    if not os.path.exists(talk_s):
        subprocess.run([mv.FFMPEG, '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=-2:720', '-r', str(FPS), '-an', '-c:v', 'libx264', '-crf', '16', talk_s], check=True)
    talk = mv.load(talk_s)
    if len(sys.argv) > 2:
        d = os.path.join(mv.HERE, 'stills')
        os.makedirs(d, exist_ok=True)
        for sec in [9.5, 12, 18, 23.5, 28.5, 33, 38]:
            render(int(sec * FPS), car, lighter, talk).save(os.path.join(d, f'slide_{sec:05.2f}.jpg'), quality=85)
        sys.exit(0)
    silent, wav, out = [os.path.join(mv.HERE, n) for n in ('silent.tmp.mp4', 'sound.tmp.wav', 'slide-video.mp4')]
    w = imageio.get_writer(silent, fps=FPS, codec='libx264', quality=8, macro_block_size=16, pixelformat='yuv420p')
    for f in range(FPS * SECONDS):
        w.append_data(np.asarray(render(f, car, lighter, talk)))
    w.close()
    mv.SECONDS = SECONDS
    mv.soundtrack(wav)
    # the synthetic track (hum, ticking, bang) plus the interview's own sound, starting when the clip does
    delay = int(PAUSE_END * 1000)
    subprocess.run([mv.FFMPEG, '-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-i', src,
                    '-filter_complex', f'[2:a]adelay={delay}|{delay},volume=1.6[t];[1:a][t]amix=inputs=2:duration=first:normalize=0[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', str(SECONDS), out], check=True)
    os.remove(silent)
    os.remove(wav)
    print('wrote', out)
