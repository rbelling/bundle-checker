import { IFileSizeReport, ITableRow } from '../../../types/bundle-checker-types';
import {
  createMarkdownTable,
  getFormattedRows,
  groupFilesByExtension,
  squashReportByFileExtension,
  withDeltaSize
} from '../utils';
describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['git branch', 'base branch', 'current branch'] as ITableRow;
    const rows = [['file1.js', '356.6kB', '320KB'], ['file2.css', '320kB', '330KB']] as ITableRow[];

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

    expect(groupFilesByExtension(targetedFiles)).toMatchObject(expectedGrouping);
  });

  it(`Prints the delta size with a triangle arrow`, () => {
    expect(withDeltaSize(1024, 2048)).toBe(`2KB (🔺 +1KB)`);
    expect(withDeltaSize(2048, 512)).toBe(`512B (▼ -1.5KB)`);
  });

  it('Creates rows for total size report in the expected format', () => {
    const targetBranchReport: IFileSizeReport = {
      css: 150,
      js: 1000,
      svg: 150
    };
    const currentBranchReport: IFileSizeReport = {
      jpg: 2000,
      js: 1100,
      svg: 150
    };
    const expectedFormat: ITableRow[] = [
      ['jpg', '1.95KB (🔺 +1.95KB)', '0B'],
      ['js', '1.07KB (🔺 +100B)', '1000B'],
      ['css', '0B (▼ -150B)', '150B']
    ];

    expect(getFormattedRows({ targetBranchReport, currentBranchReport })).toEqual(expectedFormat);
  });

  describe('Squashes a File report by extension', () => {
    const input: IFileSizeReport = {
      'a.js': 1000,
      'b.js': 2000,
      'c.css': 1500,
      'd.css': 3000,
      'e.jpeg': 2000
    };
    const expectedOutput = {
      css: 4500,
      jpeg: 2000,
      js: 3000
    };

    expect(squashReportByFileExtension(input)).toMatchObject(expectedOutput);
  });
});
