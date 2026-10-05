import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeErrorCorrection,
  encodeDataBlocks,
  generatorPolynomial,
  gfPow
} from '../../src/js/qr/reed-solomon.js';
import { ecBlocks } from '../../src/js/qr/tables.js';
import { evaluatePolynomial } from '../helpers/qr-inspect.js';

const LEVELS = ['L', 'M', 'Q', 'H'];

function blockLayout(version, level) {
  const blocks = [];
  for (const group of ecBlocks(version, level)) {
    for (let i = 0; i < group.count; i += 1) {
      blocks.push({ total: group.total, data: group.data, ec: group.total - group.data });
    }
  }
  return blocks;
}

test('generator polynomial has the right degree and the declared roots', () => {
  for (const degree of [7, 10, 15, 18, 24]) {
    const polynomial = generatorPolynomial(degree);
    assert.equal(polynomial.length, degree + 1);
    assert.equal(polynomial[0], 1);
    for (let i = 0; i < degree; i += 1) {
      assert.equal(evaluatePolynomial(polynomial, gfPow(2, i)), 0, `root alpha^${i} failed`);
    }
  }
});

test('error correction codewords make every block evaluate to zero at its roots', () => {
  const data = [0x40, 0x91, 0x5c, 0x65, 0xc0, 0x88, 0x42, 0x0a, 0x28, 0x69, 0x50, 0xbc, 0x70];
  for (const ecCount of [7, 10, 13, 18]) {
    const correction = computeErrorCorrection(data, ecCount);
    assert.equal(correction.length, ecCount);

    const codeword = [...data, ...correction];
    for (let i = 0; i < ecCount; i += 1) {
      assert.equal(
        evaluatePolynomial(codeword, gfPow(2, i)),
        0,
        `syndrome ${i} is not zero for ${ecCount} correction codewords`
      );
    }
  }
});

test('interleaved output holds exactly the codewords the version declares', () => {
  for (const version of [1, 2, 5, 8, 14, 26, 40]) {
    for (const level of LEVELS) {
      const blocks = blockLayout(version, level);
      const dataLength = blocks.reduce((sum, block) => sum + block.data, 0);
      const totalLength = blocks.reduce((sum, block) => sum + block.total, 0);
      const data = Array.from({ length: dataLength }, (_, index) => (index * 37 + 11) % 256);

      const output = encodeDataBlocks(data, version, level);
      assert.equal(output.length, totalLength, `version ${version} level ${level}`);
    }
  }
});

test('every interleaved block keeps its own correction codewords', () => {
  const version = 5;
  const level = 'Q';
  const blocks = blockLayout(version, level);
  const dataLength = blocks.reduce((sum, block) => sum + block.data, 0);
  const data = Array.from({ length: dataLength }, (_, index) => (index * 53 + 7) % 256);

  const output = encodeDataBlocks(data, version, level);

  // Undo the interleaving: data columns first, then correction columns.
  const maxData = Math.max(...blocks.map((block) => block.data));
  const maxEc = Math.max(...blocks.map((block) => block.ec));
  const dataBlocks = blocks.map(() => []);
  const correctionBlocks = blocks.map(() => []);
  let cursor = 0;

  for (let column = 0; column < maxData; column += 1) {
    blocks.forEach((block, index) => {
      if (column >= block.data) return;
      dataBlocks[index].push(output[cursor]);
      cursor += 1;
    });
  }
  for (let column = 0; column < maxEc; column += 1) {
    blocks.forEach((block, index) => {
      if (column >= block.ec) return;
      correctionBlocks[index].push(output[cursor]);
      cursor += 1;
    });
  }

  assert.equal(cursor, output.length, 'interleaved length does not match the block layout');

  let sourceOffset = 0;
  dataBlocks.forEach((blockData, index) => {
    const expected = data.slice(sourceOffset, sourceOffset + blockData.length);
    sourceOffset += blockData.length;
    assert.deepEqual(blockData, expected);

    const codeword = [...blockData, ...correctionBlocks[index]];
    for (let i = 0; i < blocks[index].ec; i += 1) {
      assert.equal(evaluatePolynomial(codeword, gfPow(2, i)), 0, `block ${index} syndrome ${i}`);
    }
  });
});
