import { MainMausoleum } from './MainMausoleum'
import { Minaret } from './Minaret'
import { MarblePlatform } from './MarblePlatform'
import { Mosque } from './Mosque'
import { EntranceGate } from './EntranceGate'
import { CharbaghGarden } from './CharbaghGarden'
import { YamunaRiver } from './YamunaRiver'
import { Terrain } from './Terrain'
import { Birds } from './Birds'
import { MINARET_OFFSET, MOSQUE_OFFSET, PLINTH_TOP } from '../lib/dimensions'

/**
 * The whole site, assembled.
 *
 * Everything is positioned from the same origin: the centre of the tomb, with
 * +Z running south down the garden axis towards the great gate and -Z north to
 * the Yamuna. See `lib/dimensions.ts` for the survey figures every component
 * builds from.
 */
export function TajMahalComplex() {
  return (
    <group>
      <Terrain />
      <YamunaRiver />

      <MarblePlatform />

      <group position={[0, PLINTH_TOP, 0]}>
        <MainMausoleum />

        {/* One component, four corners of the plinth. Each leans outward. */}
        {(
          [
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ] as const
        ).map(([sx, sz]) => (
          <Minaret
            key={`${sx}${sz}`}
            position={[sx * MINARET_OFFSET, 0, sz * MINARET_OFFSET]}
            outward={[sx, sz]}
          />
        ))}
      </group>

      {/* The mosque must stand to the west so worshippers face Mecca; the
          jawab answers it on the east. Both turn to face the tomb. */}
      <Mosque position={[-MOSQUE_OFFSET, 2.6, 4]} rotation={Math.PI / 2} />
      <Mosque position={[MOSQUE_OFFSET, 2.6, 4]} rotation={-Math.PI / 2} />

      <CharbaghGarden />
      <EntranceGate />
      <Birds />
    </group>
  )
}
