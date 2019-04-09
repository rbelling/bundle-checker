import { ITableReport, ITableRow } from '../../../types/bundle-checker-types';
import {
  createMarkdownTable,
  getRowsForTotalSizeReport,
  groupByFileExtension,
  withDeltaSize
} from '../utils';
describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['git branch', 'file size'] as ITableRow;
    const rows = [
      ['master️', 'js: 356.6kB, css: 0'],
      ['develop', 'js: 376.4kB, css: 0']
    ] as ITableRow[];

    const table = createMarkdownTable([headers, ...rows]);

    expect(table).toMatchSnapshot();
  });

  it('Groups targeted files by extension', () => {
    const targetedFiles = [
      'main.js',
      'main.css',
      'shared.js',
      'shared.css',
      'sprite.png',
      'font.woff',
      'font-italic.123716.woff'
    ];
    const expectedGrouping = {
      css: ['main.css', 'shared.css'],
      js: ['main.js', 'shared.js'],
      png: ['sprite.png'],
      woff: ['font.woff', 'font-italic.123716.woff']
    };

    expect(groupByFileExtension(targetedFiles)).toMatchObject(expectedGrouping);
  });

  it(`Prints the delta size with a triangle arrow`, () => {
    expect(withDeltaSize(1024, 2048)).toBe(`2KB (🔺 1KB)`);
    expect(withDeltaSize(2048, 512)).toBe(`512B (▼ 1.5KB)`);
  });

  it('Creates rows for total size report in the expected format', () => {
    const targetBranchReport: ITableReport = {
      css: 150,
      js: 1000
    };
    const currentBranchReport: ITableReport = {
      jpg: 2000,
      js: 1100
    };
    const expectedFormat: ITableRow[] = [
      ['css', '150B', '0B (▼ 150B)'],
      ['js', '1000B', '1.07KB (🔺 100B)'],
      ['jpg', '0B', '1.95KB (🔺 1.95KB)']
    ];

    expect(getRowsForTotalSizeReport(targetBranchReport, currentBranchReport)).toEqual(
      expectedFormat
    );
  });
});
