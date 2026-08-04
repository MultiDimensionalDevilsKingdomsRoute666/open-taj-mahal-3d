import type * as THREE from 'three'
import { LANDMARKS } from './viewpoints'

export interface Fact {
  id: string
  title: string
  body: string
  at: THREE.Vector3
}

/**
 * Concise, factual notes on the monument.
 *
 * The Taj Mahal is a working tomb and a site of religious significance to
 * millions of people, so the wording here is deliberately plain: dates and
 * construction facts, no romantic embellishment, and no attempt to reproduce
 * or paraphrase the Quranic inscriptions actually carved on the building.
 */
export const FACTS: Fact[] = [
  {
    id: 'dome',
    title: 'The Great Dome',
    body:
      'The marble dome rises about 23 m above a 12 m drum, and its bulbous, ogee-tapered profile is emphasised by a lotus motif at the apex. A gilded finial roughly 9.6 m tall crowns it, ending in a crescent whose horns point upward.',
    at: LANDMARKS.dome,
  },
  {
    id: 'minaret',
    title: 'The Four Minarets',
    body:
      'Each minaret stands over 40 m tall at a corner of the plinth, divided into three sections by projecting balconies and capped by a chhatri. They were built leaning very slightly outward so that, in an earthquake, they would fall away from the tomb.',
    at: LANDMARKS.minaret,
  },
  {
    id: 'iwan',
    title: 'The Central Arch',
    body:
      'A 33 m pishtaq frames the great pointed arch on each of the four main faces. The band around it carries Quranic calligraphy inlaid in black marble, its letters subtly enlarged towards the top so that they appear uniform when read from the ground.',
    at: LANDMARKS.iwan,
  },
  {
    id: 'inlay',
    title: 'Pietra Dura',
    body:
      'Twenty-eight varieties of precious and semi-precious stone were inlaid into the marble, including jade and crystal from China, turquoise from Tibet, lapis lazuli from Afghanistan and carnelian from Arabia, worked into flowering plant motifs.',
    at: LANDMARKS.plinth,
  },
  {
    id: 'mosque',
    title: 'Mosque and Jawab',
    body:
      'A working mosque of red sandstone stands to the west, facing Mecca. The identical building to the east is the jawab, or "answer" — it has no mihrab and exists to keep the composition symmetrical.',
    at: LANDMARKS.mosque,
  },
  {
    id: 'jawab',
    title: 'The Jawab',
    body:
      'The jawab mirrors the mosque stone for stone. Mughal architecture treats symmetry as an expression of order, and a single building on one side alone would have unbalanced the entire terrace.',
    at: LANDMARKS.jawab,
  },
  {
    id: 'pool',
    title: 'The Reflecting Pool',
    body:
      'The raised marble channel running the length of the garden mirrors the tomb along its full height. It is fed from the central tank, the Hauz al-Kawthar, named for the pool of abundance described in the Quran.',
    at: LANDMARKS.pool,
  },
  {
    id: 'garden',
    title: 'The Charbagh',
    body:
      'The 300 m square garden is a charbagh — a fourfold Persian paradise garden — divided by two water channels into quadrants, and each quadrant divided again, for sixteen parterres in all.',
    at: LANDMARKS.garden,
  },
  {
    id: 'gate',
    title: 'The Great Gate',
    body:
      'The Darwaza-i rauza is built of red sandstone inlaid with white marble. Its arch deliberately frames the tomb, which appears to recede rather than grow as visitors walk towards it.',
    at: LANDMARKS.gate,
  },
  {
    id: 'history',
    title: 'Shah Jahan and Mumtaz Mahal',
    body:
      'The Mughal emperor Shah Jahan commissioned the tomb in 1631 for his wife Mumtaz Mahal, who died in childbirth that year. The mausoleum was substantially complete by 1643 and the wider complex by about 1653. Both are buried in the chamber beneath the dome.',
    at: LANDMARKS.history,
  },
  {
    id: 'river',
    title: 'The Yamuna',
    body:
      'The complex was sited on a bend of the Yamuna so that the tomb rises directly from the riverbank. The river also kept the foundations damp, which helped stabilise the timber piles beneath the terrace.',
    at: LANDMARKS.river,
  },
]
