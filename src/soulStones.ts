import type { ItemSocket } from './types'

const SOUL_STONE_NAMES: Record<number, string> = {
  30: 'Kamień Duszy Penetracji',
  31: 'Kamień Duszy Śmierci',
  32: 'Kamień Duszy Powtórki',
  33: 'Kamień Duszy Wojownika',
  34: 'Kamień Duszy Ninja',
  35: 'Kamień Duszy Sury',
  36: 'Kamień Duszy Szamana',
  37: 'Kamień Duszy Potwora',
  38: 'Kamień Duszy Uniku',
  39: 'Kamień Duszy Uchylenia',
  40: 'Kamień Duszy Magii',
  41: 'Kamień Duszy Witalności',
  42: 'Kamień Duszy Obrony',
  43: 'Kamień Duszy Przyspieszenia',
}

export interface SoulStone {
  socketIndex: number
  vnum: number
  iconVnum: number
  name: string
  level: number
}

export function resolveSoulStone(socket: ItemSocket): SoulStone | null {
  const type = socket.value % 100
  const gradeCode = Math.floor(socket.value / 100) % 10
  const level = gradeCode === 6 ? 5 : gradeCode

  // Stone VNUMs use 280/281/282/283/284 for +0…+4 and 286 for +5.
  // Artwork is shared by stone type through the compact 28000–28013 series.
  if (![0, 1, 2, 3, 4, 6].includes(gradeCode) || Math.floor(socket.value / 1000) !== 28 || !SOUL_STONE_NAMES[type]) return null

  return {
    socketIndex: socket.socketIndex,
    vnum: socket.value,
    iconVnum: 28000 + type - 30,
    name: SOUL_STONE_NAMES[type],
    level,
  }
}

export function getSoulStones(sockets: ItemSocket[]) {
  return sockets.map(resolveSoulStone).filter((stone): stone is SoulStone => stone !== null)
}
