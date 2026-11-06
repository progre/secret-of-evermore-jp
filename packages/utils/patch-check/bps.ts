const FOOTER_SIZE = 12;
const SOURCE_COPY = 2;
const TARGET_READ = 1;
const TARGET_COPY = 3;

export interface Reconstruction {
  bytes: Uint8Array;
  /** 1 ならパッチだけで決まるバイト */
  known: Uint8Array;
}

/**
 * 元の ROM を使わず、BPS のパッチだけから出力を復元する。
 * 元の ROM を読むアクションの出力は未知のまま残し、TargetCopy は未知かどうかも引き継ぐ。
 */
export function reconstruct(patch: Uint8Array): Reconstruction {
  if (new TextDecoder().decode(patch.subarray(0, 4)) !== "BPS1") {
    throw new Error("not a BPS patch");
  }
  let position = 4;
  const readNumber = () => {
    let value = 0;
    let shift = 1;
    while (true) {
      const byte = patch[position++];
      value += (byte & 0x7f) * shift;
      if (byte & 0x80) {
        return value;
      }
      shift *= 128;
      value += shift;
    }
  };

  readNumber(); // 元の ROM の大きさ
  const targetSize = readNumber();
  const metadataSize = readNumber();
  position += metadataSize;

  const bytes = new Uint8Array(targetSize);
  const known = new Uint8Array(targetSize);
  const actionsEnd = patch.length - FOOTER_SIZE;
  let output = 0;
  let copyFrom = 0;
  while (position < actionsEnd) {
    const command = readNumber();
    const action = command % 4;
    const length = Math.floor(command / 4) + 1;
    if (action === TARGET_READ) {
      bytes.set(patch.subarray(position, position + length), output);
      known.fill(1, output, output + length);
      position += length;
    } else if (action === SOURCE_COPY) {
      readNumber();
    } else if (action === TARGET_COPY) {
      const delta = readNumber();
      copyFrom += (delta % 2 === 1 ? -1 : 1) * Math.floor(delta / 2);
      // コピー先がコピー元に重なると直前の出力を繰り返すので、1 バイトずつ写す
      for (let i = 0; i < length; i++) {
        bytes[output + i] = bytes[copyFrom + i];
        known[output + i] = known[copyFrom + i];
      }
      copyFrom += length;
    }
    output += length;
  }
  return { bytes, known };
}
