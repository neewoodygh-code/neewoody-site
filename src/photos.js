// Photos used by the Astro pages, imported straight from the site's existing
// images/ folder (no copies). Astro makes sized AVIF/WebP versions at build time.
import hero from '../images/projects/sage-centre/sage-hero.jpg';
import sageDining from '../images/projects/sage-centre/sage-gallery-2.jpg';
import sageLouvres from '../images/projects/sage-centre/sage-gallery-7.jpg';
import sageBookcase from '../images/projects/sage-centre/sage-gallery-8.jpg';
import sageLounge from '../images/projects/sage-centre/sage-gallery-1.jpg';
import wli from '../images/projects/sage-centre/sage-grounds.jpg';
import wardrobe from '../images/projects/bortianor/bortianor-master-wardrobe.jpg';
import kitchen from '../images/projects/bortianor/bortianor-kitchen-wide.jpg';
import halfway from '../images/projects/bortianor/bortianor-living-halfway.jpg';
import tvwall from '../images/projects/bortianor/bortianor-living-tv-wall.jpg';
import ridgeTable from '../images/projects/roman-ridge-live-edge/live-edge-table-window.jpg';
import spraying from '../images/projects/roman-ridge-live-edge/live-edge-table-spraying.jpg';
import grain from '../images/projects/roman-ridge-live-edge/live-edge-table-grain-wide.jpg';
import legonDining from '../images/projects/judith-east-legon/judith-set-installed-2.jpg';
import afromosia from '../images/projects/french-embassy/afromosia-table-installed-6.jpg';
import walnutBed from '../images/projects/dansoman-walnut-bed/walnut-bed-angle.jpg';
import shop from '../images/projects/commercial-fitout/commercial-1.jpg';

const PHOTOS = {
  hero, 'sage-dining': sageDining, 'sage-louvres': sageLouvres, 'sage-bookcase': sageBookcase,
  'sage-lounge': sageLounge, wli, wardrobe, kitchen, halfway, tvwall, 'ridge-table': ridgeTable,
  spraying, grain, 'legon-dining': legonDining, afromosia, 'walnut-bed': walnutBed, shop,
};

export function photo(name) {
  const p = PHOTOS[name];
  if (!p) throw new Error(`photos.js: no photo named "${name}"`);
  return p;
}

// Any photo under images/projects by its site path, e.g. img('images/projects/oyarifa/x.jpg').
// Lazy: only the photos a page actually uses get processed at build time.
const ALL = import.meta.glob('../images/projects/**/*.{jpg,jpeg,png,JPG}');
export async function img(path) {
  const key = '../' + path.replace(/^\/+/, '');
  if (!ALL[key]) throw new Error(`photos.js: no image at "${path}"`);
  return (await ALL[key]()).default;
}

// Viewer-sized (1600px WebP) versions of a list of {img, alt, cap} photos.
import { getImage } from 'astro:assets';
export async function bigSet(photos) {
  return Promise.all(photos.map(async (p) => ({
    src: (await getImage({ src: await img(p.img), width: 1600, format: 'webp' })).src,
    alt: p.alt || '', cap: p.cap || p.alt || '',
  })));
}
