import { useEffect, useRef, useState } from 'react';

// Selected work: a native horizontal scroller (no scroll hijacking).
// Swipe on phones, drag or use the arrow buttons / keyboard on desktop.
export default function WorkGallery({ items }) {
  const track = useRef(null);
  const [pos, setPos] = useState({ start: true, end: false, progress: 0 });

  const update = () => {
    const t = track.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setPos({ start: t.scrollLeft < 8, end: t.scrollLeft > max - 8, progress: max ? t.scrollLeft / max : 0 });
  };

  useEffect(() => {
    const t = track.current;
    update();
    t.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // drag to scroll with a mouse (touch already scrolls natively)
    let down = false, x0 = 0, s0 = 0, moved = false;
    const onDown = (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = t.scrollLeft; t.classList.add('dragging'); };
    const onMove = (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; t.scrollLeft = s0 - dx; };
    const onUp = () => { down = false; t.classList.remove('dragging'); };
    const onClick = (e) => { if (moved) { e.preventDefault(); moved = false; } };
    t.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    t.addEventListener('click', onClick, true);
    return () => {
      t.removeEventListener('scroll', update); window.removeEventListener('resize', update);
      t.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp); t.removeEventListener('click', onClick, true);
    };
  }, []);

  const step = (dir) => {
    const t = track.current;
    const card = t.querySelector('.card');
    t.scrollBy({ left: dir * (card ? card.offsetWidth + 40 : t.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="gallery">
      <div className="gallery-track" ref={track} tabIndex={0} role="region" aria-label="Selected work, scroll sideways">
        {items.map((w) => (
          <a className={'card' + (w.wide ? ' wide' : '')} href={w.href} key={w.title} draggable="false">
            <div className="card-img">
              <picture>
                <source type="image/avif" srcSet={w.avif} sizes={w.sizes} />
                <img src={w.src} srcSet={w.webp} sizes={w.sizes} width={w.w} height={w.h} alt={`${w.title}, ${w.place}`} loading="lazy" draggable="false" />
              </picture>
            </div>
            <h3>{w.title}</h3>
            <p>{w.place}<span className="slash" aria-hidden="true" />{w.wood}</p>
          </a>
        ))}
      </div>
      <div className="gallery-ctrl">
        <div className="gallery-bar" aria-hidden="true"><span style={{ transform: `scaleX(${0.12 + pos.progress * 0.88})` }} /></div>
        <button type="button" onClick={() => step(-1)} disabled={pos.start} aria-label="Previous project">←</button>
        <button type="button" onClick={() => step(1)} disabled={pos.end} aria-label="Next project">→</button>
      </div>
    </div>
  );
}
