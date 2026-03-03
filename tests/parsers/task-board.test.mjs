/**
 * Unit Tests — Task Board Parser
 */

import { describe, it, expect, vi } from 'vitest';

// Mock file-helpers trước khi import parser
vi.mock('../../src/utils/file-helpers.mjs', () => ({
  readFileSafe: vi.fn(() => ''),
}));

import { parseTaskBoard } from '../../src/parsers/task-board.mjs';
import { readFileSafe } from '../../src/utils/file-helpers.mjs';

describe('parseTaskBoard', () => {
  it('trả null khi không tìm thấy file', () => {
    readFileSafe.mockReturnValue('');
    const result = parseTaskBoard('/fake/path');
    expect(result).toBeNull();
  });

  it('parse phase name chính xác', () => {
    readFileSafe.mockReturnValue(
      `# Phase 1 — Foundation & Code Quality (v0.2.0) Task Board

## Stream 🖥️ Server — Backend Restructure

| # | Task | Status | Priority |
| --- | --- | --- | --- |
| A1 | Setup | ✅ | P0 |
`
    );
    const result = parseTaskBoard('/fake/path');
    expect(result.phaseName).toBe('Phase 1 — Foundation & Code Quality (v0.2.0) Task Board');
  });

  it('đếm task statuses ✅ và 📋 đúng', () => {
    readFileSafe.mockReturnValue(
      `# Phase 1

## Stream 🖥️ Server — Backend

| # | Task | Status | Priority |
| --- | --- | --- | --- |
| A1 | Task 1 | ✅ | P0 |
| A2 | Task 2 | ✅ | P0 |
| A3 | Task 3 | 📋 | P1 |
`
    );
    const result = parseTaskBoard('/fake/path');
    expect(result.streams).toHaveLength(1);
    expect(result.streams[0].done).toBe(2);
    expect(result.streams[0].todo).toBe(1);
    expect(result.streams[0].total).toBe(3);
  });

  it('parse nhiều streams song song', () => {
    readFileSafe.mockReturnValue(
      `# Phase 1

## Stream 🖥️ Server — Backend

| # | Task | Status | Priority |
| --- | --- | --- | --- |
| A1 | Task 1 | ✅ | P0 |

## Stream 🎨 Frontend — UI

| # | Task | Status | Priority |
| --- | --- | --- | --- |
| B1 | Task 1 | 📋 | P0 |
| B2 | Task 2 | 🔄 | P0 |
`
    );
    const result = parseTaskBoard('/fake/path');
    expect(result.streams).toHaveLength(2);
    expect(result.streams[0].name).toBe('Backend');
    expect(result.streams[1].name).toBe('UI');
    expect(result.totalTasks).toBe(3);
    expect(result.totalDone).toBe(1);
  });

  it('nhận diện blocked tasks ⏸️', () => {
    readFileSafe.mockReturnValue(
      `# Phase 2

## Stream ⚙️ Infra — Config

| # | Task | Status | Priority |
| --- | --- | --- | --- |
| C1 | Setup | ✅ | P0 |
| C2 | Tests | ⏸️ | P0 |
`
    );
    const result = parseTaskBoard('/fake/path');
    expect(result.streams[0].blocked).toBe(1);
    expect(result.streams[0].done).toBe(1);
  });
});
